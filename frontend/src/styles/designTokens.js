/**
 * AtendZappy Design Token System
 *
 * Centralized design tokens for the entire application.
 * All visual decisions (colors, typography, spacing, etc.) live here.
 *
 * Usage:
 *   - MUI theme: via theme.palette.xxx, theme.tokens.xxx
 *   - CSS variables: via var(--token-name) (set on :root by App.js)
 *   - JS: import { tokens, lightTheme, darkTheme } from './designTokens'
 */

// ─── Primitive Tokens ─────────────────────────────────────────────────────────
// Raw values with no semantic meaning. Build semantic tokens from these.

export const primitives = {
  // Neutral / Gray scale
  gray: {
    50:  "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#0a0f1a",
  },

  // Blue (primary accent)
  blue: {
    50:  "#eff6ff",
    100: "#dbeafe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
  },

  // Green (success)
  green: {
    50:  "#f0fdf4",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
  },

  // Yellow (warning)
  yellow: {
    50:  "#fefce8",
    400: "#fbbf24",
    500: "#eab308",
    600: "#ca8a04",
  },

  // Red (error/danger)
  red: {
    50:  "#fef2f2",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
  },

  // Teal (WhatsApp brand)
  teal: {
    dark:  "#075E54",
    light: "#25D366",
  },

  // Absolute
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
};

// ─── Typography Tokens ─────────────────────────────────────────────────────────
export const typography = {
  fontFamily: '"Inter", "Roboto", "Segoe UI", "Helvetica Neue", Arial, sans-serif',

  fontSize: {
    xs:   "0.625rem",   // 10px — overline
    sm:   "0.75rem",    // 12px — caption
    base: "0.875rem",   // 14px — body2, button
    md:   "1rem",       // 16px — body1
    lg:   "1.125rem",   // 18px — h5 equivalent
    xl:   "1.25rem",    // 20px — h4 equivalent
    "2xl": "1.5rem",    // 24px — h2
    "3xl": "2.125rem",  // 34px — h1
  },

  fontWeight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  lineHeight: {
    tight:   1.2,
    normal:  1.43,
    relaxed: 1.5,
  },

  letterSpacing: {
    tighter: "-0.01562em",
    tight:   "-0.00833em",
    normal:  "0em",
    wide:    "0.02857em",
    wider:   "0.03333em",
    widest:  "0.08333em",
  },
};

// ─── Spacing Tokens ────────────────────────────────────────────────────────────
// Based on 4px base unit
export const spacing = {
  0:  "0px",
  1:  "4px",
  2:  "8px",
  3:  "12px",
  4:  "16px",
  5:  "20px",
  6:  "24px",
  8:  "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
};

// ─── Border Radius Tokens ──────────────────────────────────────────────────────
export const radii = {
  none: "0px",
  sm:   "4px",
  base: "8px",
  md:   "10px",
  lg:   "12px",
  xl:   "16px",
  "2xl": "18px",
  full: "9999px",
};

// ─── Shadow Tokens ─────────────────────────────────────────────────────────────
export const shadows = {
  none: "none",
  sm:   "0 1px 2px rgba(0, 0, 0, 0.05)",
  base: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
  md:   "0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)",
  lg:   "0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)",
  xl:   "0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)",
  dropdown: "0 10px 25px rgba(0, 0, 0, 0.15)",
  focus:    "0 0 0 3px rgba(59, 130, 246, 0.25)",
};

// ─── Z-Index Tokens ────────────────────────────────────────────────────────────
export const zIndex = {
  base:     0,
  raised:   1,
  dropdown: 1000,
  sticky:   1100,
  drawer:   1200,
  modal:    1300,
  tooltip:  1400,
  toast:    1500,
};

