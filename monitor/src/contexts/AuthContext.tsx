import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { FirebaseError } from "firebase/app"
import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth"

import { auth, db, ensureAuthPersistence, isFirebaseConfigured } from "@/config/firebase"
import { getFirebaseConfigFormError } from "@/lib/firebase-config-messages"
import { COLLECTIONS } from "@/data/schema"
import type { UserProfile, UserRole } from "@/data/schema"
import { doc, getDoc, serverTimestamp, setDoc } from "@/lib/firebase-firestore"
import { clearAuthDebugSnapshot, setAuthDebugSnapshot } from "@/lib/auth-debug-state"

interface RegisterInput {
  accountType: "student" | "other"
  email: string
  name: string
  password: string
  phone?: string
}

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  authError: string
  login: (email: string, password: string) => Promise<UserProfile>
  register: (input: RegisterInput) => Promise<UserProfile>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_ROLES: UserRole[] = ["client", "admin", "engineer", "technician"]
const AVATAR_COLORS = ["#0891b2", "#db143c", "#2463eb", "#f9bc06", "#7c3aed", "#0f766e"]

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole)
}

function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "Une erreur inattendue est survenue."
  }

  switch ((error as FirebaseError).code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email ou mot de passe incorrect."
    case "auth/email-already-in-use":
      return "Cet email est deja utilise."
    case "auth/weak-password":
      return "Le mot de passe est trop faible."
    case "auth/invalid-email":
      return "Adresse email invalide."
    case "auth/network-request-failed":
      return "Connexion reseau impossible vers Firebase."
    case "auth/too-many-requests":
      return "Trop de tentatives. Reessayez plus tard."
    default:
      return (error as FirebaseError).message || "Une erreur Firebase est survenue."
  }
}

function deriveInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function pickAvatarColor(seed: string): string {
  const value = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return AVATAR_COLORS[value % AVATAR_COLORS.length]
}

function mapUserProfile(uid: string, email: string, data: Record<string, unknown>): UserProfile {
  if (!isUserRole(data.role)) {
    throw new Error("Le role utilisateur dans Firestore est invalide.")
  }

  const name = typeof data.name === "string" && data.name.trim() ? data.name : email
  const organizationId = typeof data.organizationId === "string" && data.organizationId.trim()
    ? data.organizationId
    : undefined

  return {
    id: uid,
    name,
    email,
    role: data.role,
    initials: typeof data.initials === "string" && data.initials.trim()
      ? data.initials
      : deriveInitials(name, email),
    avatarColor: typeof data.avatarColor === "string" && data.avatarColor.trim()
      ? data.avatarColor
      : pickAvatarColor(uid),
    organizationId,
  }
}

function rolePermissions(role: UserRole | null) {
  const isAdmin = role === "admin"
  const isEngineer = role === "engineer"
  const isTechnician = role === "technician"
  const isClient = role === "client"
  return {
    isAdmin,
    isEngineer,
    isTechnician,
    isClient,
    isPlatformStaff: isAdmin || isEngineer || isTechnician,
  }
}

function logAuthDebugState(message: string): void {
  const snapshot = {
    uid: auth?.currentUser?.uid ?? null,
    email: auth?.currentUser?.email ?? null,
  }
  console.info(`[Auth debug] ${message}`, snapshot)
}

