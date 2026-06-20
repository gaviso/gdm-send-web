"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, type ThemeMode } from "@/components/ThemeProvider";

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeToggle({
  align = "right",
}: {
  align?: "left" | "right";
}) {
  const { mode, setMode, resolved } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const ActiveIcon = resolved === "dark" ? Moon : Sun;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors duration-150 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        aria-label="Theme"
      >
        <ActiveIcon className="h-4 w-4" strokeWidth={1.75} />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-36 rounded-md border border-gray-200 bg-white py-1 shadow-md dark:border-gray-800 dark:bg-gray-900 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((opt) => {
            const isActive = mode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setMode(opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <opt.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="flex-1 text-left">{opt.label}</span>
                {isActive && (
                  <Check className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" strokeWidth={2} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
