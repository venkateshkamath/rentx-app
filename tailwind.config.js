/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm ivory backgrounds
        cream: {
          50:  '#FEFEFB',
          100: '#FAF7F2',
          200: '#F2EAE0',
          300: '#E6D8C8',
          400: '#D4BEA8',
        },
        // Rich espresso browns
        brown: {
          50:  '#F5EDE4',
          100: '#EAD4BE',
          200: '#C9A07A',
          300: '#A87850',
          400: '#8A5E38',
          500: '#6E4522',
          600: '#542E10',   // primary walnut
          700: '#3A1F0A',   // deep espresso
          800: '#2A1506',   // near-black espresso
          900: '#190C02',
        },
        // Warm copper accent
        accent: '#C47038',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 2px 16px rgba(42, 21, 6, 0.07)',
        'card-hover':'0 8px 40px rgba(42, 21, 6, 0.14)',
        soft:       '0 1px 4px  rgba(42, 21, 6, 0.08)',
        inner:      'inset 0 1px 3px rgba(42, 21, 6, 0.08)',
      },
      backgroundImage: {
        'profile-hero': 'linear-gradient(135deg, #190C02 0%, #3A1F0A 40%, #6E4522 80%, #8A5E38 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translate(-50%, 8px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)'   },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
