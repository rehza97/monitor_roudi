// The installed package is missing the normal package metadata for this entry.
// Import the runtime file directly and bind types from the typed distribution.
// @ts-expect-error No declaration file is shipped for this concrete .mjs path.
import * as FirestoreRuntime from "../../node_modules/@firebase/firestore/dist/index.esm.js"
import type * as FirestoreTypes from "../../node_modules/@firebase/firestore/dist/index"

import { describeFirestoreTarget, labelFirestoreTarget, logFirestoreError } from "./firestore-error-log"

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

function captureCaller(operation: string): string | null {
  const stack = new Error(`firestore:${operation}`).stack
  if (!stack) return null
  const lines = stack.split("\n").map((line) => line.trim())
  const firstAppLine = lines.find((line) => line.includes("/src/") && !line.includes("firebase-firestore.ts"))
  return firstAppLine ?? lines[2] ?? null
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
export function onSnapshot(
  ...args: Parameters<typeof Firestore.onSnapshot>
): ReturnType<typeof Firestore.onSnapshot> {
  const target = args[0]

  if (args.length === 2) {
    const onNext = args[1] as (snap: unknown) => void
    return Firestore.onSnapshot(target as never, onNext, (err: unknown) => {
      logFirestoreError("onSnapshot", err, {
        target: labelFirestoreTarget(target),
        targetDetails: describeFirestoreTarget(target),
        caller: captureCaller("onSnapshot"),
      })
    })
  }

  if (args.length >= 3) {
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

  return Firestore.onSnapshot(...args)
}

export async function addDoc<AppModelType>(
  reference: FirestoreTypes.CollectionReference<AppModelType>,
  data: FirestoreTypes.WithFieldValue<AppModelType>,
): Promise<FirestoreTypes.DocumentReference<AppModelType>> {
  try {
    return await Firestore.addDoc(reference, data)
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
