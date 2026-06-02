import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FFF9F5",
          dark: "#FFF0EB",
          warm: "#FFE8DF",
        },
        pink: {
          DEFAULT: "#FFB5C2",
          light: "#FFE4EC",
          soft: "#FFF0F3",
          dark: "#E8919F",
          accent: "#FF8FAB",
        },
        warm: {
          text: "#4A3728",
          muted: "#9B8B7E",
          light: "#C4B5A8",
        },
      },
      fontFamily: {
        sans: [
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(255, 181, 194, 0.18)",
        card: "0 2px 12px rgba(255, 181, 194, 0.12)",
        float: "0 8px 32px rgba(255, 181, 194, 0.25)",
      },
      borderRadius: {
        card: "16px",
        pill: "24px",
      },
    },
  },
  plugins: [],
};

export default config;
