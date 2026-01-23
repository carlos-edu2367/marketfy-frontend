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
          yellow: '#FACC15', // Amarelo Ouro (Atenção/Primário)
          yellowHover: '#EAB308',
          green: '#16A34A',  // Verde Sucesso (Dinheiro/Confirmação)
          greenHover: '#15803D',
          dark: '#1F2937',   // Cinza Escuro (Menus/Texto Forte)
          gray: '#F3F4F6',   // Fundo da Aplicação
          surface: '#FFFFFF' // Fundo de Cartões
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'], // Essencial para alinhar valores no PDV
      },
      boxShadow: {
        'pdv': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}