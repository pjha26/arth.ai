"use client";

import { motion, useReducedMotion, useScroll } from "framer-motion";

export function EvidenceRule() {
  const reduce = useReducedMotion();
  return (
    <motion.span aria-hidden="true" className="ui-evidence-rule"
      initial={false}
      whileInView={reduce ? undefined : { scaleX: [0.12, 1] }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} />
  );
}

export function ReadingTrace() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  return reduce ? null : (
    <div className="ui-reading-trace" aria-hidden="true">
      <motion.span className="ui-evidence-rule" style={{ scaleX: scrollYProgress }} />
    </div>
  );
}
