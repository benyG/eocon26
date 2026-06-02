import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          green: "#00ff9d",
          pink: "#ff0066",
          blue: "#0066ff",
          yellow: "#ffff00",
        },
        dark: {
          900: "#050505",
          800: "#0a0a0f",
          700: "#0f0f1a",
          600: "#141428",
        },
      },
      fontFamily: {
        mono: ["'Courier New'", "Courier", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
      animation: {
        glitch: "glitch 1s infinite",
        "glitch-2": "glitch2 1s infinite",
        scanline: "scanline 8s linear infinite",
        flicker: "flicker 0.15s infinite",
        "pulse-neon": "pulseNeon 2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "grid-move": "gridMove 20s linear infinite",
        "type-cursor": "typeCursor 1s step-end infinite",
      },
      keyframes: {
        glitch: {
          "0%, 100%": { transform: "translate(0)", filter: "none" },
          "20%": { transform: "translate(-3px, 1px)", filter: "hue-rotate(90deg)" },
          "40%": { transform: "translate(3px, -1px)", filter: "hue-rotate(-90deg)" },
          "60%": { transform: "translate(-1px, 2px)", filter: "brightness(1.5)" },
          "80%": { transform: "translate(1px, -2px)", filter: "hue-rotate(180deg)" },
        },
        glitch2: {
          "0%, 100%": { clipPath: "inset(0 0 100% 0)", transform: "translate(0)" },
          "10%": { clipPath: "inset(10% 0 85% 0)", transform: "translate(-5px)" },
          "30%": { clipPath: "inset(50% 0 30% 0)", transform: "translate(5px)" },
          "50%": { clipPath: "inset(80% 0 5% 0)", transform: "translate(-3px)" },
          "70%": { clipPath: "inset(25% 0 60% 0)", transform: "translate(3px)" },
          "90%": { clipPath: "inset(65% 0 20% 0)", transform: "translate(-2px)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%": { opacity: "1" },
          "20%, 24%, 55%": { opacity: "0.4" },
        },
        pulseNeon: {
          "0%, 100%": { boxShadow: "0 0 5px #00ff9d, 0 0 10px #00ff9d, 0 0 20px #00ff9d" },
          "50%": { boxShadow: "0 0 10px #00ff9d, 0 0 25px #00ff9d, 0 0 50px #00ff9d" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        gridMove: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "50px 50px" },
        },
        typeCursor: {
          "0%, 100%": { borderColor: "transparent" },
          "50%": { borderColor: "#00ff9d" },
        },
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(rgba(0,255,157,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,157,0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
