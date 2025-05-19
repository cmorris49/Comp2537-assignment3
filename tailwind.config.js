/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './js/**/*.js',
    './src/**/*.html',
    './src/**/*.js',
  ],
  safelist: [
    'grid-cols-2','grid-cols-3','grid-cols-4','grid-cols-6',
    'sm:grid-cols-3','md:grid-cols-3','md:grid-cols-4','md:grid-cols-6',
  ],
  theme: { extend: {} },
  plugins: [],
}

