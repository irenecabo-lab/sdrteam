import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mapon brand-inspired palette. Swap these for the exact Mapon brand hex values
        // if design gives you an official palette later - kept as CSS variables in
        // globals.css so they're a one-place change.
        mapon: {
          blue: "#0057FF",
          navy: "#0A1240",
          ink: "#060A1F",
          cyan: "#33D6FF",
          amber: "#FFB800",
          magenta: "#FF3D7F",
          green: "#25D07A",
        },
        team: {
          a: "#33D6FF",
          b: "#FF3D7F",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(51, 214, 255, 0.35)",
        "glow-magenta": "0 0 24px rgba(255, 61, 127, 0.35)",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "60%": { transform: "scale(1.04)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "bar-fill": {
          "0%": { width: "0%" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(51,214,255,0.0)" },
          "50%": { boxShadow: "0 0 20px rgba(51,214,255,0.5)" },
        },
      },
      animation: {
        "pop-in": "pop-in 320ms ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
