import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";
import { useInView } from "framer-motion";

interface RevealOnScrollProps {
  children: React.ReactNode;
  threshold?: number; // 0 to 1, when to trigger animation
  delay?: number; // optional delay in ms
}

export default function RevealOnScroll({ children, threshold = 0.2, delay = 0 }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const inView = useInView(ref, { amount: threshold, once: true });

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: "easeOut", delay: delay / 1000 },
      });
    }
  }, [inView, controls, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={controls}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
