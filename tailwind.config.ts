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
        gold: {
          50: '#FBF7E8',
          100: '#F5ECC8',
          200: '#E8D48A',
          300: '#D4B85E',
          400: '#C9A84C',
          500: '#A88B3A',
          600: '#8A7030',
          700: '#6B5624',
          800: '#4D3D1A',
          900: '#332810',
        },
        dark: {
          50: '#0F1117',
          100: '#1A1D26',
          200: '#242833',
          300: '#2E3240',
          400: '#4A5168',
          500: '#636A7C',
          600: '#9BA1B0',
          700: '#C5C9D4',
          800: '#E0E2E8',
          900: '#F0F1F4',
          950: '#0A0B0F',
        },
        // Accent colors - WCAG compliant
        accent: {
          success: '#10b981', // ✅ 4.8:1 on dark-950
          warning: '#facc15',  // giallo meno "oro", usato poco dopo allineamento landing
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
        'gold': '0 0 20px rgba(var(--color-accent-main-rgb), 0.3)',
        'gold-lg': '0 0 40px rgba(var(--color-accent-main-rgb), 0.4)',
        'dark': '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
        'dark-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
        'inner-gold': 'inset 0 2px 4px 0 rgba(var(--color-accent-main-rgb), 0.15)',
        'glow': '0 0 15px rgba(var(--color-accent-main-rgb), 0.5)',
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, var(--color-accent-main) 0%, var(--color-accent-dark) 100%)',
        'gradient-dark': 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
        'gradient-radial': 'radial-gradient(circle at center, var(--color-accent-main), transparent 70%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(var(--color-accent-main-rgb), 0.2), transparent)',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(var(--color-accent-main-rgb), 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(var(--color-accent-main-rgb), 0.5)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
