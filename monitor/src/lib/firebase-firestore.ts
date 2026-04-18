// The installed package is missing the normal package metadata for this entry.
// Import the runtime file directly and bind types from the typed distribution.
// @ts-expect-error No declaration file is shipped for this concrete .mjs path.
import * as FirestoreRuntime from "../../node_modules/@firebase/firestore/dist/index.esm.js"
import type * as FirestoreTypes from "../../node_modules/@firebase/firestore/dist/index"

import { describeFirestoreTarget, labelFirestoreTarget, logFirestoreError } from "./firestore-error-log"
import { COLLECTIONS } from "@/data/schema"
import { getAuthDebugSnapshot } from "@/lib/auth-debug-state"

const Firestore = FirestoreRuntime as typeof FirestoreTypes

export const getFirestore = Firestore.getFirestore
export const doc = Firestore.doc
export const collection = Firestore.collection
export const query = Firestore.query
export const where = Firestore.where
export const orderBy = Firestore.orderBy
export const limit = Firestore.limit
export const serverTimestamp = Firestore.serverTimestamp
export const writeBatch = Firestore.writeBatch

type SnapshotTarget =
  | FirestoreTypes.Query<unknown, FirestoreTypes.DocumentData>
  | FirestoreTypes.DocumentReference<unknown, FirestoreTypes.DocumentData>

type SnapshotForTarget<Target extends SnapshotTarget> =
  Target extends FirestoreTypes.Query<infer AppModelType, infer DbModelType>
    ? FirestoreTypes.QuerySnapshot<AppModelType, DbModelType>
    : Target extends FirestoreTypes.DocumentReference<infer AppModelType, infer DbModelType>
      ? FirestoreTypes.DocumentSnapshot<AppModelType, DbModelType>
      : never

function captureCaller(operation: string): string | null {
  const stack = new Error(`firestore:${operation}`).stack
  if (!stack) return null
  const lines = stack.split("\n").map((line) => line.trim())
  const firstAppLine = lines.find((line) => line.includes("/src/") && !line.includes("firebase-firestore.ts"))
  return firstAppLine ?? lines[2] ?? null
}

function extractRootPath(path: string): string {
  return path.split("/")[0] ?? ""
}

function deriveActivityCategory(path: string): string {
  const root = extractRootPath(path)
  if (root === COLLECTIONS.orders) return "Demandes"
  if (root === COLLECTIONS.users || root === COLLECTIONS.engineers) return "Utilisateurs"
  if (root === COLLECTIONS.inventoryItems) return "Matériels"
  if (root === COLLECTIONS.deployments) return "Applications"
  if (root === COLLECTIONS.invoices) return "Finance"
  return "Autre"
}

function shouldAutoLogActivity(path: string): boolean {
  const root = extractRootPath(path)
  if (!root || root === COLLECTIONS.activityEvents) return false
  const trackedRoots: string[] = [
    COLLECTIONS.orders,
    COLLECTIONS.users,
    COLLECTIONS.engineers,
    COLLECTIONS.inventoryItems,
    COLLECTIONS.deployments,
    COLLECTIONS.invoices,
    COLLECTIONS.supportTickets,
    COLLECTIONS.fieldServiceClients,
    COLLECTIONS.permissionRoleTemplates,
    COLLECTIONS.platformConfig,
  ]
  return trackedRoots.includes(root)
}

