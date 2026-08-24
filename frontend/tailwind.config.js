/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0d1117',
        surface: '#161b22',
        elevated: '#21262d',
        border: '#30363d',
        blue: '#2563eb',
        cyan: '#06b6d4',
        violet: '#7c3aed',
        primary: '#f0f6fc',
        muted: '#8b949e',
        subtle: '#484f58',
        critical: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        low: '#22c55e',
        info: '#3b82f6',
        rosiPositive: '#22c55e',
        rosiNegative: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
