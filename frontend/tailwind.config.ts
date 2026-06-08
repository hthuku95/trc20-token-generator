import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1020',
        panel: '#11182b',
        line: '#22304f',
        mint: '#43d9ad',
        coral: '#ff6b6b',
        amber: '#f7b955',
      },
      boxShadow: {
        glow: '0 0 40px rgba(67, 217, 173, 0.16)',
      },
    },
  },
  plugins: [],
} satisfies Config;
