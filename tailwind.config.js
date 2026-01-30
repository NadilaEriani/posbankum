/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral & Grey Scale
        neutral: {
          black: "#000000",
          secBlack: "#252525",
          dGrey: "#4D4D4D",
          grey: "#808080",
          lGrey: "#A8A8A8",
          softWhite: "#E6E6E6",
          white: "#FAFAFA",
        },

        // Primary (Blue + Yellow)
        brand: {
          blue: {
            d: "#22297A",
            s2: "#2A2E5E",
            s1: "#3B4287",
            2: "#5B65CF",
            1: "#5F69D9",
          },
          yellow: {
            d: "#22297A",
            s: "#CFB75B",
            2: "#E8CE66",
            1: "#EDD368",
            l: "#FDEF0C",
          },
        },

        // Secondary Color
        secondary: {
          1: "#A2A5E5",
          2: "#B8BBF0",
          3: "#CCD0F5",
        },

        // Danger Color
        danger: {
          s: "#610B0A",
          d: "#9A100E",
          1: "#99120F",
          2: "#F10C18",
          l: "#FF8481",
        },

        // Success Color
        success: {
          d: "#0F9A37",
          s: "#49A663",
          2: "#5BCF7C",
          1: "#5FD982",
          l: "#A5E3B8",
        },
      },

      // Typography scale
      fontSize: {
        "h1": ["64px", { lineHeight: "76px", fontWeight: "600" }],
        "h2": ["36px", { lineHeight: "44px", fontWeight: "600" }],
        "h3": ["28px", { lineHeight: "36px", fontWeight: "600" }],
        "h4": ["28px", { lineHeight: "36px", fontWeight: "600" }],

        "b1": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "b2": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "b3": ["14px", { lineHeight: "20px", fontWeight: "400" }],

        "btn": ["18px", { lineHeight: "24px", fontWeight: "400" }],
        "btn-md": ["16px", { lineHeight: "20px", fontWeight: "400" }],
        "btn-sm": ["14px", { lineHeight: "16px", fontWeight: "400" }],

        "field-1": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "field-2": ["12px", { lineHeight: "16px", fontWeight: "400" }],
      },
      
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
