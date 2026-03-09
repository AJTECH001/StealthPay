/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base
        background: "#000000",
        foreground: "#FFFFFF",
        
        // Radix Slate equivalent for neutral darks
        slate: {
          1: "#000000",
          2: "#0a0a0a",
          3: "#1a1a1a",
          4: "#262626",
          5: "#404040",
          6: "#525252",
          7: "#737373",
          11: "#a3a3a3",
          12: "#eeeeee",
        },

        // Brand Accents (Monochrome)
        primary: "#FFFFFF",
        secondary: "#a3a3a3",
        accent: "#404040",

        // Glass States
        "glass-border": "rgba(255, 255, 255, 0.08)",
        "glass-border-hover": "rgba(255, 255, 255, 0.15)",
        "glass-surface": "rgba(10, 10, 10, 0.4)",
        "glass-highlight": "rgba(255, 255, 255, 0.05)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "serif"],
      },
      backgroundImage: {
        "glass-gradient":
          "linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "noise": "url('/noise.png')",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.8)",
        "glass-hover": "0 8px 32px 0 rgba(0, 0, 0, 1)",
        "premium": "0 0 20px rgba(255, 255, 255, 0.05)",
      },
      backdropBlur: {
        "xs": "2px",
      }
    },
  },
  plugins: [],
};
