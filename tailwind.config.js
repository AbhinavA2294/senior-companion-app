/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* Brand palette */
        sage: {
          50: "#f6f8f5",
          100: "#e9efe6",
          200: "#d1dfcc",
          300: "#adc5a4",
          400: "#84a578",
          500: "#618a56",
          600: "#4c6e43",
          700: "#3d5837",
          800: "#33472e",
          900: "#2b3b27",
        },
        warm: {
          50: "#fdf8f3",
          100: "#faeee0",
          200: "#f3d9bb",
          300: "#eabe8d",
          400: "#df9f5c",
          500: "#d6863a",
          600: "#c7712f",
          700: "#a55828",
          800: "#844727",
          900: "#6b3c23",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      fontSize: {
        /* Senior-friendly scale */
        "senior-sm": ["1rem", { lineHeight: "1.6" }],
        "senior-base": ["1.125rem", { lineHeight: "1.7" }],
        "senior-lg": ["1.25rem", { lineHeight: "1.65" }],
        "senior-xl": ["1.5rem", { lineHeight: "1.5" }],
        "senior-2xl": ["1.875rem", { lineHeight: "1.4" }],
        "senior-3xl": ["2.25rem", { lineHeight: "1.3" }],
        "senior-4xl": ["3rem", { lineHeight: "1.2" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
