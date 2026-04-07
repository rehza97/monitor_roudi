import { toast } from "sonner"

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

function guessInputValue(input: HTMLInputElement): string {
  const key = `${input.name} ${input.id} ${input.placeholder} ${input.ariaLabel ?? ""}`.toLowerCase()
  const type = input.type.toLowerCase()

  if (type === "email" || key.includes("email")) return "admin+dev@rodaina.local"
  if (type === "url" || key.includes("url")) return "https://dev.rodaina.local"
  if (type === "number") return key.includes("qty") || key.includes("quant") ? "5" : "10"
  if (key.includes("phone") || key.includes("tel")) return "+213555000111"
  if (key.includes("city")) return "Alger"
  if (key.includes("name") || key.includes("nom")) return "Dev Autofill"
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

function fillVisibleForms(): { forms: number; fields: number } {
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
        setNativeValue(field, guessInputValue(field))
        fieldsUpdated += 1
        continue
      }

      if (field instanceof HTMLTextAreaElement) {
        setNativeValue(field, "Dev autofill note.")
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
    <button
      type="button"
      onClick={() => {
        const { forms, fields } = fillVisibleForms()
        toast.success(`Autofill done: ${fields} fields in ${forms} form(s).`)
      }}
      className="fixed bottom-4 left-4 z-[1000] h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      title="Auto-fill visible form inputs (dev only)"
    >
      Dev Autofill
    </button>
  )
}
