import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          green: '#1B4D2E',
          'green-hover': '#2D6B45',
          amber: '#C8771C',
          'amber-hover': '#9E5C12',
        },
        primary: {
          DEFAULT: '#1B4D2E',
          foreground: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}

export default config
