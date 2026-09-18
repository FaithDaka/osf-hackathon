/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind v3: `content` IS the purge mechanism (the old `purge` key was
  // removed in v3). Kept aggressively narrow for minimal CSS output.
  // Spec asked for `purge` enabled — covered here via `content` + `safelist: []`.
  // Spec globs kept verbatim; `./pages/**` added because Phase 1 ships the
  // Pages Router shell (App Router prerender is incompatible with
  // preact/compat — see next.config.js). Still aggressively narrow.
  content: ['./app/**/*.{js,jsx}', './pages/**/*.{js,jsx}', './lib/**/*.js'],
  safelist: [],
  theme: {
    extend: {
      colors: {
        'ac-green': '#1B5E20',
        'ac-amber': '#F57F17',
        'ac-red': '#B71C1C',
        'ac-blue': '#0D47A1',
        'ac-bg': '#FAFAFA',
        'ac-card': '#FFFFFF',
        'ac-muted': '#757575',
      },
      fontSize: {
        // 18px base for low-vision users (not the 16px default).
        base: '18px',
      },
    },
  },
  // No animation / transition utilities by default; any residual
  // transitions are killed in app/globals.css with `!important`.
  corePlugins: {
    animation: false,
  },
  plugins: [
    // Custom accessible touch-target component classes.
    // Usage: class="btn-ac" (full spec) — all buttons min 48x48px.
    function ({ addComponents }) {
      addComponents({
        '.btn-ac': {
          minHeight: '48px',
          minWidth: '48px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          fontSize: '18px',
          fontWeight: '600',
        },
      });
    },
  ],
};
