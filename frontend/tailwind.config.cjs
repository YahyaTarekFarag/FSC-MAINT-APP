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
        },
    },
    plugins: [
        require('tailwindcss-rtl'),
    ],
}
