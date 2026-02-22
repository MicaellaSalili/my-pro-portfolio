import type { MouseEvent } from "react";

type SkillTagProps = {
  label: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export default function SkillTag({ label, onClick, className = "" }: SkillTagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full bg-primary/15 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] leading-none text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    >
      {label}
    </button>
  );
}
