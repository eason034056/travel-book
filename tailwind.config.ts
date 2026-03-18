import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--color-paper)",
        sand: "var(--color-sand)",
        olive: "var(--color-olive)",
        terracotta: "var(--color-terracotta)",
        ink: "var(--color-ink)",
        mist: "var(--color-mist)"
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "Georgia", "serif"],
        body: ["'Hanken Grotesk'", "'Avenir Next'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "'SFMono-Regular'", "monospace"]
      },
      boxShadow: {
        card: "0 22px 45px -28px rgba(31, 42, 58, 0.4)",
        float: "0 30px 80px -36px rgba(35, 46, 37, 0.35)"
      },
      animation: {
        "float-in": "floatIn 0.8s ease-out both",
        "fade-rise": "fadeRise 0.7s ease-out both"
      },
      keyframes: {
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(24px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        fadeRise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;

