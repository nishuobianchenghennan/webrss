/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        serif: ['"Lora"', '"Noto Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        // Claude 风格的暖灰色调
        sand: {
          50:  '#faf9f7',
          100: '#f3f1ec',
          200: '#e8e4db',
          300: '#d6d0c4',
          400: '#b8af9e',
          500: '#9a8f7e',
          600: '#7d7060',
          700: '#625847',
          800: '#4a4234',
          900: '#332e25',
          950: '#201c16',
        },
        accent: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5bbfc',
          400: '#8098f9',
          500: '#6172f3',
          600: '#444ce7',
          700: '#3538cd',
          800: '#2d31a6',
          900: '#2d3282',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card': '0 2px 8px 0 rgb(0 0 0 / 0.06), 0 1px 3px -1px rgb(0 0 0 / 0.06)',
        'elevated': '0 8px 24px 0 rgb(0 0 0 / 0.08), 0 2px 8px -2px rgb(0 0 0 / 0.08)',
        'modal': '0 20px 60px -10px rgb(0 0 0 / 0.2), 0 8px 20px -6px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.sand.800'),
            '--tw-prose-headings': theme('colors.sand.900'),
            '--tw-prose-links': theme('colors.accent.600'),
            '--tw-prose-bold': theme('colors.sand.900'),
            '--tw-prose-counters': theme('colors.sand.500'),
            '--tw-prose-bullets': theme('colors.sand.400'),
            '--tw-prose-quotes': theme('colors.sand.700'),
            '--tw-prose-quote-borders': theme('colors.sand.300'),
            '--tw-prose-code': theme('colors.accent.700'),
            '--tw-prose-pre-bg': theme('colors.sand.950'),
            fontFamily: theme('fontFamily.serif').join(', '),
            fontSize: '1.0625rem',
            lineHeight: '1.8',
            maxWidth: 'none',
            'h1,h2,h3,h4': { fontFamily: theme('fontFamily.sans').join(', '), fontWeight: '600', letterSpacing: '-0.02em' },
            a: { textDecorationThickness: '1px', textUnderlineOffset: '3px' },
            img: { borderRadius: '0.75rem' },
            'pre code': { fontFamily: theme('fontFamily.mono').join(', ') },
          },
        },
        invert: {
          css: {
            '--tw-prose-body': theme('colors.sand.300'),
            '--tw-prose-headings': theme('colors.sand.100'),
            '--tw-prose-links': theme('colors.accent.400'),
            '--tw-prose-bold': theme('colors.sand.100'),
            '--tw-prose-quotes': theme('colors.sand.300'),
            '--tw-prose-quote-borders': theme('colors.sand.600'),
            '--tw-prose-code': theme('colors.accent.300'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
