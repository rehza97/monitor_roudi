/**
 * True when running `vite` (dev), false for `vite build` output.
 * Set via vite.config.ts `define` — not from .env files.
 */
export const IS_VITE_DEV: boolean = __APP_IS_DEV__
