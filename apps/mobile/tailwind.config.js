/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4 requires preset
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // PrayerMap brand colors
        prayer: {
          sky: '#E8F4F8',
          gold: '#FFD700',
          blue: '#4169E1',
          purple: '#8B5CF6',
        },
        // Category colors
        category: {
          health: '#EF4444',
          family: '#F59E0B',
          work: '#3B82F6',
          relationships: '#EC4899',
          finances: '#10B981',
          spiritual: '#8B5CF6',
          guidance: '#6366F1',
          gratitude: '#F97316',
          other: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
