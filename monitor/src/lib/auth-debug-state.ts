import type { UserRole } from "@/data/schema"

export interface AuthDebugSnapshot {
  uid: string | null
  email: string | null
  role: UserRole | null
  organizationId: string | null
  permissions: {
    isAuthenticated: boolean
    isAdmin: boolean
    isEngineer: boolean
    isTechnician: boolean
    isClient: boolean
    isPlatformStaff: boolean
  }
}

let authDebugSnapshot: AuthDebugSnapshot = {
  uid: null,
  email: null,
  role: null,
  organizationId: null,
  permissions: {
    isAuthenticated: false,
    isAdmin: false,
    isEngineer: false,
    isTechnician: false,
    isClient: false,
    isPlatformStaff: false,
  },
}

export function setAuthDebugSnapshot(next: Partial<AuthDebugSnapshot>): void {
  authDebugSnapshot = {
    ...authDebugSnapshot,
    ...next,
    permissions: {
      ...authDebugSnapshot.permissions,
      ...(next.permissions ?? {}),
    },
  }
}

export function clearAuthDebugSnapshot(): void {
  authDebugSnapshot = {
    uid: null,
    email: null,
    role: null,
    organizationId: null,
    permissions: {
      isAuthenticated: false,
      isAdmin: false,
      isEngineer: false,
      isTechnician: false,
      isClient: false,
      isPlatformStaff: false,
    },
  }
}

export function getAuthDebugSnapshot(): AuthDebugSnapshot {
  return authDebugSnapshot
}