// ─── Semantic Tokens — Light Theme ────────────────────────────────────────────
// Maps semantic meaning to primitive values for light mode.
export const lightTheme = {
  // Backgrounds
  "bg-default":       primitives.gray[50],    // page background
  "bg-paper":         primitives.white,       // cards, modals
  "bg-surface":       primitives.gray[100],   // secondary surface, inputs
  "bg-surface-alpha": "rgba(255, 255, 255, 0.5)",
  "bg-inverse":       primitives.gray[900],   // dark surfaces (nav pills)
  "bg-hover":         primitives.gray[100],
  "bg-active":        primitives.gray[200],
  "bg-overlay":       "rgba(0, 0, 0, 0.4)",

  // Text
  "text-primary":   primitives.gray[900],   // main text
  "text-secondary": primitives.gray[500],   // secondary/supporting text
  "text-muted":     primitives.gray[400],   // placeholder, disabled
  "text-inverse":   primitives.white,       // text on dark surfaces
  "text-on-primary": primitives.white,      // text on primary-colored bg

  // Borders
  "border-default": primitives.gray[200],   // standard divider/border
  "border-strong":  primitives.gray[300],   // emphasized border
  "border-focus":   primitives.blue[500],   // focus ring

  // Semantic status
  "color-success":    primitives.green[500],
  "color-success-bg": primitives.green[50],
  "color-warning":    primitives.yellow[500],
  "color-warning-bg": primitives.yellow[50],
  "color-error":      primitives.red[500],
  "color-error-bg":   primitives.red[50],
  "color-info":       primitives.blue[500],
  "color-info-bg":    primitives.blue[50],

  // Navigation sidebar
  "nav-text":      primitives.white,
  "nav-icon":      primitives.gray[300],
  "nav-active-bg": "rgba(255, 255, 255, 0.15)",
  "nav-hover-bg":  "rgba(255, 255, 255, 0.08)",

  // Secondary bar (top nav row)
  "secondary-bar-bg":     "rgba(255, 255, 255, 0.5)",
  "secondary-bar-border": "rgba(0, 0, 0, 0.05)",

  // Quick nav pills (dark pill buttons in header)
  "quick-nav-bg":    primitives.gray[900],
  "quick-nav-hover": primitives.gray[800],
  "quick-nav-text":  primitives.white,
  "quick-nav-border": "rgba(255, 255, 255, 0.08)",

  // Search bar
  "search-bg":          primitives.gray[100],
  "search-border":      primitives.gray[200],
  "search-border-focus": primitives.blue[500],
  "search-text":        primitives.gray[900],
  "search-placeholder": primitives.gray[500],
  "search-icon":        primitives.gray[500],

  // Dropdown menus
  "dropdown-bg":         primitives.white,
  "dropdown-border":     primitives.gray[200],
  "dropdown-hover":      primitives.gray[100],
  "dropdown-text":       primitives.gray[900],
  "dropdown-text-muted": primitives.gray[500],
  "dropdown-divider":    primitives.gray[200],

  // Scrollbar
  "scrollbar-thumb": primitives.gray[300],
  "scrollbar-track": primitives.transparent,

  // Mobile nav
  "mobile-nav-bg":         primitives.white,
  "mobile-nav-border":     primitives.gray[200],
  "mobile-nav-text":       primitives.gray[700],
  "mobile-nav-active-text": primitives.blue[500],
  "mobile-nav-active-bg":  "rgba(59, 130, 246, 0.12)",
  "mobile-nav-hover-bg":   "rgba(59, 130, 246, 0.08)",
};

