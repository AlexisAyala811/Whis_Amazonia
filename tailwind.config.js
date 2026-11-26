/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: v('bg'),
        surface: v('surface'),
        surface2: v('surface2'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        brand: v('brand'),
        ok: v('ok'),
        warn: v('warn'),
        danger: v('danger'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgb(0 0 0 / 0.35)',
      },
      keyframes: {
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(-12px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        wave: { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
        grow: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '60%': { opacity: '1', transform: 'scale(1.03)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        ring: { '0%': { transform: 'scale(0.7)', opacity: '0.9' }, '100%': { transform: 'scale(1.5)', opacity: '0' } },
        destello: {
          '0%': { transform: 'translateY(-10px) rotate(0deg)', opacity: '0' },
          '15%': { opacity: '1' },
          '100%': { transform: 'translateY(260px) rotate(var(--giro, 180deg))', opacity: '0' },
        },
      },
      animation: {
        'sheet-in': 'sheet-in 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 200ms ease-out',
        'toast-in': 'toast-in 220ms ease-out',
        wave: 'wave 900ms ease-in-out infinite',
        grow: 'grow 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        'pop-in': 'pop-in 360ms cubic-bezier(0.22, 1, 0.36, 1)',
        ring: 'ring 1.4s ease-out 2',
        destello: 'destello 1.6s ease-in forwards',
      },
    },
  },
  plugins: [],
};
