// The installed package is missing the normal package metadata for this entry.
// Import the runtime file directly and bind types from the typed distribution.
// @ts-expect-error No declaration file is shipped for this concrete .mjs path.
import * as FirestoreRuntime from "../../node_modules/@firebase/firestore/dist/index.node.mjs"
import type * as FirestoreTypes from "../../node_modules/@firebase/firestore/dist/index"

const Firestore = FirestoreRuntime as typeof FirestoreTypes

export const getFirestore = Firestore.getFirestore
export const doc = Firestore.doc
export const getDoc = Firestore.getDoc
export const serverTimestamp = Firestore.serverTimestamp
export const setDoc = Firestore.setDoc
