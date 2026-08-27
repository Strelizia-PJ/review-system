import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        float: 'var(--shadow-float)'
      },
      transitionTimingFunction: {
        /** Springy overshoot curve for thumbs / micro-interactions */
        bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      keyframes: {
        /* Shimmer sweep for skeleton placeholders */
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        /* Springy pop-in for badges / icons */
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        /* Checkmark bloom — burst out then settle */
        bloom: {
          '0%': { transform: 'scale(0) rotate(-30deg)', opacity: '0' },
          '60%': { transform: 'scale(1.25) rotate(8deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' }
        },
        /* Gentle vertical bob for empty-state art */
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        /* Horizontal drift of pomodoro liquid wave (path is duplicated, -50% = one wavelength) */
        wave: {
          '0%': { transform: 'translateX(0px)' },
          '100%': { transform: 'translateX(-128px)' }
        },
        /* Soft breathing halo while the pomodoro timer runs */
        breathe: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.06)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        pop: 'pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        bloom: 'bloom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        float: 'float 3s ease-in-out infinite',
        wave: 'wave 2.6s linear infinite',
        breathe: 'breathe 3s ease-in-out infinite'
      }
    }
  },
  plugins: [animate]
}

export default config
