"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button style={{ 
        width: 36, height: 36, borderRadius: "50%", 
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)"
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>light_mode</span>
      </button>
    );
  }

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const getIcon = () => {
    if (theme === "light") return "light_mode";
    if (theme === "dark") return "dark_mode";
    return "routine"; // System mode icon
  };

  return (
    <button 
      onClick={toggleTheme}
      title={`Current theme: ${theme}. Click to switch.`}
      style={{ 
        width: 36, height: 36, borderRadius: "50%", 
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)",
        cursor: "pointer", transition: "all 0.2s"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--text-primary)";
        e.currentTarget.style.borderColor = "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-secondary)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{getIcon()}</span>
    </button>
  );
}
