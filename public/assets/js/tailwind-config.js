window.tailwind = window.tailwind || {};
window.tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#F9B03C',      // Orange - Bold, energetic
                secondary: '#3268BA',    // Blue - Professional, trustworthy
                dark: '#000000',         // Pure Black - High contrast
                darkCard: '#111111',     // Slightly lighter black for cards
                light: '#FFFFFF',        // White - Clean, minimal
                bodyBg: '#f8fafc',       // Soft off-white for light mode
                success: '#10b981',
                danger: '#ef4444',
                warning: '#f59e0b'
            },
            fontFamily: {
                heading: ['Montserrat', 'Noto Sans Ethiopic', 'sans-serif'],
                body: ['Inter', 'Roboto', 'Noto Sans Ethiopic', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
                script: ['Great Vibes', 'cursive'],
            },
            animation: {
                'gradient-x': 'gradient-x 15s ease infinite',
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'blob': 'blob 10s infinite alternate',
                'slide-left': 'slideLeft 0.3s ease-out forwards'
            },
            keyframes: {
                'gradient-x': {
                    '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
                    '50%': { 'background-size': '200% 200%', 'background-position': 'right center' }
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-15px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(249, 176, 60, 0.7)' },
                    '50%': { opacity: .8, boxShadow: '0 0 0 15px rgba(249, 176, 60, 0)' }
                },
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                },
                slideLeft: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' }
                }
            }
        }
    }
}