async function loadUserProfile(uid: string, email: string): Promise<UserProfile> {
  if (!db) throw new Error(getFirebaseConfigFormError())
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, uid))
  if (!snapshot.exists()) {
    throw new Error("Aucun profil Firestore trouve pour cet utilisateur.")
  }
  return mapUserProfile(uid, email, snapshot.data() as Record<string, unknown>)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthError(getFirebaseConfigFormError())
      setLoading(false)
      return
    }

    let cancelled = false

    ensureAuthPersistence().catch((error) => {
      if (!cancelled) setAuthError(getAuthErrorMessage(error))
    })

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return

      if (!firebaseUser) {
        clearAuthDebugSnapshot()
        logAuthDebugState("signed out")
        setUser(null)
        setLoading(false)
        return
      }

      setAuthDebugSnapshot({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? null,
        permissions: {
          isAuthenticated: true,
          ...rolePermissions(null),
        },
      })
      logAuthDebugState("auth state changed (signed in)")
      try {
        const token = await getIdTokenResult(firebaseUser)
        const tokenRole = typeof token.claims.role === "string" ? token.claims.role : null
        const tokenOrgId =
          typeof token.claims.organizationId === "string" ? token.claims.organizationId : null
        console.info("[Auth debug] token claims", {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? null,
          role: tokenRole,
          organizationId: tokenOrgId,
          hasRoleClaim: tokenRole !== null,
        })
      } catch (tokenError) {
        console.warn("[Auth debug] failed to read token claims", {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? null,
          error: tokenError instanceof Error ? tokenError.message : String(tokenError),
        })
      }

      setLoading(true)

      try {
        const profile = await loadUserProfile(firebaseUser.uid, firebaseUser.email ?? "")
        setAuthDebugSnapshot({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? null,
          role: profile.role,
          organizationId: profile.organizationId ?? null,
          permissions: {
            isAuthenticated: true,
            ...rolePermissions(profile.role),
          },
        })
        console.info("[Auth debug] profile loaded", {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? null,
          role: profile.role,
          organizationId: profile.organizationId ?? null,
          permissions: rolePermissions(profile.role),
        })
        if (cancelled) return
        setUser(profile)
        setAuthError("")
      } catch (error) {
        if (auth) await signOut(auth)
        console.error("[Auth debug] profile load failed", {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? null,
          error: error instanceof Error ? error.message : String(error),
        })
        clearAuthDebugSnapshot()
        if (cancelled) return
        setUser(null)
        setAuthError(error instanceof Error ? error.message : getAuthErrorMessage(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  async function login(email: string, password: string): Promise<UserProfile> {
    if (!auth || !isFirebaseConfigured) throw new Error(getFirebaseConfigFormError())
    setAuthError("")
    await ensureAuthPersistence()
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      logAuthDebugState("login success")
      const profile = await loadUserProfile(credential.user.uid, credential.user.email ?? email.trim())
      setAuthDebugSnapshot({
        uid: credential.user.uid,
        email: credential.user.email ?? null,
        role: profile.role,
        organizationId: profile.organizationId ?? null,
        permissions: {
          isAuthenticated: true,
          ...rolePermissions(profile.role),
        },
      })
      setUser(profile)
      return profile
    } catch (error) {
      const message = getAuthErrorMessage(error)
      setAuthError(message)
      throw new Error(message)
    }
  }

  async function register(input: RegisterInput): Promise<UserProfile> {
    if (!auth || !db || !isFirebaseConfigured) throw new Error(getFirebaseConfigFormError())

    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()
    const phone = input.phone?.trim()

    setAuthError("")
    await ensureAuthPersistence()

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, input.password)
      await updateProfile(credential.user, { displayName: name })

      const profile: Record<string, unknown> = {
        name,
        email,
        role: "client",
        initials: deriveInitials(name, email),
        avatarColor: pickAvatarColor(credential.user.uid),
        accountType: input.accountType,
        createdAt: serverTimestamp(),
      }

      if (phone) profile.phone = phone

      await setDoc(doc(db, COLLECTIONS.users, credential.user.uid), profile)
      const userProfile = mapUserProfile(credential.user.uid, credential.user.email ?? email, profile)
      setAuthDebugSnapshot({
        uid: credential.user.uid,
        email: credential.user.email ?? null,
        role: userProfile.role,
        organizationId: userProfile.organizationId ?? null,
        permissions: {
          isAuthenticated: true,
          ...rolePermissions(userProfile.role),
        },
      })
      console.info("[Auth debug] profile created", {
        uid: credential.user.uid,
        email: credential.user.email ?? null,
        role: userProfile.role,
        organizationId: userProfile.organizationId ?? null,
        permissions: rolePermissions(userProfile.role),
      })
      setUser(userProfile)
      return userProfile
    } catch (error) {
      const message = getAuthErrorMessage(error)
      setAuthError(message)
      throw new Error(message)
    }
  }

  async function logout(): Promise<void> {
    if (!auth) {
      setUser(null)
      return
    }

    await signOut(auth)
    clearAuthDebugSnapshot()
    logAuthDebugState("logout")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
