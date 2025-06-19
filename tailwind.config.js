/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./public/index.js",
    "./server.js"
  ],
  darkMode: 'media', // Uses prefers-color-scheme media query
  theme: {
    extend: {},
  },
  plugins: [],
};
