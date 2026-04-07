import { getFunctions, httpsCallable } from "firebase/functions"
import { firebaseApp } from "@/config/firebase"
import type { UserRole } from "@/data/schema"

export interface ManagedUserCreateInput {
  email: string
  name: string
  role: UserRole
  organizationId?: string | null
}

export interface ManagedUserCreateResult {
  uid: string
  created: boolean
  password?: string | null
}

async function callDevCreate(input: ManagedUserCreateInput): Promise<ManagedUserCreateResult> {
  const res = await fetch("/__dev/firebase/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const json = (await res.json()) as {
    ok?: boolean
    uid?: string
    created?: boolean
    password?: string | null
    error?: string
  }
  if (!res.ok || !json.ok || !json.uid) {
    throw new Error(json.error || "Provisionnement impossible.")
  }
  return {
    uid: json.uid,
    created: Boolean(json.created),
    password: json.password ?? null,
  }
}

async function callDevDelete(uid: string): Promise<void> {
  const res = await fetch("/__dev/firebase/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid }),
  })
  const json = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Suppression impossible.")
  }
}

export async function createManagedUser(input: ManagedUserCreateInput): Promise<ManagedUserCreateResult> {
  if (import.meta.env.DEV) return callDevCreate(input)
  if (!firebaseApp) throw new Error("Firebase app indisponible.")
  const fn = httpsCallable<ManagedUserCreateInput, ManagedUserCreateResult>(
    getFunctions(firebaseApp),
    "createManagedUser",
  )
  const response = await fn(input)
  return response.data
}

export async function deleteManagedUser(uid: string): Promise<void> {
  if (import.meta.env.DEV) {
    await callDevDelete(uid)
    return
  }
  if (!firebaseApp) throw new Error("Firebase app indisponible.")
  const fn = httpsCallable<{ uid: string }, { ok: true }>(getFunctions(firebaseApp), "deleteManagedUser")
  await fn({ uid })
}
