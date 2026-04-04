// The installed package is missing the normal package metadata for this entry.
// Import the runtime file directly and bind types from the typed distribution.
// @ts-expect-error No declaration file is shipped for this concrete .mjs path.
import * as FirestoreRuntime from "../../node_modules/@firebase/firestore/dist/index.esm.js"
import type * as FirestoreTypes from "../../node_modules/@firebase/firestore/dist/index"

const Firestore = FirestoreRuntime as typeof FirestoreTypes

export const getFirestore = Firestore.getFirestore
export const doc = Firestore.doc
export const getDoc = Firestore.getDoc
export const collection = Firestore.collection
export const query = Firestore.query
export const where = Firestore.where
export const orderBy = Firestore.orderBy
export const limit = Firestore.limit
export const onSnapshot = Firestore.onSnapshot
export const addDoc = Firestore.addDoc
export const updateDoc = Firestore.updateDoc
export const deleteDoc = Firestore.deleteDoc
export const getDocs = Firestore.getDocs
export const serverTimestamp = Firestore.serverTimestamp
export const setDoc = Firestore.setDoc
export const writeBatch = Firestore.writeBatch
