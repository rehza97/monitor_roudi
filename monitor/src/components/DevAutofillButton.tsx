import { toast } from "sonner"

/** Same value every time so login/tests stay predictable; other fields still randomize. */
const DEV_AUTOFILL_PASSWORD = "RoudiDev#2026!"

const REAL_PROFILES = [
  {
    firstName: "Amine",
    lastName: "Benkhaled",
    fullName: "Amine Benkhaled",
    email: "amine.benkhaled@roudi.dz",
    phone: "+213 555 12 34 56",
    city: "Alger",
  },
  {
    firstName: "Nour",
    lastName: "Mebarki",
    fullName: "Nour Mebarki",
    email: "nour.mebarki@roudi.dz",
    phone: "+213 661 44 22 10",
    city: "Oran",
  },
  {
    firstName: "Yacine",
    lastName: "Mansouri",
    fullName: "Yacine Mansouri",
    email: "yacine.mansouri@roudi.dz",
    phone: "+213 770 09 88 11",
    city: "Constantine",
  },
] as const

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    el.getClientRects().length > 0
  )
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = Object.getPrototypeOf(el)
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value")
  if (descriptor?.set) {
    descriptor.set.call(el, value)
  } else {
    el.value = value
  }
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

function setNativeChecked(el: HTMLInputElement, checked: boolean): void {
  const proto = Object.getPrototypeOf(el)
  const descriptor = Object.getOwnPropertyDescriptor(proto, "checked")
  if (descriptor?.set) {
    descriptor.set.call(el, checked)
  } else {
    el.checked = checked
  }
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

function guessInputValue(input: HTMLInputElement, mode: "real" | "random"): string {
  const key = `${input.name} ${input.id} ${input.placeholder} ${input.ariaLabel ?? ""}`.toLowerCase()
  const type = input.type.toLowerCase()
  const profile = pickRandom(REAL_PROFILES)
  const randomEmail = `user.${randomDigits(6)}@example.com`
  const randomPhone = `+213 ${randomDigits(3)} ${randomDigits(2)} ${randomDigits(2)} ${randomDigits(2)}`

  if (
    type === "password" ||
    key.includes("password") ||
    key.includes("passwd") ||
    key.includes("mot de passe") ||
    key.includes("confirm-pass") ||
    (key.includes("confirm") && key.includes("pass"))
  ) {
    return DEV_AUTOFILL_PASSWORD
  }

  if (type === "email" || key.includes("email")) return mode === "random" ? randomEmail : profile.email
  if (type === "url" || key.includes("url")) return "https://dev.rodaina.local"
  if (type === "number") return key.includes("qty") || key.includes("quant") ? "5" : "10"
  if (key.includes("phone") || key.includes("tel")) return mode === "random" ? randomPhone : profile.phone
  if (key.includes("first") || key.includes("prenom")) return profile.firstName
  if (key.includes("last") || key.includes("family") || key.includes("nom")) return profile.lastName
  if (key.includes("city")) return mode === "random" ? pickRandom(["Alger", "Oran", "Sétif", "Blida"]) : profile.city
  if (key.includes("name")) return profile.fullName
  if (key.includes("sku")) return "SKU-DEV-001"
  if (key.includes("budget")) return "120000 DA"
  if (key.includes("timeline") || key.includes("délai") || key.includes("delai")) return "2 semaines"
  if (key.includes("lat")) return "36.7538"
  if (key.includes("lng") || key.includes("lon")) return "3.0588"
  if (key.includes("search")) return "test"
  if (type === "date") return "2026-04-07"
  if (type === "time") return "10:30"
  return "Dev value"
}

function fillVisibleForms(mode: "real" | "random"): { forms: number; fields: number } {
  const forms = Array.from(document.querySelectorAll("form")).filter((f) => isVisible(f as HTMLElement))
  let fieldsUpdated = 0

  for (const form of forms) {
    const fields = Array.from(form.querySelectorAll("input, textarea, select")) as Array<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
    for (const field of fields) {
      if (!isVisible(field as HTMLElement) || field.disabled) continue

      if (field instanceof HTMLInputElement) {
        const type = field.type.toLowerCase()
        if (["hidden", "submit", "button", "reset", "image", "file"].includes(type)) continue
        if (type === "checkbox") {
          setNativeChecked(field, true)
          fieldsUpdated += 1
          continue
        }
        if (type === "radio") {
          if (!field.checked) {
            setNativeChecked(field, true)
            fieldsUpdated += 1
          }
          continue
        }
        setNativeValue(field, guessInputValue(field, mode))
        fieldsUpdated += 1
        continue
      }

      if (field instanceof HTMLTextAreaElement) {
        setNativeValue(field, mode === "random" ? `Auto note ${randomDigits(5)}` : "Bonjour, merci de traiter ma demande.")
        fieldsUpdated += 1
        continue
      }

      if (field instanceof HTMLSelectElement) {
        const options = Array.from(field.options)
        const pick = options.find((opt) => opt.value && !opt.disabled) ?? options.find((opt) => !opt.disabled)
        if (pick) {
          field.value = pick.value
          field.dispatchEvent(new Event("input", { bubbles: true }))
          field.dispatchEvent(new Event("change", { bubbles: true }))
          fieldsUpdated += 1
        }
      }
    }
  }

  return { forms: forms.length, fields: fieldsUpdated }
}

export default function DevAutofillButton() {
  if (!import.meta.env.DEV) return null

  return (
    <div className="fixed bottom-4 left-4 z-[1000] flex gap-2">
      <button
        type="button"
        onClick={() => {
          const { forms, fields } = fillVisibleForms("real")
          toast.success(`Real autofill: ${fields} fields in ${forms} form(s).`)
        }}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        title="Auto-fill with realistic sample values (dev only)"
      >
        Autofill Real
      </button>
      <button
        type="button"
        onClick={() => {
          const { forms, fields } = fillVisibleForms("random")
          toast.success(`Random autofill: ${fields} fields in ${forms} form(s).`)
        }}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        title="Auto-fill with random values (dev only)"
      >
        Autofill Random
      </button>
    </div>
  )
}
