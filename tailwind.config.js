/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        panel: '#ffffff',
        base: '#f8fafc'
      },
      boxShadow: {
        soft: '0 2px 10px rgba(16,24,40,0.06)'
      },
      borderRadius: {
        xl: '16px'
      }
    }
  },
  plugins: []
}
