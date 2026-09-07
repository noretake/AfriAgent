/** @type {import('tailwindcss').Config} */
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const themed = (name) => Object.fromEntries(shades.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: themed("slate"),
        white: "rgb(var(--white) / <alpha-value>)",
        brand: themed("brand"),
      },
    },
  },
  plugins: [],
};
