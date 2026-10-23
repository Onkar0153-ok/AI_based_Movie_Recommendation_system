/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080B14",
        surface: "#101626",
        "surface-elevated": "#171F32",
        "surface-hover": "#1E2942",
        primary: "#8B5CF6", // Violet accent
        "primary-hover": "#7C3AED",
        secondary: "#22D3EE", // Cyan accent
        "secondary-hover": "#06B6D4",
        "primary-text": "#F8FAFC",
        "muted-text": "#A5B0C5",
        border: "#293249",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.4)',
        'glow-cyan': '0 0 25px -5px rgba(34, 211, 238, 0.4)',
        'card': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
