import { getFunctions, httpsCallable } from "firebase/functions"
import { getStorage, ref, uploadBytes } from "firebase/storage"
import { firebaseApp } from "@/config/firebase"

/** `attachments` + backend use this value for `ownerId` = Firestore `orders` doc id */
export const ORDER_ATTACHMENT_OWNER = "order" as const

const MAX_FILE_BYTES = 20 * 1024 * 1024

export function sanitizeOrderFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file"
  return base.replace(/[^\w.()\-\s@]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 180) || "file"
}

function assertAllowedFile(file: File) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`Fichier trop volumineux (max. ${MAX_FILE_BYTES / 1024 / 1024} Mo) : ${file.name}`)
  }
}

/**
 * Uploads one file to Storage under `organizations/{orgId}/orders/{orderId}/…` then
 * registers a row via the `createAttachmentRecord` Cloud Function.
 */
export async function uploadAndRegisterOrderAttachment(params: {
  organizationId: string
  orderId: string
  file: File
}): Promise<void> {
  const { organizationId, orderId, file } = params
  assertAllowedFile(file)
  if (!firebaseApp) {
    throw new Error("Firebase n'est pas configuré.")
  }
  const storage = getStorage(firebaseApp)
  const safe = sanitizeOrderFileName(file.name)
  const unique = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
  const storagePath = `organizations/${organizationId}/orders/${orderId}/${unique}_${safe}`
  const sref = ref(storage, storagePath)
  const contentType = file.type || "application/octet-stream"
  await uploadBytes(sref, file, { contentType })
  const fn = httpsCallable<
    {
      ownerType: string
      ownerId: string
      fileName: string
      contentType: string
      storagePath: string
      organizationId: string
    },
    { id: string }
  >(getFunctions(firebaseApp), "createAttachmentRecord")
  await fn({
    ownerType: ORDER_ATTACHMENT_OWNER,
    ownerId: orderId,
    fileName: safe,
    contentType,
    storagePath,
    organizationId,
  })
}

export async function uploadAllOrderAttachments(
  organizationId: string,
  orderId: string,
  files: File[],
  onFileProgress?: (index: number, total: number) => void,
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    onFileProgress?.(i + 1, files.length)
    await uploadAndRegisterOrderAttachment({ organizationId, orderId, file: files[i]! })
  }
}
