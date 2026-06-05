/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#0a0d10',
          1: '#0f1317',
          2: '#151a20',
          3: '#1c222a',
          4: '#262d36',
          hover: '#1f262e',
        },
        fg: {
          0: '#f3f5f7',
          1: '#c8cfd6',
          2: '#8a939d',
          3: '#5a636d',
          4: '#3a424b',
        },
        border: {
          1: '#1e252d',
          2: '#2a323c',
          3: '#3a4452',
        },
        grass: {
          DEFAULT: '#5ac44d',
          dim:     '#4a9e3f',
          bright:  '#7ee070',
          soft:    'rgba(90,196,77,0.12)',
          glow:    'rgba(90,196,77,0.35)',
        },
        status: {
          ok:     '#5ac44d',
          warn:   '#f5b544',
          danger: '#e55353',
          info:   '#4fb3ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xs: '4px', sm: '6px', md: '10px', lg: '14px', xl: '20px',
      },
    },
  },
  plugins: [],
};
