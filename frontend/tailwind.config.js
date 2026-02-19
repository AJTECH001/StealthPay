/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#000000",
        "void-main": "#ffffff",
        "void-lighter": "#f5f5f5",
        "neon-primary": "#000000",
        "neon-secondary": "#525252",
        "neon-accent": "#737373",
        "glass-border": "rgba(0, 0, 0, 0.12)",
        "glass-border-hover": "rgba(0, 0, 0, 0.25)",
        "glass-surface": "rgba(255, 255, 255, 0.8)",
        "glass-highlight": "rgba(0, 0, 0, 0.06)",
        success: "#000000",
        error: "#000000",
        warning: "#000000",
      },
      fontFamily: {
        sans: ["Space Grotesk", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass-gradient":
          "linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "glass-gradient-hover":
          "linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
      },
      boxShadow: {
        neon: "0 0 5px rgba(0, 0, 0, 0.15), 0 0 20px rgba(0, 0, 0, 0.1)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
        "glass-hover": "0 8px 32px 0 rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};
