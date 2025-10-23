import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    '!./**/node_modules/**/*',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
