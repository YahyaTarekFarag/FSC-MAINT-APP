/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['IBM Plex Sans Arabic', 'sans-serif'],
            },
            colors: {
                GlassSurface: 'rgba(255, 255, 255, 0.1)',
                GlassBorder: 'rgba(255, 255, 255, 0.2)',
            },
        },
    },
    plugins: [
        require('tailwindcss-rtl'),
    ],
}
