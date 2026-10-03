import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terracotta: '#C1572A',
        ochre: '#D9A441',
        indigo: { DEFAULT: '#2B3A55' },
        kente: '#3F6B4A',
        cream: '#F3E5D0',
        ink: '#2B2118',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
