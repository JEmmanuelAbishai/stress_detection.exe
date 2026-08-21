/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{ts,tsx,html}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1F2933",
        slate: {
          50: "#F4F7F8",
          100: "#E7EEF0",
          400: "#7B93A0",
          600: "#3A5C7A"
        },
        signal: {
          calm: "#3FA796",
          steady: "#E7B23A",
          elevated: "#D9704F",
          critical: "#B3413A"
        }
      },
      fontFamily: {
        display: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};
