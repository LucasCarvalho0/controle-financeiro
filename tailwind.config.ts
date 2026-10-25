import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        income: "#16a34a",
        expense: "#dc2626",
        warn: "#d97706",
        info: "#2563eb",
      },
    },
  },
  plugins: [],
};
export default config;
