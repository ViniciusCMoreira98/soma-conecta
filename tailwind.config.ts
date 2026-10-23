import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        soma: {
          50: "#f1f8f3", 100: "#dcefe2", 200: "#bbdfc8", 300: "#8cc6a3",
          400: "#58a77a", 500: "#368b5e", 600: "#27704b", 700: "#215a3e",
          800: "#1e4934", 900: "#193d2c",
        },
        sand: { 50: "#faf9f6", 100: "#f3f1ea", 200: "#e6e3d8" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
export default config;
