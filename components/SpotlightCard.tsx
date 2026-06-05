"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({ children, className, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      <motion.div
        style={{
          position: "absolute",
          top: "-1px", left: "-1px", right: "-1px", bottom: "-1px",
          pointerEvents: "none",
          borderRadius: "inherit",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 300ms ease-in-out",
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(251, 186, 111, 0.12),
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
};

export default SpotlightCard;
