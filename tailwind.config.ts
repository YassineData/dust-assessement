import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  // Status pills are composed dynamically (see lib/score-colors.ts)
  safelist: ["pill-green", "pill-amber", "pill-red", "pill-blue", "pill-brand", "pill-neutral", "pill-pink", "pill-lav", "tier-top", "tier-proficient", "tier-emerging", "tier-critical"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", md: "1.5rem", lg: "2rem" },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Compact product scale: 13px body, 15px card titles, 22px page titles.
      fontSize: {
        '2xs': ['11px', { lineHeight: '1.35' }],
        xs: ['12px', { lineHeight: '1.35' }],
        sm: ['13px', { lineHeight: '1.4' }],
        base: ['14px', { lineHeight: '1.45' }],
        lg: ['15px', { lineHeight: '1.4' }],
        xl: ['18px', { lineHeight: '1.35' }],
        '2xl': ['22px', { lineHeight: '1.3' }],
        '3xl': ['26px', { lineHeight: '1.25' }],
        '4xl': ['32px', { lineHeight: '1.2' }],
      },
      colors: {
        ink: "hsl(var(--ink))",
        line: "hsl(var(--line))",
        paper: "hsl(var(--paper))",
        lav: { 50: "hsl(var(--lav-50))", 100: "hsl(var(--lav-100))", 200: "hsl(var(--lav-200))" },
        outline: "hsl(var(--outline-ink))",
        brand: {
          DEFAULT: "hsl(var(--brand))",
          strong: "hsl(var(--brand-strong))",
          ink: "hsl(var(--brand-ink))",
          soft: "hsl(var(--brand-soft))",
        },
        sky: "hsl(var(--sky))",
        pink: { DEFAULT: "hsl(var(--pink))", soft: "hsl(var(--pink-soft))", ink: "hsl(var(--pink-ink))" },
        lime: { DEFAULT: "hsl(var(--lime))", soft: "hsl(var(--lime-soft))" },
        sun: "hsl(var(--sun))",
        slate: "hsl(var(--slate))",
        ok: { DEFAULT: "hsl(var(--green))", ink: "hsl(var(--green-ink))", soft: "hsl(var(--green-soft))" },
        warn: { DEFAULT: "hsl(var(--amber))", ink: "hsl(var(--amber-ink))", soft: "hsl(var(--amber-soft))" },
        risk: { DEFAULT: "hsl(var(--red))", ink: "hsl(var(--red-ink))", soft: "hsl(var(--red-soft))" },
        note: { DEFAULT: "hsl(var(--blue))", ink: "hsl(var(--blue-ink))", soft: "hsl(var(--blue-soft))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
          muted: "hsl(var(--primary-muted))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success-muted))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted: "hsl(var(--warning-muted))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
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
        profile: {
          ambassador: "hsl(var(--profile-ambassador))",
          performer: "hsl(var(--profile-performer))",
          curious: "hsl(var(--profile-curious))",
          novice: "hsl(var(--profile-novice))",
          traditional: "hsl(var(--profile-traditional))",
        },
        score: {
          red: "hsl(var(--score-red))",
          orange: "hsl(var(--score-orange))",
          yellow: "hsl(var(--score-yellow))",
          green: "hsl(var(--score-green))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
          6: "hsl(var(--chart-6))",
          7: "hsl(var(--chart-7))",
          8: "hsl(var(--chart-8))",
          9: "hsl(var(--chart-9))",
          benchmark: "hsl(var(--chart-benchmark))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      // cards 10px · inner elements 8px · badges and pills 6px
      borderRadius: {
        lg: "var(--radius)",
        md: "8px",
        sm: "6px",
        xl: "var(--radius)",
        "2xl": "12px",
      },
      // One very light elevation; popovers get slightly more to separate from content.
      boxShadow: {
        sm: "0 1px 2px rgba(26, 33, 48, 0.04)",
        DEFAULT: "0 1px 2px rgba(26, 33, 48, 0.04)",
        md: "0 1px 2px rgba(26, 33, 48, 0.04)",
        lg: "0 4px 16px rgba(26, 33, 48, 0.08)",
        xl: "0 8px 24px rgba(26, 33, 48, 0.10)",
        soft: "0 1px 2px rgba(26, 33, 48, 0.04)",
        medium: "0 4px 16px rgba(26, 33, 48, 0.08)",
        strong: "0 8px 24px rgba(26, 33, 48, 0.10)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
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
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "scale-in": {
          from: { transform: "scale(0.98)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.15s ease-out",
        "accordion-up": "accordion-up 0.15s ease-out",
        "fade-out": "fade-out 0.15s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "slide-in-right": "slide-in-right 0.18s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
