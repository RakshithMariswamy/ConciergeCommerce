/** @type {import('tailwindcss').Config} */

const MONO = {
  50: '#FFFFFF',
  100: '#F6F6F6',
  200: '#EAEAEA',
  300: '#D0D0D0',
  400: '#A0A0A0',
  500: '#737373',
  600: '#525252',
  700: '#3A3A3A',
  800: '#1F1F1F',
  900: '#000000',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#FFFFFF',
      red: MONO,
      orange: MONO,
      amber: MONO,
      yellow: MONO,
      lime: MONO,
      green: MONO,
      emerald: MONO,
      teal: MONO,
      cyan: MONO,
      sky: MONO,
      blue: MONO,
      indigo: MONO,
      violet: MONO,
      purple: MONO,
      fuchsia: MONO,
      pink: MONO,
      rose: MONO,
      slate: MONO,
      gray: MONO,
      zinc: MONO,
      neutral: MONO,
      stone: MONO,
      gold: {
        ...MONO,
        DEFAULT: MONO[100],
        light: MONO[50],
        dark: MONO[300],
      },
      cream: '#FFFFFF',
      charcoal: '#000000',
    },
    extend: {
      fontFamily: {
        serif: ['Source Sans 3', 'Segoe UI', 'system-ui', 'sans-serif'],
        sans: ['Source Sans 3', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        luxury: '0.2em',
      },
      boxShadow: {
        luxury: '0 2px 20px rgba(0, 0, 0, 0.06)',
        'luxury-hover': '0 6px 32px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
