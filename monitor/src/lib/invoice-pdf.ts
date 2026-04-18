import { formatFirestoreDate } from "@/lib/utils"
import type { InvoiceLineItem, InvoiceCompanyConfig } from "@/data/schema"

export interface InvoicePdfInput {
  invoiceNumber: string
  title: string
  amountLabel: string
  status: string
  issuedAt?: unknown
  dueAt?: unknown
  clientLabel?: string
  clientEmail?: string
  clientAddress?: string
  clientPhone?: string
  organizationId?: string
  taxRate?: number
  lineItems?: InvoiceLineItem[]
  notes?: string
  company?: Partial<InvoiceCompanyConfig>
}

// ─── Primitive PDF drawing helpers ───────────────────────────────────────────

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function toBase64(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  return btoa(bin)
}

type RGB = [number, number, number]
type Font = "F1" | "F2" | "F3"

// Navy brand colour
const NAVY: RGB = [0.11, 0.16, 0.32]
const RED: RGB = [0.86, 0.08, 0.24]
const BORDER: RGB = [0.82, 0.85, 0.90]
const LIGHT_BG: RGB = [0.96, 0.97, 0.98]
const MID_GRAY: RGB = [0.45, 0.48, 0.53]
const DARK: RGB = [0.12, 0.14, 0.18]
const WHITE: RGB = [1, 1, 1]

function rgb(r: RGB): string { return `${r[0]} ${r[1]} ${r[2]}` }

function fillRect(x: number, y: number, w: number, h: number, color: RGB): string {
  return `${rgb(color)} rg ${x} ${y} ${w} ${h} re f`
}

function strokeRect(x: number, y: number, w: number, h: number, color: RGB, lw = 0.5): string {
  return `${lw} w ${rgb(color)} RG ${x} ${y} ${w} ${h} re S`
}

function hline(x1: number, x2: number, y: number, color: RGB, lw = 0.5): string {
  return `${lw} w ${rgb(color)} RG ${x1} ${y} m ${x2} ${y} l S`
}

function vline(x: number, y1: number, y2: number, color: RGB, lw = 0.5): string {
  return `${lw} w ${rgb(color)} RG ${x} ${y1} m ${x} ${y2} l S`
}

function text(x: number, y: number, value: string, size: number, font: Font = "F1", color: RGB = DARK): string {
  return `${rgb(color)} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(value)}) Tj ET`
}

function textRight(x: number, y: number, value: string, size: number, font: Font = "F1", color: RGB = DARK): string {
  // PDF has no native right-align for Type1, approximate with string width
  const charWidth = size * 0.52
  const w = value.length * charWidth
  return text(x - w, y, value, size, font, color)
}

function wrapLines(str: string, maxChars: number): string[] {
  const words = str.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    if (!cur) { cur = w; continue }
    if (`${cur} ${w}`.length <= maxChars) cur += ` ${w}`
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [""]
}

