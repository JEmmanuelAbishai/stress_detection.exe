/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        void: "#000000",      
        neonYellow: "#F3E600", 
        cyan: "#55EAD4",       
        crimson: "#C5003C",    
        maroon: "#880425",     

        signal: {
          calm: "#55EAD4",     
          steady: "#F3E600",   
          elevated: "#C5003C", 
          critical: "#880425"  
        }
      },
      fontFamily: {
        display: ["'Orbitron'", "sans-serif"],  
        body: ["'Rajdhani'", "sans-serif"],       
        mono: ["'Share Tech Mono'", "monospace"]  
      },
      boxShadow: {
        neon: "0 0 6px currentColor, 0 0 18px currentColor",
        neonSm: "0 0 4px currentColor"
      },
      backgroundImage: {
        scanlines: "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)"
      }
    }
  },
  plugins: []
};