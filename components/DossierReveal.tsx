"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import styles from "@/app/landing.module.css";

export function ReportTraceRow({ id, label, children, className }: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 86%", "center 52%"] });

  return (
    <div ref={ref} id={id} tabIndex={-1} className={`${styles.traceRow} ${className ?? ""}`}>
      <dt>
        <motion.span aria-hidden="true" className={styles.traceLine} style={{ scaleX: reduce ? 1 : scrollYProgress }} />
        {label}
      </dt>
      {children}
    </div>
  );
}

export function HeroDossier({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.23]);
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "7%"]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ position: "absolute", inset: 0, scale: reduce ? 1 : scale, y: reduce ? 0 : y }}>
        {children}
      </motion.div>
    </div>
  );
}

export function DossierReveal({ children, className, sheetClassName }: {
  children: ReactNode;
  className: string;
  sheetClassName: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center 40%"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-7, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [52, 0]);
  const underlayRotate = useTransform(scrollYProgress, [0, 1], [9, 0]);
  const underlayX = useTransform(scrollYProgress, [0, 1], ["8%", "0%"]);
  const outlineRotate = useTransform(scrollYProgress, [0, 1], [-14, 0]);
  const outlineX = useTransform(scrollYProgress, [0, 1], ["-8%", "0%"]);

  return (
    <div ref={ref} className={className}>
      <motion.div aria-hidden="true" className={sheetClassName}
        style={{ x: reduce ? 0 : outlineX, rotate: reduce ? 0 : outlineRotate }} />
      <motion.div aria-hidden="true" className={sheetClassName}
        style={{ x: reduce ? 0 : underlayX, rotate: reduce ? 0 : underlayRotate }} />
      <motion.div style={{ rotate: reduce ? 0 : rotate, y: reduce ? 0 : y }}>{children}</motion.div>
    </div>
  );
}
