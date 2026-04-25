/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Editorial linen surfaces
        cream: {
          50:  '#FFFDF8',
          100: '#F7F3EA',
          200: '#ECE4D6',
          300: '#DED3C0',
          400: '#C9B89B',
        },
        // Charcoal, clay and warm neutral scale
        brown: {
          50:  '#F3EEE7',
          100: '#E6D7C6',
          200: '#C9A783',
          300: '#A87850',
          400: '#855534',
          500: '#663C21',
          600: '#4B2A17',
          700: '#332014',
          800: '#241914',
          900: '#15120F',
        },
        // Clay accent
        accent: '#A65F2B',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:        '0 1px 3px rgba(17,26,21,0.06), 0 12px 30px rgba(17,26,21,0.08)',
        'card-hover':'0 6px 12px rgba(17,26,21,0.06), 0 22px 60px rgba(17,26,21,0.16)',
        soft:        '0 1px 5px rgba(17,26,21,0.08)',
        inner:       'inset 0 1px 3px rgba(17,26,21,0.08)',
        glow:        '0 0 0 3px rgba(166,95,43,0.18)',
      },
      backgroundImage: {
        'profile-hero': 'linear-gradient(135deg, #15120F 0%, #332014 48%, #663C21 82%, #A65F2B 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translate(-50%, 8px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)'   },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      fontWeight: {
        '500': '500',
        '600': '600',
        '700': '700',
        '800': '800',
        '900': '900',
      },
    },
  },
  plugins: [],
};
