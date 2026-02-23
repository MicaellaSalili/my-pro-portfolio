import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type ContactPayload = {
  fullName?: string;
  contactEmail?: string;
  subject?: string;
  message?: string;
};

function toSafeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload;

    const fullName = toSafeText(body.fullName);
    const contactEmail = toSafeText(body.contactEmail);
    const subject = toSafeText(body.subject);
    const message = toSafeText(body.message);

    if (!fullName || !contactEmail || !subject || !message) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (!isValidEmail(contactEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL;
    const fromEmail = process.env.CONTACT_FROM_EMAIL;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
    }

    if (!resendApiKey || !toEmail || !fromEmail) {
      return NextResponse.json({ error: "Email environment variables are missing." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error: insertError } = await supabase.from("contact_messages").insert({
      name: fullName,
      email: contactEmail,
      subject,
      message,
    });

    if (insertError) {
      return NextResponse.json({ error: "Unable to save message." }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: contactEmail,
      subject: `Web Portfolio Message: ${subject}`,
      text: `New contact form submission\n\nName: ${fullName}\nEmail: ${contactEmail}\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px">
          <h2 style="margin:0 0 12px">New Portfolio Contact Message</h2>
          <p style="margin:0 0 8px"><strong>Name:</strong> ${fullName}</p>
          <p style="margin:0 0 8px"><strong>Email:</strong> ${contactEmail}</p>
          <p style="margin:0 0 8px"><strong>Subject:</strong> ${subject}</p>
          <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb" />
          <p style="white-space:pre-wrap;margin:0">${message}</p>
        </div>
      `,
    });

    if (emailError) {
      return NextResponse.json({ error: "Message saved but email sending failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unexpected error while sending message." }, { status: 500 });
  }
}
