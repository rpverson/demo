import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"IBM Plex Sans"', 'sans-serif'],
        body: ['"Source Serif 4"', 'serif'],
      },
      colors: {
        brand: {
          50: '#e8f4ef',
          500: '#1f7a5b',
          700: '#14503c',
        },
      },
    },
  },
  plugins: [],
};

export default config;
