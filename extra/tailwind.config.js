/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0F1A',
          surface: '#111827',
          border: '#1F2937'
        },
        primary: {
          main: '#7C3AED', // purple
          glow: '#A78BFA'
        },
        secondary: {
          main: '#22D3EE', // cyan
          glow: '#67E8F9'
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        }
      }
    },
  },
  plugins: [],
}