function guessEntityLabel(data: unknown): string {
  if (!data || typeof data !== "object") return ""
  const record = data as Record<string, unknown>
  const fields = ["title", "name", "subject", "requestType", "materialName", "email"] as const
  for (const field of fields) {
    const value = record[field]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

async function writeAutoActivityEvent(
  firestore: FirestoreTypes.Firestore,
  operation: "create" | "update" | "delete",
  path: string,
  data?: unknown,
): Promise<void> {
  if (!shouldAutoLogActivity(path)) return
  const snapshot = getAuthDebugSnapshot()
  const root = extractRootPath(path)
  const entityLabel = guessEntityLabel(data)
  const actionLabel = operation === "create" ? "Création" : operation === "update" ? "Mise à jour" : "Suppression"
  const rootLabel =
    root === COLLECTIONS.orders
      ? "commande/demande"
      : root === COLLECTIONS.users
        ? "utilisateur"
        : root === COLLECTIONS.engineers
          ? "ingénieur"
          : root === COLLECTIONS.inventoryItems
            ? "matériel"
            : root === COLLECTIONS.deployments
              ? "déploiement"
              : root === COLLECTIONS.invoices
                ? "facture"
                : root === COLLECTIONS.supportTickets
                  ? "ticket"
                  : "ressource"
  const title = entityLabel
    ? `${actionLabel} ${rootLabel}: ${entityLabel}`
    : `${actionLabel} ${rootLabel}`

  try {
    const eventsRef = Firestore.collection(firestore, COLLECTIONS.activityEvents)
    // Prefer direct SDK call to avoid recursive wrapper logging.
    await Firestore.addDoc(eventsRef, {
      title,
      category: deriveActivityCategory(path),
      actorUserId: snapshot.uid,
      actorName: snapshot.email ?? "Système",
      action: operation,
      path,
      createdAt: Firestore.serverTimestamp(),
      auto: true,
    })
  } catch {
    // Activity logging must never break primary writes.
  }
}

export async function getDoc<
  AppModelType,
  DbModelType extends FirestoreTypes.DocumentData,
>(
  reference: FirestoreTypes.DocumentReference<AppModelType, DbModelType>,
): Promise<FirestoreTypes.DocumentSnapshot<AppModelType, DbModelType>> {
  try {
    return await Firestore.getDoc(reference)
  } catch (e) {
    logFirestoreError("getDoc", e, {
      path: reference.path,
      target: labelFirestoreTarget(reference),
      targetDetails: describeFirestoreTarget(reference),
      caller: captureCaller("getDoc"),
    })
    throw e
  }
}

export async function getDocs<
  AppModelType,
  DbModelType extends FirestoreTypes.DocumentData,
>(
  queryArg: FirestoreTypes.Query<AppModelType, DbModelType>,
): Promise<FirestoreTypes.QuerySnapshot<AppModelType, DbModelType>> {
  try {
    return await Firestore.getDocs(queryArg)
  } catch (e) {
    logFirestoreError("getDocs", e, {
      target: labelFirestoreTarget(queryArg),
      targetDetails: describeFirestoreTarget(queryArg),
      caller: captureCaller("getDocs"),
    })
    throw e
  }
}

/**
 * Wraps SDK onSnapshot so listener errors (e.g. permission-denied) always log to the console.
 * Two-arg listeners get an error handler that only logs; three-arg listeners log then forward.
 */
export function onSnapshot<Target extends SnapshotTarget>(
  target: Target,
  onNext: (snapshot: SnapshotForTarget<Target>) => void,
  onError?: (error: FirestoreTypes.FirestoreError) => void,
): FirestoreTypes.Unsubscribe
export function onSnapshot<Target extends SnapshotTarget>(
  target: Target,
  options: FirestoreTypes.SnapshotListenOptions,
  onNext: (snapshot: SnapshotForTarget<Target>) => void,
  onError?: (error: FirestoreTypes.FirestoreError) => void,
): FirestoreTypes.Unsubscribe
export function onSnapshot(
  ...args: unknown[]
): ReturnType<typeof Firestore.onSnapshot> {
  const target = args[0]

  if (args.length === 2 && typeof args[1] === "function") {
    const onNext = args[1] as (snap: unknown) => void
    return Firestore.onSnapshot(target as never, onNext, (err: unknown) => {
      logFirestoreError("onSnapshot", err, {
        target: labelFirestoreTarget(target),
        targetDetails: describeFirestoreTarget(target),
        caller: captureCaller("onSnapshot"),
      })
    })
  }

  if (
    args.length >= 3 &&
    typeof args[1] === "function" &&
    (typeof args[2] === "function" || args[2] === undefined)
  ) {
    const onNext = args[1] as (snap: unknown) => void
    const userOnError = args[2] as ((e: unknown) => void) | undefined
    return Firestore.onSnapshot(target as never, onNext, (err: unknown) => {
      logFirestoreError("onSnapshot", err, {
        target: labelFirestoreTarget(target),
        targetDetails: describeFirestoreTarget(target),
        caller: captureCaller("onSnapshot"),
      })
      userOnError?.(err)
    })
  }

  if (
    args.length >= 4 &&
    typeof args[2] === "function" &&
    (typeof args[3] === "function" || args[3] === undefined)
  ) {
    const options = args[1]
    const onNext = args[2] as (snap: unknown) => void
    const userOnError = args[3] as ((e: unknown) => void) | undefined
    return Firestore.onSnapshot(target as never, options as never, onNext, (err: unknown) => {
      logFirestoreError("onSnapshot", err, {
        target: labelFirestoreTarget(target),
        targetDetails: describeFirestoreTarget(target),
        caller: captureCaller("onSnapshot"),
      })
      userOnError?.(err)
    })
  }

  return Firestore.onSnapshot(...(args as Parameters<typeof Firestore.onSnapshot>))
}

export async function addDoc<AppModelType>(
  reference: FirestoreTypes.CollectionReference<AppModelType>,
  data: FirestoreTypes.WithFieldValue<AppModelType>,
): Promise<FirestoreTypes.DocumentReference<AppModelType>> {
  try {
    const created = await Firestore.addDoc(reference, data)
    void writeAutoActivityEvent(reference.firestore, "create", created.path, data)
    return created
  } catch (e) {
    logFirestoreError("addDoc", e, {
      path: reference.path,
      target: labelFirestoreTarget(reference),
      targetDetails: describeFirestoreTarget(reference),
      caller: captureCaller("addDoc"),
    })
    throw e
  }
}

export async function setDoc<
  AppModelType,
  DbModelType extends FirestoreTypes.DocumentData,
>(
  reference: FirestoreTypes.DocumentReference<AppModelType, DbModelType>,
  data: FirestoreTypes.WithFieldValue<AppModelType>,
  options?: FirestoreTypes.SetOptions,
): Promise<void> {
  try {
    if (options !== undefined) {
      await Firestore.setDoc(reference, data, options)
    } else {
      await Firestore.setDoc(reference, data)
    }
  } catch (e) {
    logFirestoreError("setDoc", e, {
      path: reference.path,
      target: labelFirestoreTarget(reference),
      targetDetails: describeFirestoreTarget(reference),
      caller: captureCaller("setDoc"),
    })
    throw e
  }
}

export async function updateDoc<
  AppModelType,
  DbModelType extends FirestoreTypes.DocumentData,
>(
  reference: FirestoreTypes.DocumentReference<AppModelType, DbModelType>,
  data: FirestoreTypes.UpdateData<DbModelType>,
): Promise<void> {
  try {
    await Firestore.updateDoc(reference, data)
    void writeAutoActivityEvent(reference.firestore, "update", reference.path, data)
  } catch (e) {
    logFirestoreError("updateDoc", e, {
      path: reference.path,
      target: labelFirestoreTarget(reference),
      targetDetails: describeFirestoreTarget(reference),
      caller: captureCaller("updateDoc"),
    })
    throw e
  }
}

export async function deleteDoc<
  AppModelType,
  DbModelType extends FirestoreTypes.DocumentData,
>(
  reference: FirestoreTypes.DocumentReference<AppModelType, DbModelType>,
): Promise<void> {
  try {
    await Firestore.deleteDoc(reference)
    void writeAutoActivityEvent(reference.firestore, "delete", reference.path)
  } catch (e) {
    logFirestoreError("deleteDoc", e, {
      path: reference.path,
      target: labelFirestoreTarget(reference),
      targetDetails: describeFirestoreTarget(reference),
      caller: captureCaller("deleteDoc"),
    })
    throw e
  }
}
