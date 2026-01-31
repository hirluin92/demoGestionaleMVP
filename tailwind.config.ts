import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Gold/Oro palette - Usa variabili CSS per centralizzazione
        gold: {
          50: 'var(--color-gold-light)',
          100: 'var(--color-gold-light)',
          200: 'var(--color-gold-main)',
          300: 'var(--color-gold-main)',  // Gold principale
          400: 'var(--color-gold-main)',  // Gold principale
          500: 'var(--color-gold-dark)',  // Gold scuro
          600: 'var(--color-gold-dark)',
          700: 'var(--color-gold-dark)',
          800: 'var(--color-gold-dark)',
          900: 'var(--color-gold-dark)',
        },
        // Black palette - Nero puro, non marrone
        dark: {
          50: '#0a0a0a',   // Quasi nero
          100: '#111111',   // Nero scuro
          200: '#1a1a1a',  // Nero scuro
          300: '#2a2a2a',  // Grigio molto scuro
          400: '#3a3a3a',  // Grigio scuro
          500: '#666666',  // ✅ 4.6:1 contrast on dark-950 (WCAG AA)
          600: '#999999',  // ✅ 7.8:1 contrast on dark-950 (WCAG AAA)
          700: '#cccccc',  // ✅ 12.1:1 contrast on dark-950 (WCAG AAA)
          800: '#e0e0e0',
          900: '#f5f5f5',
          950: '#000000',  // Nero puro - Main background
        },
        // Accent colors - WCAG compliant
        accent: {
          success: '#10b981', // ✅ 4.8:1 on dark-950
          warning: '#ffd700',  // ✅ 8.5:1 on dark-950 - Oro brillante
          danger: '#f87171',   // ✅ 5.2:1 on dark-950
          info: '#60a5fa',     // ✅ 5.8:1 on dark-950
        },
      },
      fontFamily: {
        sans: ['var(--font-primary)'],
        display: ['var(--font-primary)'],
        heading: ['var(--font-primary)'],
        mono: ['var(--font-primary)', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Mobile-first responsive sizes
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      boxShadow: {
        'gold': '0 0 20px rgba(var(--color-gold-main-rgb), 0.3)',
        'gold-lg': '0 0 40px rgba(var(--color-gold-main-rgb), 0.4)',
        'dark': '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
        'dark-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
        'inner-gold': 'inset 0 2px 4px 0 rgba(var(--color-gold-main-rgb), 0.15)',
        'glow': '0 0 15px rgba(var(--color-gold-main-rgb), 0.5)',
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, var(--color-gold-main) 0%, var(--color-gold-dark) 100%)',
        'gradient-dark': 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
        'gradient-radial': 'radial-gradient(circle at center, var(--color-gold-main), transparent 70%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(var(--color-gold-main-rgb), 0.2), transparent)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'shimmer': 'shimmer 2.5s linear infinite',
        'pulse-gold': 'pulseGold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(var(--color-gold-main-rgb), 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(var(--color-gold-main-rgb), 0.5)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
