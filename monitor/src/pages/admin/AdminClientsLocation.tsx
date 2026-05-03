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
      <div className="h-[calc(100vh-64px)] relative bg-slate-200 overflow-hidden">
        <div className="absolute inset-0">
          <ClientMapView clients={clients} selectedId={selectedId} onSelect={onMapSelect} />
        </div>

        {firestoreError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] max-w-xl w-[calc(100%-2rem)] rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            {firestoreError}
          </div>
        )}

        <div className="absolute top-6 left-6 right-6 z-[500] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="bg-white rounded-xl ring-1 ring-black/5 shadow-lg flex items-center w-full sm:max-w-md px-3">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-11 px-3 bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
              placeholder="Rechercher un client, une zone..."
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button className="h-10 px-4 rounded-lg bg-white text-sm font-medium text-slate-700 shadow-md ring-1 ring-black/5 whitespace-nowrap">
              Type de client
            </button>
            <button className="h-10 px-4 rounded-lg bg-white text-sm font-medium text-slate-700 shadow-md ring-1 ring-black/5 whitespace-nowrap">
              Problèmes signalés
            </button>
            <button
              type="button"
              onClick={openNew}
              className="h-10 px-4 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold shadow-md whitespace-nowrap flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add_location</span>
              Ajouter Site
            </button>
          </div>
        </div>

        {selected && Number.isFinite(selected.lat) && Number.isFinite(selected.lng) && (
          <div className="absolute top-24 left-6 z-[500] w-80 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-slate-700 to-slate-500 relative">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1"
                aria-label="Fermer"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white font-bold text-lg">{selected.name}</p>
                <p className="text-slate-200 text-xs">{selected.city}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5">location_on</span>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Coordonnées</p>
                  <p className="text-sm text-slate-700 font-medium">{coordsLabel(selected.lat, selected.lng)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">État</p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    selected.status === "Actif"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {selected.status}
                </span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openEdit(selected)}
                className="py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={removeSelected}
                className="py-2 text-xs font-semibold rounded-lg bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Détails
              </button>
            </div>
          </div>
        )}

        <div className="absolute bottom-8 left-8 z-[500] hidden lg:block">
          <div className="w-72 max-h-64 rounded-xl bg-white ring-1 ring-black/5 shadow-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wide font-bold text-slate-500">Liste Rapide</p>
              <span className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">{filtered.length}</span>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100">
              {filtered.slice(0, 12).map(c => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 ${selectedId === c.id ? "border-l-4 border-[#dc2626] bg-red-50/50" : "border-l-4 border-transparent"}`}
                >
                  <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 truncate">{c.city}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="p-4 text-xs text-center text-slate-500">Aucun client trouvé.</p>
              )}
            </div>
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
            className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
            onSubmit={saveClient}
          >
            <h3 className="font-bold text-slate-900">
              {editingId ? "Modifier le client" : "Nouveau client sur la carte"}
            </h3>
            <div className="space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="text-slate-500">Nom</span>
                <input
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-500">Ville</span>
                <input
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-500">Statut</span>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
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
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-slate-500">Longitude</span>
                  <input
                    required
                    inputMode="decimal"
                    value={formLng}
                    onChange={e => setFormLng(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium"
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
