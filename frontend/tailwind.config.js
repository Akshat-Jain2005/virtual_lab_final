/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep space backgrounds
        void:   '#020408',
        abyss:  '#050d14',
        depth:  '#080f1a',
        surface:'#0d1826',
        panel:  '#111f30',
        card:   '#162436',
        border: '#1e3048',
        muted:  '#243a55',

        // Primary neon accent – electric cyan
        cyan: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          900: '#164e63',
          neon:'#00f5ff',
        },

        // Secondary accent – phosphor green
        lime: {
          neon: '#39ff14',
          400:  '#a3e635',
          500:  '#84cc16',
        },

        // Tertiary – plasma violet
        violet: {
          neon: '#bf00ff',
          400:  '#a78bfa',
          500:  '#8b5cf6',
        },

        // Semantic
        success: '#39ff14',
        warning: '#fbbf24',
        danger:  '#ff3366',
        info:    '#00f5ff',
      },

      fontFamily: {
        display: ['"Orbitron"', 'monospace'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },

      backgroundImage: {
        'grid-slate':   'linear-gradient(rgba(30,48,72,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(30,48,72,0.4) 1px, transparent 1px)',
        'glow-cyan':    'radial-gradient(ellipse at center, rgba(0,245,255,0.15) 0%, transparent 70%)',
        'glow-violet':  'radial-gradient(ellipse at center, rgba(191,0,255,0.12) 0%, transparent 70%)',
        'hero-mesh':    'radial-gradient(at 20% 50%, rgba(0,245,255,0.08) 0px, transparent 50%), radial-gradient(at 80% 20%, rgba(191,0,255,0.08) 0px, transparent 50%), radial-gradient(at 50% 80%, rgba(57,255,20,0.05) 0px, transparent 50%)',
      },

      backgroundSize: {
        'grid': '40px 40px',
      },

      boxShadow: {
        'glow-sm':    '0 0 10px rgba(0,245,255,0.3)',
        'glow-md':    '0 0 20px rgba(0,245,255,0.4), 0 0 40px rgba(0,245,255,0.1)',
        'glow-lg':    '0 0 30px rgba(0,245,255,0.5), 0 0 60px rgba(0,245,255,0.2)',
        'glow-violet':'0 0 20px rgba(191,0,255,0.4), 0 0 40px rgba(191,0,255,0.1)',
        'glow-lime':  '0 0 20px rgba(57,255,20,0.4)',
        'panel':      '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass':      '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
        'deep':       '0 20px 60px rgba(0,0,0,0.7)',
      },

      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.5rem',
      },

      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-breathe':  'glowBreathe 2.5s ease-in-out infinite',
        'scan':          'scan 4s linear infinite',
        'float':         'float 6s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
      },

      keyframes: {
        glowBreathe: {
          '0%,100%': { opacity: '0.6', filter: 'brightness(1)' },
          '50%':     { opacity: '1',   filter: 'brightness(1.3)' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
