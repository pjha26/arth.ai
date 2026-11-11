"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export function DossierReveal({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-3, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [28, 0]);

  return (
    <motion.div ref={ref} className={className} style={reduce ? { rotate: 0, y: 0 } : { rotate, y }}>
      {children}
    </motion.div>
  );
}
