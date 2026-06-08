/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        /* Stadium at Night — admin pannel/stadium_apex/DESIGN.md + HTML mocks */
        /* Stadium at Midnight — player pannel/stadium_at_midnight/DESIGN.md */
        player: {
          bg: '#080D1A',
          surface: '#0F1729',
          inner: '#162035',
          container: '#131929',
          highest: '#1e2538',
          green: '#00FF87',
          cyan: '#00B4D8',
          'on-accent': '#004620',
          'on-surface': '#e3e7fb',
          'on-variant': '#a6aabd',
          orange: '#ff7524',
          violet: '#A855F7',
        },
        admin: {
          canvas: '#0A0F1E',
          surface: '#1A1F2F',
          'surface-high': '#25293a',
          'surface-highest': '#2f3445',
          'surface-low': '#161b2b',
          well: '#090E1C',
          cyan: '#00E5FF',
          'cyan-deep': '#0066FF',
          orange: '#FF6B35',
          'secondary-container': '#b83900',
          gold: '#fec931',
          'on-surface': '#dee1f7',
          'on-surface-variant': '#bac9cc',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        headline: ['Rajdhani', 'system-ui', 'sans-serif'],
        orbitron: ['Orbitron', 'system-ui', 'sans-serif'],
        label: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        admin: '0.5rem',
        'admin-lg': '0.75rem',
        /* stadium_at_midnight DESIGN.md — cards roundedness.md ≈ 1.5rem; nested 1rem */
        'player-card': '1.5rem',
        'player-nested': '1rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-14px) rotate(3deg)' },
        },
        'float-reverse': {
          '0%, 100%': { transform: 'translateY(-8px) rotate(-2deg)' },
          '50%': { transform: 'translateY(6px) rotate(2deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.05)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'bounce-ball': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-32px) scale(0.95)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'floodlight-sweep': {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.45' },
        },
        'score-flash': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        'float-reverse': 'float-reverse 6s ease-in-out infinite',
        'float-delayed': 'float 5s ease-in-out 1.5s infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        marquee: 'marquee 28s linear infinite',
        'fade-up': 'fade-up 0.8s ease-out forwards',
        'bounce-ball': 'bounce-ball 1.8s ease-in-out infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        shimmer: 'shimmer 4s linear infinite',
        'floodlight-sweep': 'floodlight-sweep 4s ease-in-out infinite',
        'score-flash': 'score-flash 2s ease-in-out infinite',
      },
      boxShadow: {
        'player-sidebar': '4px 0 24px rgba(0,0,0,0.5)',
        'player-stadium': '0 0 40px -10px rgba(0, 255, 135, 0.15)',
        'player-neon': '0 0 25px -5px rgba(0, 255, 135, 0.2)',
        'player-cta': '0 0 20px rgba(0, 255, 135, 0.3)',
        /* Luminance stack + green ambient — not flat grey */
        'player-card':
          '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.07), 0 0 48px -18px rgba(0,255,135,0.11)',
        'player-card-hover':
          '0 14px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,255,135,0.2), 0 0 32px rgba(0,255,135,0.14)',
        'player-hero':
          '0 12px 48px rgba(0,0,0,0.52), 0 0 0 1px rgba(255,255,255,0.09), 0 0 64px -14px rgba(0,255,135,0.16)',
        'player-inset':
          '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'admin-sidebar': '20px 0 40px rgba(0, 229, 255, 0.03)',
        'admin-glow': '0 0 20px rgba(0, 229, 255, 0.4)',
        'admin-float': '0 20px 40px rgba(0, 229, 255, 0.08)',
      },
    },
  },
  plugins: [],
};
