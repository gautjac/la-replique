/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // La Réplique — a lit prompt-book on a dark stage. Cool, not warm-editorial.
        desk: {
          DEFAULT: "#171a22", // the theatre in the dark
          light: "#1f2430",
          rule: "#2b3140",
        },
        paper: {
          DEFAULT: "#fbfcfe", // the lit script page (cool white, never cream)
          shade: "#eef1f6",
          edge: "#e2e7ef",
        },
        ink: {
          DEFAULT: "#20232c",
          soft: "#5a6273",
          faint: "#8b93a4",
        },
        // gel — theatrical lighting gel; the signature interactive/AI colour
        gel: {
          DEFAULT: "#4f7cff",
          bright: "#6f97ff",
          deep: "#2f52d6",
          wash: "#eaf0ff",
        },
        cyan: "#12b5d4",
        rose: "#f43f5e",
        // character-swatch set (cool-leaning, distinguishable)
        cast: {
          gel: "#4f7cff",
          cyan: "#0ea5b7",
          jade: "#10b981",
          plum: "#8b5cf6",
          rose: "#f43f5e",
          slate: "#64748b",
          amber: "#d97706",
          pine: "#3f7d5c",
          indigo: "#4f46e5",
          coral: "#fb7185",
        },
      },
      fontFamily: {
        // Space Grotesk = display/UI/cues; IBM Plex Sans = script body & dialogue.
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        page: "0 1px 2px rgba(16,20,30,0.06), 0 12px 40px -12px rgba(16,20,30,0.35)",
        lift: "0 6px 24px -8px rgba(16,20,30,0.45)",
        gel: "0 8px 24px -8px rgba(79,124,255,0.5)",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        ghostlight: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-460px 0" },
          "100%": { backgroundPosition: "460px 0" },
        },
      },
      animation: {
        riseIn: "riseIn 0.4s ease-out both",
        ghostlight: "ghostlight 1.2s ease-in-out infinite",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
