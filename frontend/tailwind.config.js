/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17251f",
        paper: "#f6f4ed",
        warm: "#fffdf7",
        forest: {
          DEFAULT: "#154a3b",
          light: "#286451",
        },
        teal: "#177d78",
        lime: "#d8f178",
        line: "#cad0c3",
        muted: "#69756d",
        danger: {
          DEFAULT: "#b33c2f",
          soft: "#fff0ec",
          text: "#8d3327",
        },
        success: {
          soft: "#e9f6df",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["Space Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "7px 7px 0 rgba(21, 74, 59, .10)",
        "panel-sm": "4px 4px 0 rgba(21, 74, 59, .10)",
        brand: "4px 4px 0 #154a3b",
        "brand-sm": "3px 3px 0 #154a3b",
        card: "5px 5px 0 rgba(21, 74, 59, .12)",
        modal: "10px 10px 0 rgba(5, 29, 20, .28)",
      },
      backgroundImage: {
        grid:
          "linear-gradient(rgba(21, 74, 59, .045) 1px, transparent 1px), linear-gradient(90deg, rgba(21, 74, 59, .045) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
      keyframes: {
        viewIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        modalIn: {
          from: { opacity: "0", transform: "translateY(12px) scale(.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        toastIn: {
          from: { opacity: "0", transform: "translateY(130%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        viewIn: "viewIn .28s ease both",
        modalIn: "modalIn .2s ease both",
      },
    },
  },
  plugins: [],
};
