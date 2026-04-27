import React, { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db, firebaseApp } from "@/config/firebase"
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
import { parseCatalogProductDoc, type CatalogProduct, type CatalogFeature, type CatalogHardware } from "@/lib/catalog-products"
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage"

type CatalogDoc = CatalogProduct & {
  createdAt?: unknown
  updatedAt?: unknown
}

const DESCRIPTION_PLACEHOLDER = "Aucune description disponible."

interface FormState {
  name: string
  slug: string
  category: string
  version: string
  icon: string
  tagline: string
  image: string
  price: string
  license: string
  updated: string
  size: string
  uptime: string
  users: string
  supportOSText: string
  badgeLabel: string
  badgeClassName: string
  descriptionText: string
  galleryText: string
  featuresText: string
  hardwareText: string
}

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  category: "",
  version: "v1.0",
  icon: "deployed_code",
  tagline: "",
  image: "",
  price: "Sur devis",
  license: "Standard",
  updated: "",
  size: "",
  uptime: "",
  users: "",
  supportOSText: "",
  badgeLabel: "",
  badgeClassName: "bg-white/90 text-slate-800",
  descriptionText: "",
  galleryText: "",
  featuresText: "",
  hardwareText: "",
}

function normalizeLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function toFormState(docData: CatalogDoc): FormState {
  return {
    name: docData.name ?? "",
    slug: docData.slug ?? "",
    category: docData.category ?? "",
    version: docData.version ?? "v1.0",
    icon: docData.icon ?? "deployed_code",
    tagline: docData.tagline ?? "",
    image: docData.image ?? "",
    price: docData.price ?? "Sur devis",
    license: docData.license ?? "Standard",
    updated: docData.updated ?? "",
    size: docData.size ?? "",
    uptime: docData.uptime ?? "",
    users: docData.users ?? "",
    supportOSText: (docData.supportOS ?? []).join("\n"),
    badgeLabel: docData.badge?.label ?? "",
    badgeClassName: docData.badge?.className ?? "bg-white/90 text-slate-800",
    descriptionText: (docData.description ?? [])
      .filter((line) => line && line !== DESCRIPTION_PLACEHOLDER)
      .join("\n"),
    galleryText: (docData.gallery ?? []).join("\n"),
    featuresText: (docData.features ?? []).map((f) => f.title).join("\n"),
    hardwareText: (docData.hardware ?? []).map((h) => h.name).join("\n"),
  }
}

function mergeFeatures(lines: string[], existing: CatalogFeature[]): CatalogFeature[] {
  const byTitle = new Map(existing.map((f) => [f.title, f]))
  return lines.map((title) => {
    const prev = byTitle.get(title)
    return prev ?? {
      icon: "check_circle",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600",
      title,
      desc: "",
    }
  })
}

function mergeHardware(lines: string[], existing: CatalogHardware[]): CatalogHardware[] {
  const byName = new Map(existing.map((h) => [h.name, h]))
  return lines.map((name) => {
    const prev = byName.get(name)
    return prev ?? { icon: "memory", name, detail: "" }
  })
}

const CATEGORIES = ["DevOps", "Sécurité", "Réseau", "IoT", "Monitoring", "Analytics", "Cloud", "IA / ML", "Autre"]
const LICENSES = ["Standard", "Pro", "Entreprise", "Open Source", "Sur devis"]
const PRICES = ["Sur devis", "Gratuit", "Freemium", "Abonnement mensuel", "Abonnement annuel", "Achat unique"]
const TAGLINE_OPTIONS = [
  "Supervision temps réel et alertes intelligentes.",
  "Plateforme unifiée pour pilotage applicatif.",
  "Sécurité renforcée pour vos infrastructures critiques.",
  "Analyse avancée et tableaux de bord décisionnels.",
  "Automatisation des opérations IT à grande échelle.",
]
const BADGE_LABEL_OPTIONS = ["Nouveau", "Populaire", "Recommandé", "Entreprise", "Bêta", "Mise à jour"]
const BADGE_CLASS_OPTIONS = [
  "bg-white/90 text-slate-800",
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
]
const MATERIAL_ICONS = [
  "deployed_code",
  "dashboard",
  "monitoring",
  "analytics",
  "security",
  "shield_lock",
  "cloud",
  "router",
  "dns",
  "database",
  "memory",
  "terminal",
  "api",
  "bolt",
  "smart_toy",
  "settings_suggest",
]

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="size-8 rounded-lg bg-[#db143c]/10 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[18px] text-[#db143c]">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex items-baseline gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
      {children}
      {hint && <span className="normal-case font-normal text-slate-400 tracking-normal">{hint}</span>}
    </label>
  )
}

