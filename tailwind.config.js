/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#1F3A5F",
          orange: "#F76D00",
        },
      },
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
      },
      borderRadius: {
        peptrx: "20px",
      },
    },
  },
  plugins: [],
}

