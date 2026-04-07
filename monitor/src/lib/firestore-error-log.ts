import type { FirebaseError } from "firebase/app"
import { getAuthDebugSnapshot } from "./auth-debug-state"

function getFirebaseErrorFields(error: unknown): {
  code: string
  message: string
  name: string
  stackTop: string | null
} {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as FirebaseError).code === "string"
  ) {
    const fe = error as FirebaseError
    return {
      code: fe.code,
      message: fe.message || "",
      name: fe.name || "FirebaseError",
      stackTop: typeof fe.stack === "string" ? fe.stack.split("\n")[1]?.trim() ?? null : null,
    }
  }
  if (error instanceof Error) {
    return {
      code: "unknown",
      message: error.message,
      name: error.name,
      stackTop: typeof error.stack === "string" ? error.stack.split("\n")[1]?.trim() ?? null : null,
    }
  }
  return { code: "unknown", message: String(error), name: "UnknownError", stackTop: null }
}

/** Best-effort path / label for Firestore references and queries (for console debugging). */
export function labelFirestoreTarget(target: unknown): string {
  if (!target || typeof target !== "object") return "(unknown)"

  // DocumentReference has a .path string
  const t = target as Record<string, unknown>
  if (typeof t.path === "string" && t.path.length > 0) return t.path

  // Query exposes ._query.path.segments or similar internals — try several known shapes
  const q = t._query ?? t._queryOptions ?? t
  if (q && typeof q === "object") {
    const inner = q as Record<string, unknown>
    // Newer Firestore SDK: _query.path.segments[]
    if (inner.path && typeof inner.path === "object") {
      const seg = (inner.path as Record<string, unknown>).segments
      if (Array.isArray(seg)) return seg.join("/")
    }
    // Older SDK: collectionId
    if (typeof inner.collectionId === "string") return inner.collectionId
  }

  return "(query)"
}

function normalizeConstraint(entry: unknown): Record<string, unknown> | null {
  if (!entry || typeof entry !== "object") return null
  const t = entry as Record<string, unknown>
  return {
    type: typeof t.type === "string" ? t.type : null,
    field: typeof t.field === "string" ? t.field : null,
    op: typeof t.op === "string" ? t.op : null,
    value: "value" in t ? t.value : null,
    direction: typeof t.dir === "string" ? t.dir : null,
    limit: typeof t.limit === "number" ? t.limit : null,
  }
}

/** Deeper description for Query/DocumentReference internals (best effort). */
export function describeFirestoreTarget(target: unknown): Record<string, unknown> {
  const base: Record<string, unknown> = {
    label: labelFirestoreTarget(target),
    kind: "unknown",
  }
  if (!target || typeof target !== "object") return base

  const t = target as Record<string, unknown>
  if (typeof t.path === "string" && t.path.length > 0) {
    return { ...base, kind: "document-or-collection-ref", path: t.path }
  }

  const q = (t._query && typeof t._query === "object" ? t._query : t) as Record<string, unknown>
  const pathObj = q.path
  const pathSegments = (
    pathObj &&
    typeof pathObj === "object" &&
    Array.isArray((pathObj as Record<string, unknown>).segments)
  )
    ? ((pathObj as Record<string, unknown>).segments as unknown[])
    : []
  const filters = Array.isArray(q.filters) ? q.filters.map(normalizeConstraint).filter(Boolean) : []
  const explicitOrderBy = Array.isArray(q.explicitOrderBy)
    ? q.explicitOrderBy.map(normalizeConstraint).filter(Boolean)
    : []
  const limitValue = typeof q.limit === "number" ? q.limit : null
  const collectionGroup = typeof q.collectionGroup === "string" ? q.collectionGroup : null

  return {
    ...base,
    kind: "query",
    pathSegments,
    collectionGroup,
    filters,
    explicitOrderBy,
    limit: limitValue,
  }
}

function getRuntimeContext(): Record<string, unknown> {
  if (typeof window === "undefined") {
    return { runtime: "non-browser", timestamp: new Date().toISOString() }
  }
  return {
    runtime: "browser",
    timestamp: new Date().toISOString(),
    href: window.location.href,
    pathname: window.location.pathname,
  }
}

/**
 * Logs Firestore failures so permission rule mismatches are visible in the devtools console.
 * permission-denied uses console.error; other codes use console.warn.
 */
export function logFirestoreError(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const { code, message, name, stackTop } = getFirebaseErrorFields(error)
  const payload = {
    operation,
    code,
    message,
    errorName: name,
    errorStackTop: stackTop,
    ...getRuntimeContext(),
    ...context,
    auth: getAuthDebugSnapshot(),
  }
  if (code === "permission-denied") {
    console.error("[Firestore permission-denied]", payload)
  } else {
    console.warn("[Firestore]", payload)
  }
}
