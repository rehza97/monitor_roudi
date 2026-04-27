import { useEffect, useState } from "react"
import { db, firebaseApp } from "@/config/firebase"
import { COLLECTIONS, type FirestoreAttachment } from "@/data/schema"
import { collection, onSnapshot, query, where } from "@/lib/firebase-firestore"
import { getDownloadURL, getStorage, ref } from "firebase/storage"
import { ORDER_ATTACHMENT_OWNER } from "@/lib/order-attachments"
import { firestoreToMillis } from "@/lib/utils"

type Row = FirestoreAttachment & { id: string; downloadUrl?: string }

function sortByCreatedAtDesc(docs: Row[]): Row[] {
  return [...docs].sort(
    (a, b) => (firestoreToMillis(b.createdAt) ?? 0) - (firestoreToMillis(a.createdAt) ?? 0),
  )
}

export default function OrderAttachmentsList({
  orderId,
  title = "Pièces jointes",
}: {
  orderId: string
  title?: string
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !orderId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, COLLECTIONS.attachments),
      where("ownerId", "==", orderId),
      where("ownerType", "==", ORDER_ATTACHMENT_OWNER),
    )

    const unsub = onSnapshot(q, (snap) => {
      const base: Row[] = sortByCreatedAtDesc(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as FirestoreAttachment),
        })),
      )
      if (base.length === 0) {
        setRows([])
        setLoading(false)
        return
      }
      if (!firebaseApp) {
        setRows(base)
        setLoading(false)
        return
      }
      void (async () => {
        const storage = getStorage(firebaseApp)
        const withUrls = await Promise.all(
          base.map(async (r) => {
            try {
              const url = await getDownloadURL(ref(storage, r.storagePath))
              return { ...r, downloadUrl: url }
            } catch {
              return r
            }
          }),
        )
        setRows(withUrls)
        setLoading(false)
      })()
    })
    return () => unsub()
  }, [orderId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-2">
        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
        Chargement des fichiers…
      </div>
    )
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#db143c] text-[20px]">attach_file</span>
        {title}
      </h3>
      <ul className="space-y-2">
        {rows.map((r) => {
          const isImage =
            (r.contentType && r.contentType.startsWith("image/")) || /\.(png|jpe?g|gif|webp|svg)$/i.test(r.fileName)
          return (
            <li
              key={r.id}
              className="flex items-start gap-3 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20"
            >
              {isImage && r.downloadUrl ? (
                <a
                  href={r.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 size-16 rounded-md overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-100"
                >
                  <img src={r.downloadUrl} alt="" className="size-full object-cover" />
                </a>
              ) : (
                <div className="shrink-0 size-10 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-500 text-[24px]">description</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.fileName}</p>
                {r.contentType && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.contentType}</p>
                )}
                {r.downloadUrl && (
                  <a
                    href={r.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#db143c] font-medium hover:underline inline-flex items-center gap-0.5 mt-1"
                  >
                    Télécharger / ouvrir
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
