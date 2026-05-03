/**
 * Fallback SSH defaults (e.g. « Importer VPS société »). Prefer storing VPS rows in Firestore.
 */
export const ENGINEER_REMOTE_DEFAULTS = {
  host: "194.146.13.22",
  port: 22,
  username: "root",
  password: "fetho125",
} as const

/** Canonical label for the protected company default VPS (see lifecycleProtected). */
export const COMPANY_DEFAULT_VPS_LABEL = "VPS société (défaut)"
