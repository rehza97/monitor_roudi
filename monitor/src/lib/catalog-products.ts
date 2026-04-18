export interface CatalogFeature {
  icon: string
  iconBg: string
  iconColor: string
  title: string
  desc: string
}

export interface CatalogHardware {
  icon: string
  name: string
  detail: string
}

export interface CatalogProduct {
  id: string
  slug: string
  name: string
  version: string
  category: string
  categoryColor: string
  icon: string
  iconBg: string
  iconColor: string
  heroBg: string
  tagline: string
  description: string[]
  features: CatalogFeature[]
  hardware: CatalogHardware[]
  price: string
  license: string
  updated: string
  size: string
  uptime: string
  users: string
  supportOS: string[]
  gallery: string[]
  cardBg: string
  image: string
  badge: { label: string; className: string } | null
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
}

function toFeatureArray(value: unknown): CatalogFeature[] {
  if (!Array.isArray(value)) return []
  return value
    .map((raw) => {
      if (typeof raw === "string") {
        const title = raw.trim()
        if (!title) return null
        return {
          icon: "check_circle",
          iconBg: "bg-blue-100 dark:bg-blue-900/30",
          iconColor: "text-blue-600",
          title,
          desc: "",
        } satisfies CatalogFeature
      }
      if (!raw || typeof raw !== "object") return null
      const obj = raw as Record<string, unknown>
      const title = toText(obj.title)
      if (!title) return null
      return {
        icon: toText(obj.icon, "check_circle"),
        iconBg: toText(obj.iconBg, "bg-blue-100 dark:bg-blue-900/30"),
        iconColor: toText(obj.iconColor, "text-blue-600"),
        title,
        desc: toText(obj.desc),
      } satisfies CatalogFeature
    })
    .filter((v): v is CatalogFeature => v !== null)
}

function toHardwareArray(value: unknown): CatalogHardware[] {
  if (!Array.isArray(value)) return []
  return value
    .map((raw) => {
      if (typeof raw === "string") {
        const name = raw.trim()
        if (!name) return null
        return {
          icon: "memory",
          name,
          detail: "",
        } satisfies CatalogHardware
      }
      if (!raw || typeof raw !== "object") return null
      const obj = raw as Record<string, unknown>
      const name = toText(obj.name)
      if (!name) return null
      return {
        icon: toText(obj.icon, "memory"),
        name,
        detail: toText(obj.detail),
      } satisfies CatalogHardware
    })
    .filter((v): v is CatalogHardware => v !== null)
}

const categoryStyles: Record<
  string,
  { categoryColor: string; iconBg: string; iconColor: string; heroBg: string; cardBg: string }
> = {
  devops: {
    categoryColor: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600",
    heroBg: "from-indigo-900 to-slate-900",
    cardBg: "bg-gradient-to-br from-indigo-900 to-slate-900",
  },
  analytics: {
    categoryColor: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600",
    heroBg: "from-blue-900 to-slate-900",
    cardBg: "bg-gradient-to-br from-blue-900 to-slate-900",
  },
  sécurité: {
    categoryColor: "text-slate-600 bg-slate-100 dark:bg-slate-800",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600",
    heroBg: "from-slate-900 to-black",
    cardBg: "bg-gradient-to-br from-slate-900 to-black",
  },
  ecologie: {
    categoryColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600",
    heroBg: "from-emerald-900 to-slate-900",
    cardBg: "bg-gradient-to-br from-emerald-900 to-slate-900",
  },
}

function pickStyle(category: string) {
  const key = category.trim().toLowerCase()
  if (categoryStyles[key]) return categoryStyles[key]
  return {
    categoryColor: "text-violet-600 bg-violet-50 dark:bg-violet-900/20",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600",
    heroBg: "from-violet-900 to-slate-900",
    cardBg: "bg-gradient-to-br from-violet-900 to-slate-900",
  }
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export function parseCatalogProductDoc(id: string, raw: Record<string, unknown>): CatalogProduct {
  const name = toText(raw.name, "Application")
  const slug = toText(raw.slug) || toText(raw.productSlug) || slugify(name || id) || id
  const category = toText(raw.category, "Software")
  const style = pickStyle(category)

  const description = toStringArray(raw.description)
  const features = toFeatureArray(raw.features)
  const hardware = toHardwareArray(raw.hardware)

  const image = toText(raw.image)
  const badgeLabel = toText(raw.badgeLabel)

  return {
    id,
    slug,
    name,
    version: toText(raw.version, "v1.0"),
    category,
    categoryColor: toText(raw.categoryColor, style.categoryColor),
    icon: toText(raw.icon, "deployed_code"),
    iconBg: toText(raw.iconBg, style.iconBg),
    iconColor: toText(raw.iconColor, style.iconColor),
    heroBg: toText(raw.heroBg, style.heroBg),
    tagline: toText(raw.tagline, "Solution logicielle professionnelle."),
    description: description.length > 0 ? description : [toText(raw.shortDescription, "Aucune description disponible.")],
    features,
    hardware,
    price: toText(raw.price, "Sur devis"),
    license: toText(raw.license, "Standard"),
    updated: toText(raw.updated, "—"),
    size: toText(raw.size, "—"),
    uptime: toText(raw.uptime, "—"),
    users: toText(raw.users, "—"),
    supportOS: toStringArray(raw.supportOS),
    gallery: toStringArray(raw.gallery),
    cardBg: toText(raw.cardBg, style.cardBg),
    image,
    badge: badgeLabel
      ? { label: badgeLabel, className: toText(raw.badgeClassName, "bg-white/90 text-slate-800") }
      : null,
  }
}