function formatDA(n: number): string {
  // Use only ASCII characters to avoid PDF encoding corruption
  const fixed = n.toFixed(2)
  const [intPart, dec] = fixed.split(".")
  const grouped = (intPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  return `${grouped}.${dec ?? "00"} DA`
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function statusInfo(status: string): { label: string; color: RGB } {
  const s = status.toLowerCase()
  if (s.includes("pay")) return { label: "PAYEE", color: [0.06, 0.50, 0.25] }
  if (s.includes("retard")) return { label: "EN RETARD", color: [0.78, 0.15, 0.15] }
  return { label: "EN ATTENTE", color: [0.82, 0.50, 0.05] }
}

// ─── Main stream builder ──────────────────────────────────────────────────────

function buildStream(input: InvoicePdfInput): string {
  const W = 595   // A4 width  (pts)
  const H = 842   // A4 height (pts)
  const ML = 50   // left margin
  const MR = 50   // right margin
  const CW = W - ML - MR  // content width = 495

  const co = input.company ?? {}
  const companyName    = co.companyName    || "RODAINA"
  const companyTagline = co.companyTagline || "Digital Systems & Monitoring"
  const companyAddress = co.companyAddress || "Alger, Algerie"
  const companyEmail   = co.companyEmail   || "contact@rodaina.dz"
  const companyPhone   = co.companyPhone   || "+213 XX XX XX XX"
  const bankName       = co.bankName       || "CPA Algerie"
  const bankIBAN       = co.bankIBAN       || "DZ00 0000 0000 0000 0000 00"
  const bankSWIFT      = co.bankSWIFT      || "CPAADZIAXXX"
  const bankNote       = co.bankNote       || "Virement bancaire uniquement. Merci d'indiquer le numero de facture en reference."

  const ref      = (input.invoiceNumber || "").slice(0, 20).toUpperCase()
  const refShort = ref.slice(0, 8) || "N/A"
  const title    = input.title || "Facture de services"
  const client   = input.clientLabel || "Client"
  const email    = input.clientEmail || ""
  const phone    = input.clientPhone || ""
  const address  = input.clientAddress || ""
  const org      = input.organizationId || ""
  const issuedAt = formatFirestoreDate(input.issuedAt)
  const dueAt    = formatFirestoreDate(input.dueAt) || "—"
  const notes    = input.notes || "Merci de proceder au paiement avant la date d'echeance indiquee."
  const taxRate  = input.taxRate ?? 19
  const st       = statusInfo(input.status)

  // Compute totals from line items (fall back to amountLabel)
  const items: InvoiceLineItem[] = input.lineItems?.length
    ? input.lineItems
    : [{ description: title, qty: 1, unitPrice: 0, total: 0 }]

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const taxAmt   = subtotal * taxRate / 100
  const total    = subtotal + taxAmt
  const totalStr = total > 0 ? formatDA(total) : input.amountLabel

  const ops: string[] = []

  // ── 1. Dark navy header band (top of page) ─────────────────────────────────
  const HEADER_H   = 110
  const HEADER_BOT = H - HEADER_H

  ops.push(fillRect(0, HEADER_BOT, W, HEADER_H, NAVY))

  // Left: company name + tagline
  ops.push(text(ML, H - 30, companyName, 22, "F2", WHITE))
  ops.push(text(ML, H - 46, companyTagline, 9, "F1", [0.65, 0.72, 0.85]))
  ops.push(hline(ML, ML + 160, H - 52, [0.30, 0.40, 0.60], 0.5))
  ops.push(text(ML, H - 64, companyAddress, 8, "F1", [0.55, 0.62, 0.75]))
  ops.push(text(ML, H - 76, companyEmail, 8, "F1", [0.55, 0.62, 0.75]))
  ops.push(text(ML, H - 88, companyPhone, 8, "F1", [0.55, 0.62, 0.75]))

  // Right: FACTURE + number + status pill
  ops.push(text(W - MR - 190, H - 30, "FACTURE", 26, "F2", WHITE))
  ops.push(text(W - MR - 190, H - 50, `N degrees  ${refShort}`, 9, "F1", [0.65, 0.72, 0.85]))

  // Status pill (rounded via filled rect)
  const pillW = 96; const pillH = 18; const pillX = W - MR - 100; const pillY = H - 75
  ops.push(fillRect(pillX, pillY, pillW, pillH, st.color))
  const pillLabel = st.label
  const pillLabelX = pillX + (pillW - pillLabel.length * 6) / 2
  ops.push(text(pillLabelX, pillY + 5, pillLabel, 8, "F2", WHITE))

  // Red accent bar below header
  ops.push(fillRect(0, HEADER_BOT - 4, W, 4, RED))

  // ── 2. "Facture a" + Invoice info two-column block ────────────────────────
  const BLOCK_TOP = HEADER_BOT - 4 - 16   // start of info blocks
  const BLOCK_H   = 110
  const BLOCK_BOT = BLOCK_TOP - BLOCK_H
  const COL1_W    = CW * 0.55
  const COL2_X    = ML + COL1_W + 20

  // Column 1 — Bill To
  ops.push(text(ML, BLOCK_TOP - 2, "FACTURE A", 7, "F2", [0.50, 0.53, 0.58]))
  ops.push(hline(ML, ML + 200, BLOCK_TOP - 8, BORDER))
  ops.push(text(ML, BLOCK_TOP - 22, client, 11, "F2", DARK))
  if (email)   ops.push(text(ML, BLOCK_TOP - 37, email,   9, "F1", MID_GRAY))
  if (phone)   ops.push(text(ML, BLOCK_TOP - 51, phone,   9, "F1", MID_GRAY))
  if (address) ops.push(text(ML, BLOCK_TOP - 65, address, 9, "F1", MID_GRAY))
  if (org)     ops.push(text(ML, BLOCK_TOP - 80, `Org: ${org}`, 8, "F1", [0.65, 0.65, 0.65]))

  // Column 2 — Invoice meta
  ops.push(text(COL2_X, BLOCK_TOP - 2, "DETAILS", 7, "F2", [0.50, 0.53, 0.58]))
  ops.push(hline(COL2_X, W - MR, BLOCK_TOP - 8, BORDER))

  const metaRows: [string, string][] = [
    ["Date d'emission :", issuedAt],
    ["Date d'echeance :", dueAt],
    ["Devise :",          "DZD (Dinar Algerien)"],
    ["Ref. commande :",   org || "—"],
  ]
  metaRows.forEach(([label, val], i) => {
    const ry = BLOCK_TOP - 22 - i * 16
    ops.push(text(COL2_X,       ry, label, 8, "F1", MID_GRAY))
    ops.push(text(COL2_X + 105, ry, val,   8, "F2", DARK))
  })

  // separator under info block
  ops.push(hline(ML, W - MR, BLOCK_BOT - 4, BORDER))

  // ── 3. Line items table ────────────────────────────────────────────────────
  const TBL_TOP  = BLOCK_BOT - 4 - 14
  const ROW_H    = 22
  const TBL_HEAD = ROW_H

  // Column widths: Description | Qte | Prix unit. | Total
  const C_DESC  = ML
  const C_QTY   = ML + CW * 0.56
  const C_PRICE = ML + CW * 0.68
  const C_TOTAL = ML + CW * 0.82

  // Header row background
  ops.push(fillRect(ML, TBL_TOP - TBL_HEAD, CW, TBL_HEAD, NAVY))
  ops.push(text(C_DESC  + 6, TBL_TOP - TBL_HEAD + 7, "DESIGNATION / DESCRIPTION", 8, "F2", WHITE))
  ops.push(text(C_QTY   + 4, TBL_TOP - TBL_HEAD + 7, "QTE",        8, "F2", WHITE))
  ops.push(text(C_PRICE + 4, TBL_TOP - TBL_HEAD + 7, "PRIX UNIT.", 8, "F2", WHITE))
  ops.push(text(C_TOTAL + 4, TBL_TOP - TBL_HEAD + 7, "MONTANT",   8, "F2", WHITE))

  // Data rows
  let curY = TBL_TOP - TBL_HEAD
  items.forEach((item, idx) => {
    curY -= ROW_H
    const rowBg: RGB = idx % 2 === 0 ? LIGHT_BG : WHITE
    ops.push(fillRect(ML, curY, CW, ROW_H, rowBg))

    const descLines = wrapLines(item.description || "—", 52)
    ops.push(text(C_DESC + 6, curY + 8, descLines[0]!, 8.5, "F1", DARK))
    if (descLines[1]) ops.push(text(C_DESC + 6, curY - 4, descLines[1], 7.5, "F1", MID_GRAY))

    ops.push(text(C_QTY + 4,   curY + 8, String(item.qty),           8.5, "F1", DARK))
    ops.push(text(C_PRICE + 4, curY + 8, formatDA(item.unitPrice),   8.5, "F1", DARK))
    ops.push(text(C_TOTAL + 4, curY + 8, formatDA(item.total),       8.5, "F2", DARK))

    // bottom rule
    ops.push(hline(ML, ML + CW, curY, BORDER, 0.3))
  })

  // Table border
  ops.push(strokeRect(ML, curY, CW, TBL_TOP - curY, BORDER, 0.5))
  // Vertical separators for columns
  for (const cx of [C_QTY, C_PRICE, C_TOTAL]) {
    ops.push(vline(cx, curY, TBL_TOP, BORDER, 0.3))
  }

  const TABLE_BOT = curY

  // ── 4. Totals block (right-aligned) ───────────────────────────────────────
  const TOT_X    = ML + CW * 0.58
  const TOT_W    = CW * 0.42
  const TOT_TOP  = TABLE_BOT - 14
  const TOT_ROW  = 18

  const totRows: [string, string, boolean][] = [
    ["Sous-total HT",    formatDA(subtotal),  false],
    [`TVA (${taxRate}%)`, formatDA(taxAmt),    false],
  ]
  let ty = TOT_TOP
  totRows.forEach(([label, val]) => {
    ty -= TOT_ROW
    ops.push(text(TOT_X + 10,      ty + 5, label, 8.5, "F1", MID_GRAY))
    ops.push(textRight(TOT_X + TOT_W - 8, ty + 5, val, 8.5, "F1", DARK))
    ops.push(hline(TOT_X, TOT_X + TOT_W, ty, BORDER, 0.3))
  })

  // Total TTC — highlighted row
  ty -= TOT_ROW + 4
  ops.push(fillRect(TOT_X, ty, TOT_W, TOT_ROW + 4, NAVY))
  ops.push(text(TOT_X + 10, ty + 8, "TOTAL TTC", 9, "F2", WHITE))
  ops.push(textRight(TOT_X + TOT_W - 8, ty + 8, totalStr, 11, "F2", WHITE))

  ops.push(strokeRect(TOT_X, ty, TOT_W, TOT_TOP - ty, BORDER, 0.5))

  const TOTALS_BOT = ty

  // ── 5. Notes ──────────────────────────────────────────────────────────────
  const NOTES_TOP = TOTALS_BOT - 20
  ops.push(text(ML, NOTES_TOP, "NOTES & CONDITIONS", 7, "F2", [0.50, 0.53, 0.58]))
  ops.push(hline(ML, ML + 150, NOTES_TOP - 6, BORDER))
  wrapLines(notes, 90).slice(0, 4).forEach((line, i) => {
    ops.push(text(ML, NOTES_TOP - 18 - i * 13, line, 8.5, "F1", MID_GRAY))
  })

  // ── 6. Payment info box ───────────────────────────────────────────────────
  const PAY_TOP  = NOTES_TOP - 90
  const PAY_H    = 52
  ops.push(fillRect(ML, PAY_TOP - PAY_H, CW, PAY_H, LIGHT_BG))
  ops.push(strokeRect(ML, PAY_TOP - PAY_H, CW, PAY_H, BORDER))
  ops.push(text(ML + 10, PAY_TOP - 14, "INFORMATIONS DE PAIEMENT", 7, "F2", MID_GRAY))
  ops.push(text(ML + 10, PAY_TOP - 26, `Banque: ${bankName}  |  IBAN: ${bankIBAN}  |  SWIFT: ${bankSWIFT}`, 8, "F1", DARK))
  ops.push(text(ML + 10, PAY_TOP - 40, bankNote, 8, "F1", MID_GRAY))

  // ── 7. Footer ─────────────────────────────────────────────────────────────
  ops.push(fillRect(0, 0, W, 42, NAVY))
  ops.push(hline(0, W, 42, RED, 2))
  ops.push(text(ML, 16, `${companyName}  |  ${companyTagline}  |  ${companyEmail}`, 7.5, "F1", [0.55, 0.62, 0.75]))
  ops.push(textRight(W - MR, 16, `Ref: ${refShort}  |  Document genere automatiquement`, 7.5, "F1", [0.55, 0.62, 0.75]))

  return ops.join("\n") + "\n"
}

// ─── PDF structure builder ────────────────────────────────────────────────────

function buildPdfBytes(input: InvoicePdfInput): Uint8Array {
  const stream = buildStream(input)
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  ]

  let body = "%PDF-1.4\n"
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(body.length)
    body += obj
  }
  const xrefOffset = body.length
  body += `xref\n0 ${offsets.length}\n`
  body += "0000000000 65535 f \n"
  for (let i = 1; i < offsets.length; i++) {
    body += `${String(offsets[i]!).padStart(10, "0")} 00000 n \n`
  }
  body += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new TextEncoder().encode(body)
}

export function buildInvoicePdfDataUri(input: InvoicePdfInput): string {
  return `data:application/pdf;base64,${toBase64(buildPdfBytes(input))}`
}

export function downloadInvoicePdf(dataUri: string, filename: string): void {
  const a = document.createElement("a")
  a.href = dataUri
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
