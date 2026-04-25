import { getFunctions, httpsCallable } from "firebase/functions"
import { firebaseApp } from "@/config/firebase"

export interface SubmitBaridiMobPaymentInput {
  invoiceId: string
}

export interface SubmitBaridiMobPaymentResult {
  ok: boolean
  receiptReference: string
  paidAtIso: string
}

export async function submitBaridiMobPayment(
  input: SubmitBaridiMobPaymentInput,
): Promise<SubmitBaridiMobPaymentResult> {
  if (!firebaseApp) {
    throw new Error("Firebase is not configured")
  }

  const fn = httpsCallable<SubmitBaridiMobPaymentInput, SubmitBaridiMobPaymentResult>(
    getFunctions(firebaseApp),
    "submitBaridiMobPayment",
  )
  const response = await fn(input)
  return response.data
}
