import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

/** Animated dark/light switch; all instances share one theme store. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const light = theme === "light";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Dark mode" : "Light mode"}
      onClick={toggle}
      className={`relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border border-slate-700 bg-slate-800 px-0.5 transition-colors hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-1.5 text-slate-400">
        <Moon className="h-3.5 w-3.5" />
        <Sun className="h-3.5 w-3.5" />
      </span>
      <motion.span
        layout
        className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-slate-950 shadow"
        animate={{ x: light ? 24 : 0, rotate: light ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
      >
        {light ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </motion.span>
    </button>
  );
}