const inputCls =
  "w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#db143c]/40 focus:border-[#db143c] transition"
const selectCls =
  "w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#db143c]/40 focus:border-[#db143c] transition appearance-none cursor-pointer"
const textareaCls =
  "w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#db143c]/40 focus:border-[#db143c] transition leading-relaxed"

function AppEditorModal({
  open,
  initial,
  isEdit,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  initial: FormState
  isEdit: boolean
  saving: boolean
  onClose: () => void
  onSave: (
    payload: FormState,
    imageFile: File | null,
    galleryFiles: File[],
    keptGalleryUrls: string[],
    removeMainImage: boolean,
  ) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeMainImage, setRemoveMainImage] = useState(false)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  const [keptGalleryUrls, setKeptGalleryUrls] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setForm(initial)
    setImageFile(null)
    setImagePreview(null)
    setRemoveMainImage(false)
    setGalleryFiles([])
    setGalleryPreviews([])
    setKeptGalleryUrls(normalizeLines(initial.galleryText))
  }, [initial, open])

  if (!open) return null

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleNameChange(value: string) {
    set("name", value)
    if (!isEdit || !form.slug) {
      const auto = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
      set("slug", auto)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setRemoveMainImage(false)
    if (file) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    } else {
      setImagePreview(null)
    }
  }

  function clearMainImage() {
    setImageFile(null)
    setImagePreview(null)
    setRemoveMainImage(true)
  }

  function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setGalleryFiles((prev) => [...prev, ...files])
    setGalleryPreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))])
    e.target.value = ""
  }

  function removeKeptGalleryUrl(url: string) {
    setKeptGalleryUrls((prev) => prev.filter((u) => u !== url))
  }

  function removePendingGalleryFile(idx: number) {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== idx))
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!window.confirm("Supprimer cette application du catalogue ?")) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  const displayImage = imagePreview || (removeMainImage ? null : form.image) || null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800">

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="size-9 rounded-xl bg-[#db143c] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[20px]">
              {isEdit ? "edit" : "add_circle"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
              {isEdit ? "Modifier l'application" : "Nouvelle application catalogue"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Édition de "${form.name}"` : "Remplissez les informations de l'application"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <form
          className="overflow-y-auto flex-1 p-6 space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            void onSave(form, imageFile, galleryFiles, keptGalleryUrls, removeMainImage)
          }}
        >

          {/* Section 1 — Identité */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-5">
            <SectionHeader icon="fingerprint" title="Identité" subtitle="Nom, slug et catégorie" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FieldLabel>Nom de l'application <span className="text-[#db143c]">*</span></FieldLabel>
                <input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="Ex: SecureGate API"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel hint="(auto-généré)">Slug</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">/</span>
                  <input
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    placeholder="securegate-api"
                    className={`${inputCls} pl-6`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Version</FieldLabel>
                <input
                  value={form.version}
                  onChange={(e) => set("version", e.target.value)}
                  placeholder="v1.0"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Catégorie</FieldLabel>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Sélectionner…</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <FieldLabel>Icône Material</FieldLabel>
                <div className="flex gap-2 items-center">
                  <div className="size-10 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#db143c] text-[20px]">
                      {form.icon || "deployed_code"}
                    </span>
                  </div>
                  <div className="relative w-full">
                    <select
                    value={form.icon}
                    onChange={(e) => set("icon", e.target.value)}
                    className={selectCls}
                  >
                    {form.icon && !MATERIAL_ICONS.includes(form.icon) ? (
                      <option value={form.icon}>{form.icon}</option>
                    ) : null}
                    {MATERIAL_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 — Présentation */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-5">
            <SectionHeader icon="campaign" title="Présentation" subtitle="Tagline et badge" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FieldLabel>Tagline</FieldLabel>
                <div className="relative">
                  <select
                  value={form.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Sélectionner…</option>
                  {form.tagline && !TAGLINE_OPTIONS.includes(form.tagline) ? (
                    <option value={form.tagline}>{form.tagline}</option>
                  ) : null}
                  {TAGLINE_OPTIONS.map((tagline) => (
                    <option key={tagline} value={tagline}>
                      {tagline}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <FieldLabel>Label du badge</FieldLabel>
                <div className="relative">
                  <select
                  value={form.badgeLabel}
                  onChange={(e) => set("badgeLabel", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Aucun badge</option>
                  {form.badgeLabel && !BADGE_LABEL_OPTIONS.includes(form.badgeLabel) ? (
                    <option value={form.badgeLabel}>{form.badgeLabel}</option>
                  ) : null}
                  {BADGE_LABEL_OPTIONS.map((badge) => (
                    <option key={badge} value={badge}>
                      {badge}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <FieldLabel>Classes CSS du badge</FieldLabel>
                <div className="flex gap-2 items-center">
                  {form.badgeLabel && (
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${form.badgeClassName}`}>
                      {form.badgeLabel}
                    </span>
                  )}
                  <div className="relative w-full">
                    <select
                    value={form.badgeClassName}
                    onChange={(e) => set("badgeClassName", e.target.value)}
                    className={selectCls}
                  >
                    {form.badgeClassName && !BADGE_CLASS_OPTIONS.includes(form.badgeClassName) ? (
                      <option value={form.badgeClassName}>{form.badgeClassName}</option>
                    ) : null}
                    {BADGE_CLASS_OPTIONS.map((badgeClass) => (
                      <option key={badgeClass} value={badgeClass}>
                        {badgeClass}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 — Tarification & Licence */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-5">
            <SectionHeader icon="sell" title="Tarification & Licence" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Prix</FieldLabel>
                <div className="relative">
                  <select value={form.price} onChange={(e) => set("price", e.target.value)} className={selectCls}>
                    {PRICES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <FieldLabel>Licence</FieldLabel>
                <div className="relative">
                  <select value={form.license} onChange={(e) => set("license", e.target.value)} className={selectCls}>
                    {LICENSES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 — Statistiques */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-5">
            <SectionHeader icon="bar_chart" title="Statistiques & Méta" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {([
                { key: "uptime", label: "Uptime", placeholder: "99.9%", icon: "check_circle" },
                { key: "users", label: "Utilisateurs", placeholder: "2 100", icon: "group" },
                { key: "size", label: "Taille", placeholder: "32 MB", icon: "storage" },
                { key: "updated", label: "Dernière MàJ", placeholder: "18 avril 2026", icon: "schedule" },
              ] as const).map(({ key, label, placeholder, icon }) => (
                <div key={key}>
                  <FieldLabel>{label}</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-[16px]">{icon}</span>
                    <input
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={placeholder}
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5 — Médias */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-5">
            <SectionHeader icon="photo_library" title="Médias" subtitle="Image principale et galerie" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <FieldLabel>Image principale</FieldLabel>
                <div className="relative">
                  <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/40 cursor-pointer hover:border-[#db143c]/50 hover:bg-[#db143c]/5 transition group overflow-hidden">
                    {displayImage ? (
                      <img src={displayImage} alt="preview" className="h-full w-full object-contain rounded-xl p-1" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-[#db143c]/60 text-[32px] transition">cloud_upload</span>
                        <span className="text-xs text-slate-400 group-hover:text-slate-600 transition">
                          PNG, JPEG, WEBP, SVG
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {displayImage && (
                    <button
                      type="button"
                      onClick={clearMainImage}
                      title="Retirer l'image"
                      className="absolute top-1.5 right-1.5 size-6 rounded-full bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:text-rose-600 hover:border-rose-300 shadow-sm transition"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>
                {imageFile && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {imageFile.name}
                  </p>
                )}
                {!imageFile && !removeMainImage && form.image && (
                  <p className="text-xs text-slate-400 mt-1.5">Image actuelle conservée.</p>
                )}
                {removeMainImage && !imageFile && (
                  <p className="text-xs text-rose-500 mt-1.5">Image actuelle sera supprimée à l'enregistrement.</p>
                )}
              </div>
              <div>
                <FieldLabel>Galerie (upload multiple)</FieldLabel>
                <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/40 cursor-pointer hover:border-[#db143c]/50 hover:bg-[#db143c]/5 transition group">
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-[#db143c]/60 text-[32px] transition">upload_file</span>
                  <span className="text-xs text-slate-400 group-hover:text-slate-600 transition">
                    PNG, JPEG, WEBP, SVG (plusieurs images)
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    multiple
                    onChange={handleGalleryChange}
                    className="hidden"
                  />
                </label>
                {(keptGalleryUrls.length > 0 || galleryPreviews.length > 0) && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {keptGalleryUrls.map((url) => (
                      <div key={`kept-${url}`} className="relative h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group">
                        <img src={url} alt="gallery" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeKeptGalleryUrl(url)}
                          title="Retirer cette image"
                          className="absolute top-1 right-1 size-5 rounded-full bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:text-rose-600 hover:border-rose-300 shadow-sm opacity-0 group-hover:opacity-100 transition"
                        >
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      </div>
                    ))}
                    {galleryPreviews.map((src, idx) => (
                      <div key={`new-${idx}-${src}`} className="relative h-16 rounded-lg overflow-hidden border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 group">
                        <img src={src} alt={`preview-${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePendingGalleryFile(idx)}
                          title="Retirer ce fichier"
                          className="absolute top-1 right-1 size-5 rounded-full bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:text-rose-600 hover:border-rose-300 shadow-sm opacity-0 group-hover:opacity-100 transition"
                        >
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1.5">
                  {keptGalleryUrls.length} existante{keptGalleryUrls.length > 1 ? "s" : ""}
                  {galleryFiles.length > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {" "}+ {galleryFiles.length} nouvelle{galleryFiles.length > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Section 6 — Contenu */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-5">
            <SectionHeader icon="article" title="Contenu" subtitle="Description, fonctionnalités, compatibilité" />
            <div className="space-y-4">
              <div>
                <FieldLabel hint="(1 ligne = 1 paragraphe)">Description</FieldLabel>
                <textarea
                  value={form.descriptionText}
                  onChange={(e) => set("descriptionText", e.target.value)}
                  rows={4}
                  placeholder="Décrivez l'application en quelques lignes…"
                  className={textareaCls}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FieldLabel hint="(1 titre par ligne)">Fonctionnalités</FieldLabel>
                  <textarea
                    value={form.featuresText}
                    onChange={(e) => set("featuresText", e.target.value)}
                    rows={5}
                    placeholder={"Authentification SSO\nChiffrement AES-256\nAPI REST"}
                    className={textareaCls}
                  />
                </div>
                <div>
                  <FieldLabel hint="(1 nom par ligne)">Matériels compatibles</FieldLabel>
                  <textarea
                    value={form.hardwareText}
                    onChange={(e) => set("hardwareText", e.target.value)}
                    rows={5}
                    placeholder={"Raspberry Pi 4\nJetson Nano\nArduino"}
                    className={textareaCls}
                  />
                </div>
                <div>
                  <FieldLabel hint="(1 OS par ligne)">OS supportés</FieldLabel>
                  <textarea
                    value={form.supportOSText}
                    onChange={(e) => set("supportOSText", e.target.value)}
                    rows={5}
                    placeholder={"Windows\nLinux\nmacOS\nAndroid\niOS"}
                    className={textareaCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 mt-2">
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={saving || deleting}
                className="flex items-center gap-1.5 px-4 h-10 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 transition"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-5 h-10 rounded-lg bg-[#db143c] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? (
                <>
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">{isEdit ? "save" : "add_circle"}</span>
                  {isEdit ? "Enregistrer" : "Créer l'application"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminCatalogApps() {
  const [apps, setApps] = useState<CatalogDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [editing, setEditing] = useState<CatalogDoc | null>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const unsub = onSnapshot(collection(db, COLLECTIONS.catalogProducts), (snap) => {
      const rows = snap.docs
        .map((d) => parseCatalogProductDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      setApps(rows)
      setLoading(false)
    })
    return unsub
  }, [])

  const initialForm = useMemo(() => {
    if (!editing) return EMPTY_FORM
    return toFormState(editing)
  }, [editing])

  async function uploadCatalogImage(imageFile: File, slug: string) {
    if (!firebaseApp) {
      throw new Error("Firebase n'est pas configuré pour l'upload d'image.")
    }
    const storage = getStorage(firebaseApp)
    const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `catalog_products/${slug || "app"}/${Date.now()}-${safeName}`
    const imageRef = ref(storage, storagePath)
    const sizeKb = (imageFile.size / 1024).toFixed(1)
    console.info(`[catalog-upload] → start ${storagePath} (${sizeKb} KB, ${imageFile.type || "?"})`)
    const t0 = performance.now()
    try {
      await uploadBytes(imageRef, imageFile)
      const url = await getDownloadURL(imageRef)
      console.info(`[catalog-upload] ✓ done ${storagePath} in ${(performance.now() - t0).toFixed(0)}ms`)
      return url
    } catch (err) {
      console.error(`[catalog-upload] ✗ failed ${storagePath} after ${(performance.now() - t0).toFixed(0)}ms`, err)
      throw err
    }
  }

  async function handleSave(
    payload: FormState,
    imageFile: File | null,
    galleryFiles: File[],
    keptGalleryUrls: string[],
    removeMainImage: boolean,
  ) {
    if (!db) return
    setSaving(true)
    setSaveError("")
    const tStart = performance.now()
    try {
      const normalizedSlug =
        payload.slug.trim() ||
        payload.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") ||
        `app-${Date.now()}`

      console.group(`[catalog-save] ${editing ? "UPDATE" : "CREATE"} "${payload.name}" (slug=${normalizedSlug})`)
      console.info("payload preview", {
        hasNewImage: Boolean(imageFile),
        removeMainImage,
        keepGalleryUrls: keptGalleryUrls.length,
        newGalleryFiles: galleryFiles.length,
        descriptionLines: normalizeLines(payload.descriptionText).length,
        featureLines: normalizeLines(payload.featuresText).length,
        hardwareLines: normalizeLines(payload.hardwareText).length,
      })

      let imageUrl = payload.image.trim()
      if (imageFile) {
        imageUrl = await uploadCatalogImage(imageFile, normalizedSlug)
      } else if (removeMainImage) {
        console.info("[catalog-save] main image marked for removal")
        imageUrl = ""
      } else {
        console.info("[catalog-save] keeping existing main image")
      }

      console.info(`[catalog-save] uploading ${galleryFiles.length} gallery file(s)`)
      const uploadedGallery = await Promise.all(
        galleryFiles.map((file) => uploadCatalogImage(file, `${normalizedSlug}/gallery`))
      )
      const finalGallery = [...keptGalleryUrls, ...uploadedGallery]

      const featureLines = normalizeLines(payload.featuresText)
      const hardwareLines = normalizeLines(payload.hardwareText)
      const descriptionLines = normalizeLines(payload.descriptionText)

      const data: Record<string, unknown> = {
        name: payload.name.trim(),
        slug: normalizedSlug,
        category: payload.category.trim() || "Software",
        version: payload.version.trim() || "v1.0",
        icon: payload.icon.trim() || "deployed_code",
        tagline: payload.tagline.trim(),
        image: imageUrl,
        price: payload.price.trim() || "Sur devis",
        license: payload.license.trim() || "Standard",
        updated: payload.updated.trim(),
        size: payload.size.trim(),
        uptime: payload.uptime.trim(),
        users: payload.users.trim(),
        supportOS: normalizeLines(payload.supportOSText),
        badgeLabel: payload.badgeLabel.trim(),
        badgeClassName: payload.badgeClassName.trim() || "bg-white/90 text-slate-800",
        description: descriptionLines,
        gallery: finalGallery,
        features: mergeFeatures(featureLines, editing?.features ?? []),
        hardware: mergeHardware(hardwareLines, editing?.hardware ?? []),
        updatedAt: serverTimestamp(),
      }

      if (editing) {
        console.info(`[catalog-save] updateDoc catalog_products/${editing.id}`)
        await updateDoc(doc(db, COLLECTIONS.catalogProducts, editing.id), data)
      } else {
        console.info("[catalog-save] addDoc catalog_products")
        const ref = await addDoc(collection(db, COLLECTIONS.catalogProducts), {
          ...data,
          createdAt: serverTimestamp(),
        })
        console.info(`[catalog-save] created doc id=${ref.id}`)
      }
      console.info(`[catalog-save] ✓ total ${(performance.now() - tStart).toFixed(0)}ms`)
      console.groupEnd()
      setShowModal(false)
      setEditing(null)
    } catch (err) {
      console.error(`[catalog-save] ✗ failed after ${(performance.now() - tStart).toFixed(0)}ms`, err)
      console.groupEnd()
      setSaveError(err instanceof Error ? err.message : "Impossible d'enregistrer l'application.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!db || !editing) return
    await deleteDoc(doc(db, COLLECTIONS.catalogProducts, editing.id))
    setShowModal(false)
    setEditing(null)
  }

  function openCreate() {
    setEditing(null)
    setShowModal(true)
  }

  function openEdit(app: CatalogDoc) {
    setEditing(app)
    setShowModal(true)
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Catalogue Applications">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {apps.length} application{apps.length !== 1 ? "s" : ""} dans `catalog_products`
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Ajouter une app
          </button>
        </div>
        {saveError ? (
          <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300">
            {saveError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))
          ) : apps.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14 text-center text-slate-500">
              Aucune application. Ajoutez la première entrée du catalogue.
            </div>
          ) : (
            apps.map((app) => (
              <button
                key={app.id}
                onClick={() => openEdit(app)}
                className="text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-[#db143c]/40 transition-colors"
              >
                {app.image ? (
                  <div className="h-36 w-full bg-slate-100 dark:bg-slate-800">
                    <img src={app.image} alt={app.name} className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={`size-10 rounded-lg ${app.iconBg} ${app.iconColor} flex items-center justify-center`}>
                      <span className="material-symbols-outlined">{app.icon}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {app.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{app.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">/{app.slug}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">{app.tagline}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{app.version}</span>
                    <span>{app.price}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <AppEditorModal
        open={showModal}
        initial={initialForm}
        isEdit={Boolean(editing)}
        saving={saving}
        onClose={() => {
          setShowModal(false)
          setEditing(null)
          setSaveError("")
        }}
        onSave={handleSave}
        onDelete={editing ? handleDelete : undefined}
      />
    </DashboardLayout>
  )
}
