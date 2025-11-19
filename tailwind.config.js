/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Colors
        'heavenly-blue': '#E8F4F8',
        'dawn-gold': '#F7E7CE',
        'prayer-purple': '#D4C5F9',
        'prayer-sent': '#D4EDDA',
        'prayer-active': '#4A90E2',
        'text-primary': '#2C3E50',
        'text-secondary': '#7F8C8D',
        'text-muted': '#95A5A6',
        // Legacy colors (keeping for compatibility)
        'primary-blue': '#4A90E2',
        'primary-gold': '#F5D76E',
        'primary-purple': '#9B59B6',
      },
      fontFamily: {
        'display': ['Cinzel', 'serif'],
        'body': ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        'glass': '12px',
      },
      transitionDuration: {
        'fast': '150ms',
        'smooth': '300ms',
      },
    },
  },
  plugins: [],
}
