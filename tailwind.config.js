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
        'neon-green': '#00FF88',
        'cyber-black': '#000000',
        'cyber-dark': '#0A0A0A',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'neon': '0 0 15px rgba(0, 255, 136, 0.5)',
        'neon-strong': '0 0 30px rgba(0, 255, 136, 0.8)',
      },
      backgroundColor: {
        'cyber-gradient': 'linear-gradient(180deg, #0A0A0A 0%, #000000 100%)',
      },
    },
  },
  plugins: [],
} 