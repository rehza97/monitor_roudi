import { useCallback, useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import ClientMapView, { type MapClientMarker } from "@/components/maps/ClientMapView"
import { adminNav } from "@/lib/nav"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "@/lib/firebase-firestore"

function coordsLabel(lat: number, lng: number) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

function parseClientDoc(id: string, data: Record<string, unknown>): MapClientMarker | null {
  const name = typeof data.name === "string" ? data.name.trim() : ""
  const city = typeof data.city === "string" ? data.city.trim() : ""
  if (!name) return null
  const lat = typeof data.lat === "number" ? data.lat : Number(data.lat)
  const lng = typeof data.lng === "number" ? data.lng : Number(data.lng)
  const status =
    typeof data.status === "string" && data.status.trim() ? data.status.trim() : "Actif"
  return {
    id,
    name,
    city: city || "—",
    status,
    lat: Number.isFinite(lat) ? lat : NaN,
    lng: Number.isFinite(lng) ? lng : NaN,
  }
}

export default function AdminClientsLocation() {
  const [clients, setClients] = useState<MapClientMarker[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [firestoreError, setFirestoreError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formCity, setFormCity] = useState("")
  const [formStatus, setFormStatus] = useState("Actif")
  const [formLat, setFormLat] = useState("36.7538")
  const [formLng, setFormLng] = useState("3.0588")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setFirestoreError("Firebase n’est pas configuré.")
      return
    }

    const ref = collection(db, COLLECTIONS.fieldServiceClients)
    const unsub = onSnapshot(
      ref,
      snap => {
        setFirestoreError(null)
        const rows: MapClientMarker[] = []
        snap.forEach(d => {
          const row = parseClientDoc(d.id, d.data() as Record<string, unknown>)
          if (row) rows.push(row)
        })
        rows.sort((a, b) => a.name.localeCompare(b.name, "fr"))
        setClients(rows)
      },
      err => setFirestoreError(err.message)
    )
    return () => unsub()
  }, [])

  const selected = useMemo(
    () => (selectedId ? clients.find(c => c.id === selectedId) ?? null : null),
    [clients, selectedId]
  )

  const filtered = clients.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase())
  )

  const onMapSelect = useCallback((id: string | null) => {
    setSelectedId(id)
  }, [])

  function openNew() {
    setEditingId(null)
    setFormName("")
    setFormCity("")
    setFormStatus("Actif")
    setFormLat("36.7538")
    setFormLng("3.0588")
    setModalOpen(true)
  }

  function openEdit(c: MapClientMarker) {
    setEditingId(c.id)
    setFormName(c.name)
    setFormCity(c.city === "—" ? "" : c.city)
    setFormStatus(c.status)
    setFormLat(Number.isFinite(c.lat) ? String(c.lat) : "")
    setFormLng(Number.isFinite(c.lng) ? String(c.lng) : "")
    setModalOpen(true)
  }

  async function saveClient(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !isFirebaseConfigured) return
    const name = formName.trim()
    const city = formCity.trim()
    const lat = Number(formLat.replace(",", "."))
    const lng = Number(formLng.replace(",", "."))
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return

    setSaving(true)
    try {
      const payload = {
        name,
        city: city || "—",
        status: formStatus,
        lat,
        lng,
        updatedAt: serverTimestamp(),
      }
      if (editingId) {
        await updateDoc(doc(db, COLLECTIONS.fieldServiceClients, editingId), payload)
      } else {
        await addDoc(collection(db, COLLECTIONS.fieldServiceClients), {
          ...payload,
          createdAt: serverTimestamp(),
        })
      }
      setModalOpen(false)
    } catch (err) {
      setFirestoreError(err instanceof Error ? err.message : "Erreur d’enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  async function removeSelected() {
    if (!db || !selectedId) return
    if (!window.confirm("Supprimer ce client sur la carte ?")) return
    try {
      await deleteDoc(doc(db, COLLECTIONS.fieldServiceClients, selectedId))
      setSelectedId(null)
    } catch (err) {
      setFirestoreError(err instanceof Error ? err.message : "Suppression impossible.")
    }
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Localisation des Clients">
      <div className="flex h-[calc(100vh-64px)]">
        <div className="flex-1 relative bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <ClientMapView clients={clients} selectedId={selectedId} onSelect={onMapSelect} />

          {firestoreError && (
            <div className="absolute top-3 left-3 right-3 z-[500] max-w-md mx-auto rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              {firestoreError}
            </div>
          )}

          <div className="absolute top-3 right-3 z-[500] flex gap-2">
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 rounded-lg bg-[#db143c] text-white text-xs font-semibold px-3 py-2 shadow-lg hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Ajouter
            </button>
          </div>

          {selected && Number.isFinite(selected.lat) && Number.isFinite(selected.lng) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-4 min-w-[240px] max-w-[90vw]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {selected.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{selected.name}</p>
                    <p className="text-xs text-slate-400">{selected.city}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                  aria-label="Fermer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs gap-2">
                <span className="text-slate-400 font-mono">{coordsLabel(selected.lat, selected.lng)}</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    selected.status === "Actif"
                      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {selected.status}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(selected)}
                  className="flex-1 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={removeSelected}
                  className="flex-1 py-2 text-xs font-medium rounded-lg border border-rose-200 text-rose-700 dark:border-rose-900 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-72 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
                search
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                placeholder="Rechercher un client…"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(c => {
              const hasCoords = Number.isFinite(c.lat) && Number.isFinite(c.lng)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    selectedId === c.id ? "bg-rose-50 dark:bg-rose-900/10" : ""
                  }`}
                >
                  <div className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      {c.city}
                      {hasCoords ? ` · ${coordsLabel(c.lat, c.lng)}` : " · Pas de coordonnées"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      c.status === "Actif"
                        ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {c.status}
                  </span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-sm text-center text-slate-400">
                {clients.length === 0
                  ? "Aucun client en base. Ajoutez-en un pour les afficher sur la carte (OpenStreetMap)."
                  : "Aucun client trouvé."}
              </p>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <form
            className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
            onSubmit={saveClient}
          >
            <h3 className="font-bold text-slate-900 dark:text-white">
              {editingId ? "Modifier le client" : "Nouveau client sur la carte"}
            </h3>
            <div className="space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="text-slate-500">Nom</span>
                <input
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-500">Ville</span>
                <input
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-500">Statut</span>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-slate-500">Latitude</span>
                  <input
                    required
                    inputMode="decimal"
                    value={formLat}
                    onChange={e => setFormLat(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-slate-500">Longitude</span>
                  <input
                    required
                    inputMode="decimal"
                    value={formLng}
                    onChange={e => setFormLng(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-[#db143c] text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {saving ? "…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  )
}
