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
        // ── AlertCitizen design system (single source of truth) ──
        // Three-hue civic palette: vibrant but trustworthy.
        //   PRIMARY (civic purple) #5B2D8E — brand, primary actions,
        //     nav-active, links, info badges, quiz progress.
        //   SECONDARY (civic emerald) #0E7A55 — success, completed,
        //     resolved, high scores. Vivid, not the bland #1B5E20.
        //   ACCENT (civic coral) #C22433 — alerts, escalated/stalled,
        //     low scores, energy CTAs.
        // Amber #B45309 is FUNCTIONAL ONLY (warning / under-review /
        // in-progress) so severity keeps 3 distinguishable levels.
        // Neutrals: lavender-tinted bg ties the purple brand.
        primary: {
          DEFAULT: '#5B2D8E',
          dark: '#3D1D60',
          soft: '#EDE7F6',
        },
        secondary: {
          DEFAULT: '#0E7A55',
          dark: '#095C41',
          soft: '#DDF0E7',
        },
        accent: {
          DEFAULT: '#C22433',
          dark: '#8E1622',
          soft: '#FDE4E7',
        },
        amber: {
          DEFAULT: '#B45309',
          soft: '#FEF3C7',
        },
        ink: '#201C2B',
        line: '#E3DDF0',
        // ── Neutral aliases (kept so existing layout classes keep working).
        // They point at the new system — do NOT introduce new hex here.
        'ac-bg': '#F5F1FA',
        'ac-card': '#FFFFFF',
        'ac-muted': '#5F5B6B',
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
