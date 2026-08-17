import type { Config } from 'tailwindcss';

/**
 * Minimal by construction: one neutral ramp carries almost every surface, one
 * accent marks genuine actions, and semantic colour is reserved for state that
 * needs to be noticed. Anything not defined here does not belong in the UI.
 *
 * The accent is indigo-violet. It is the only hue with any saturation in the
 * chrome, so anything wearing it reads as actionable, and the neutral ramp is
 * tinted toward the same hue so the two never look like different systems.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral, pulled a few degrees toward the accent. The page is mostly
        // this — a pure grey next to a violet accent reads as slightly green.
        slate: {
          50: '#fafaff',
          100: '#f3f3fa',
          200: '#e6e6f1',
          300: '#cdcde0',
          400: '#9797b2',
          500: '#6d6d8c',
          600: '#53536e',
          700: '#3b3b53',
          800: '#272738',
          900: '#161622',
        },
        // The only accent. Primary actions, links, focus, and pipeline motion.
        accent: {
          50: '#f4f2ff',
          100: '#e8e4ff',
          200: '#d2caff',
          300: '#b3a5fb',
          400: '#8d78f2',
          500: '#6f56e6',
          600: '#5b3fd6',
          700: '#4a30b4',
          800: '#3a258e',
          900: '#271862',
        },
        // Semantic, chosen to clear 4.5:1 on white as text and as chip fills.
        positive: { 50: '#ecfdf5', 100: '#d1fae5', 600: '#047857', 700: '#036148' },
        caution: { 50: '#fffbeb', 100: '#fef3c7', 600: '#b45309', 700: '#92400e' },
        critical: { 50: '#fef2f2', 100: '#fee2e2', 600: '#dc2626', 700: '#b91c1c' },
      },
      fontFamily: {
        // Inter if it loads, the system UI face if it does not. Both are
        // neutral grotesques at the same optical size, so the layout does not
        // shift when the webfont arrives late or never.
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        // 15px floor, 17px body. `xs` carries real content here — every
        // secondary line in a list row uses it — so it is sized to be read
        // across a desk, not squinted at. Headings carry negative tracking so
        // large type stays tight and formal.
        //
        // The two display tiers are fluid: they interpolate with the viewport
        // between a phone-safe minimum and a desktop maximum, so a page title
        // is never oversized on a narrow screen nor undersized on a wide one.
        xs: ['0.9375rem', { lineHeight: '1.375rem', letterSpacing: '0.005em' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        base: ['1.0625rem', { lineHeight: '1.625rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        xl: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '2xl': [
          'clamp(1.875rem, 1.55rem + 1.4vw, 2.25rem)',
          { lineHeight: '1.2', letterSpacing: '-0.02em' },
        ],
        '3xl': [
          'clamp(2.25rem, 1.85rem + 1.8vw, 2.75rem)',
          { lineHeight: '1.15', letterSpacing: '-0.025em' },
        ],
      },
      letterSpacing: {
        // For the small uppercase labels above every headline number.
        label: '0.06em',
      },
      borderWidth: {
        // 2px is the default edge. Containers, controls, and section bands all
        // get a border you can actually see — a 1px hairline disappears on a
        // high-density display and was the main reason surfaces read as flat.
        DEFAULT: '2px',
      },
      divideWidth: {
        // Row separators stay lighter than container edges. At 2px a list of
        // leads reads as a grid of boxes rather than as one list.
        DEFAULT: '1.5px',
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '9px',
        lg: '12px',
        xl: '14px',
        '2xl': '18px',
        // Status indicators are fully rounded, so state reads as a distinct shape.
        pill: '9999px',
      },
      boxShadow: {
        // Each level pairs a tight contact shadow with a wider ambient one, so
        // a surface reads as lifted rather than outlined. Depth is the main
        // separator between cards and the page — borders only refine the edge.
        // The tint is the accent hue, not black: a neutral-black shadow over a
        // tinted page turns muddy.
        xs: '0 1px 2px 0 rgb(39 24 98 / 0.08)',
        sm: '0 1px 2px -1px rgb(39 24 98 / 0.14), 0 4px 12px -2px rgb(39 24 98 / 0.12)',
        md: '0 3px 6px -3px rgb(39 24 98 / 0.16), 0 14px 30px -8px rgb(39 24 98 / 0.20)',
        lg: '0 6px 12px -6px rgb(39 24 98 / 0.20), 0 28px 60px -12px rgb(39 24 98 / 0.30)',
        // Reserved for the hover state of a card that is genuinely clickable.
        // Deeper than `md` by a clear margin, or the lift does not register.
        lift: '0 8px 14px -6px rgb(39 24 98 / 0.20), 0 26px 50px -14px rgb(39 24 98 / 0.32)',
        // A recessed inner edge, for the pressed state of segmented controls.
        inset: 'inset 0 2px 4px 0 rgb(39 24 98 / 0.10)',
      },
      transitionTimingFunction: {
        // Fast out, settled in. Everything that moves uses one of these two, so
        // the interface has a single sense of weight.
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        // The entrance for anything that arrives in a list: a short rise, never
        // a slide across the screen. Distance is small enough to read as the
        // content settling rather than as an effect.
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
        // A number or chip that has just changed value.
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        // The halo around the live-connection dot. Opacity only, so it cannot
        // push anything around during layout.
        halo: {
          '0%': { opacity: '0.55', transform: 'scale(1)' },
          '70%, 100%': { opacity: '0', transform: 'scale(2.4)' },
        },
        // Travels across an indeterminate or in-flight progress bar.
        sheen: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(200%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        // `backwards`, not `both`: the fill must not survive the animation, or
        // it would outrank the hover transform on any card that lifts.
        rise: 'rise 260ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pop-in': 'pop-in 180ms cubic-bezier(0.34, 1.4, 0.64, 1)',
        halo: 'halo 2s ease-out infinite',
        sheen: 'sheen 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