// ─── Semantic Tokens — Dark Theme ─────────────────────────────────────────────
export const darkTheme = {
  // Backgrounds
  "bg-default":       "#1a1a2e",                      // page background
  "bg-paper":         "#252540",                      // cards, modals
  "bg-surface":       "#2d2d4a",                      // secondary surface
  "bg-surface-alpha": "rgba(37, 37, 64, 0.6)",
  "bg-inverse":       primitives.gray[100],            // light surfaces (on dark bg)
  "bg-hover":         "rgba(255, 255, 255, 0.05)",
  "bg-active":        "rgba(255, 255, 255, 0.1)",
  "bg-overlay":       "rgba(0, 0, 0, 0.6)",

  // Text
  "text-primary":    primitives.gray[50],   // main text
  "text-secondary":  primitives.gray[400],  // secondary text
  "text-muted":      primitives.gray[500],  // placeholder, disabled
  "text-inverse":    primitives.gray[900],  // text on light surfaces
  "text-on-primary": primitives.white,      // text on primary-colored bg

  // Borders
  "border-default": primitives.gray[700],
  "border-strong":  primitives.gray[600],
  "border-focus":   primitives.blue[400],

  // Semantic status (brighter for dark bg contrast)
  "color-success":    primitives.green[400],
  "color-success-bg": "rgba(74, 222, 128, 0.1)",
  "color-warning":    primitives.yellow[400],
  "color-warning-bg": "rgba(251, 191, 36, 0.1)",
  "color-error":      primitives.red[400],
  "color-error-bg":   "rgba(248, 113, 113, 0.1)",
  "color-info":       primitives.blue[400],
  "color-info-bg":    "rgba(96, 165, 250, 0.1)",

  // Navigation sidebar
  "nav-text":      primitives.white,
  "nav-icon":      primitives.gray[400],
  "nav-active-bg": "rgba(255, 255, 255, 0.15)",
  "nav-hover-bg":  "rgba(255, 255, 255, 0.08)",

  // Secondary bar
  "secondary-bar-bg":     "rgba(37, 37, 64, 0.7)",
  "secondary-bar-border": "rgba(255, 255, 255, 0.06)",

  // Quick nav pills
  "quick-nav-bg":    primitives.gray[800],
  "quick-nav-hover": primitives.gray[700],
  "quick-nav-text":  primitives.gray[100],
  "quick-nav-border": "rgba(255, 255, 255, 0.1)",

  // Search bar
  "search-bg":           "#2d2d4a",
  "search-border":       primitives.gray[700],
  "search-border-focus": primitives.blue[400],
  "search-text":         primitives.gray[100],
  "search-placeholder":  primitives.gray[500],
  "search-icon":         primitives.gray[400],

  // Dropdown menus
  "dropdown-bg":         "#252540",
  "dropdown-border":     primitives.gray[700],
  "dropdown-hover":      "#2d2d4a",
  "dropdown-text":       primitives.gray[100],
  "dropdown-text-muted": primitives.gray[400],
  "dropdown-divider":    primitives.gray[700],

  // Scrollbar
  "scrollbar-thumb": primitives.gray[700],
  "scrollbar-track": primitives.transparent,

  // Mobile nav
  "mobile-nav-bg":          "#1a1a2e",
  "mobile-nav-border":      primitives.gray[700],
  "mobile-nav-text":        primitives.gray[300],
  "mobile-nav-active-text": primitives.blue[400],
  "mobile-nav-active-bg":   "rgba(96, 165, 250, 0.15)",
  "mobile-nav-hover-bg":    "rgba(96, 165, 250, 0.08)",
};

/**
 * Get the semantic tokens for a given mode.
 * @param {"light"|"dark"} mode
 */
export const getThemeTokens = (mode) => (mode === "dark" ? darkTheme : lightTheme);

/**
 * Apply theme tokens as CSS custom properties to the document root.
 * Called in App.js whenever the mode or primary color changes.
 *
 * @param {"light"|"dark"} mode
 * @param {string} primaryColor — resolved primary hex color for current mode
 */
export const applyCSSVariables = (mode, primaryColor) => {
  const root = document.documentElement;
  const tokens = getThemeTokens(mode);

  // Apply all semantic tokens
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  // Primary color (dynamic — set from admin settings)
  root.style.setProperty("--primaryColor", primaryColor);
  root.style.setProperty("--color-primary", primaryColor);

  // Static design tokens (same across themes)
  root.style.setProperty("--font-family", typography.fontFamily);

  Object.entries(typography.fontSize).forEach(([k, v]) =>
    root.style.setProperty(`--font-size-${k}`, v)
  );

  Object.entries(spacing).forEach(([k, v]) =>
    root.style.setProperty(`--space-${k}`, v)
  );

  Object.entries(radii).forEach(([k, v]) =>
    root.style.setProperty(`--radius-${k}`, v)
  );

  Object.entries(shadows).forEach(([k, v]) =>
    root.style.setProperty(`--shadow-${k}`, v)
  );

  Object.entries(zIndex).forEach(([k, v]) =>
    root.style.setProperty(`--z-${k}`, String(v))
  );
};

// Default export — all token groups for convenience
const designTokens = { primitives, typography, spacing, radii, shadows, zIndex };
export default designTokens;
