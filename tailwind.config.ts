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
        neo: {
          bg: "#F4F0EA",
          yellow: "#FFE600",
          yellowLight: "#FEF08A",
          blue: "#3B82F6",
          blueLight: "#93C5FD",
          green: "#00E599",
          greenLight: "#86EFAC",
          pink: "#FF6BB5",
          pinkLight: "#FBCFE8",
          orange: "#FF8400",
          orangeLight: "#FED7AA",
          purple: "#A855F7",
          purpleLight: "#E9D5FF",
          card: "#FFFFFF",
          border: "#000000",
        },
      },
      boxShadow: {
        neo: "4px 4px 0px 0px #000000",
        "neo-sm": "2px 2px 0px 0px #000000",
        "neo-lg": "6px 6px 0px 0px #000000",
        "neo-xl": "8px 8px 0px 0px #000000",
        "neo-hover": "2px 2px 0px 0px #000000",
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
export default config;
