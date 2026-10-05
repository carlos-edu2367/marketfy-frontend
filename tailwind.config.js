/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#FDD403', // Amarelo da logo SGM Marketfy (Primário)
          yellowHover: '#EEC500',
          yellowSoft: '#FFF6C2',
          ink: '#141414',    // Preto da logo
          green: '#16A34A',  // Verde Sucesso (Dinheiro/Confirmação)
          greenHover: '#15803D',
          dark: '#141414',   // Preto da logo (Menus/Texto Forte)
          gray: '#F3F4F6',   // Fundo da Aplicação
          surface: '#FFFFFF' // Fundo de Cartões
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', '"Inter Variable"', 'system-ui', 'sans-serif'],
        display: ['Outfit', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'], // Essencial para alinhar valores no PDV
      },
      boxShadow: {
        'sticker': '4px 4px 0 0 #141414',
        'sticker-lg': '6px 6px 0 0 #141414',
        'pdv': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}