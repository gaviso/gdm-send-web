import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        gray: {
          50: "#fafafa",
          100: "#f4f4f5",
          150: "#ececee",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        brand: {
          50: "#eff4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#608dfa",
          500: "#3b6cf4",
          600: "#2451e9",
          700: "#1d3fd6",
          800: "#1e36ad",
          900: "#1e3389",
        },
        success: {
          50: "#ecfdf3",
          100: "#d1fadf",
          400: "#3ccb7f",
          500: "#16b364",
          600: "#099250",
          700: "#087443",
        },
        danger: {
          50: "#fef3f2",
          100: "#fee4e2",
          400: "#f97066",
          500: "#f04438",
          600: "#d92d20",
          700: "#b42318",
        },
        warning: {
          50: "#fffaeb",
          100: "#fef0c7",
          400: "#fdb022",
          500: "#f79009",
          600: "#dc6803",
          700: "#b54708",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(9, 9, 11, 0.05)",
        sm: "0 1px 3px rgba(9, 9, 11, 0.08), 0 1px 2px rgba(9, 9, 11, 0.04)",
        md: "0 4px 8px -2px rgba(9, 9, 11, 0.08), 0 2px 4px -2px rgba(9, 9, 11, 0.04)",
        lg: "0 12px 16px -4px rgba(9, 9, 11, 0.08), 0 4px 6px -2px rgba(9, 9, 11, 0.03)",
        xl: "0 20px 24px -4px rgba(9, 9, 11, 0.10), 0 8px 8px -4px rgba(9, 9, 11, 0.04)",
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.02em",
      },
    },
  },
  plugins: [],
};

export default config;
