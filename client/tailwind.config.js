/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pirate-blue': '#1a3c5a',
        'pirate-gold': '#ffc940',
        'pirate-brown': '#8d6e63',
        'ocean-blue': '#0277bd',
        'wood-brown': '#795548',
      },
      fontFamily: {
        'pirate': ['Pirata One', 'cursive'],
      },
    },
  },
  plugins: [],
} 