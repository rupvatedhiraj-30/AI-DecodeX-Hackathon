/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        accent: "#6366f1",
        teal: "#14b8a6",
        coral: "#f87171",
        amber: "#fbbf24",
        green: "#34d399",
      },
    },
  },
  plugins: [],
};
