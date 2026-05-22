/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: "#0b0f19",
        cardbg: "rgba(20, 26, 45, 0.6)",
        cardborder: "rgba(255, 255, 255, 0.08)",
        inputbg: "rgba(13, 17, 30, 0.8)",
        inputborder: "rgba(255, 255, 255, 0.1)",
        brand: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          glow: "rgba(99, 102, 241, 0.3)",
        },
        success: "#10b981",
        danger: "#f43f5e",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        title: ["Outfit", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
