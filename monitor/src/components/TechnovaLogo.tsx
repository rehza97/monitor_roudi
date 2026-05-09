import { cn } from "@/lib/utils"

const LOGO_SRC = "/n_logo.png"
const SIDEBAR_LOGO_SRC = "/verti_logo.png"

export type TechnovaLogoProps = {
  className?: string
  /** Tailwind height class, e.g. h-7, h-8, h-9 */
  heightClass?: string
  /** When true, logo sits on a light plate (for dark sidebars) */
  onDark?: boolean
}

export function TechnovaLogo({
  className,
  heightClass = "h-8",
  onDark,
}: TechnovaLogoProps) {
  const img = (
    <img
      src={LOGO_SRC}
      alt="TECHNOVA"
      className={cn(
        heightClass,
        "w-auto max-w-[min(100%,320px)] object-contain object-left",
        className
      )}
      width={1254}
      height={1254}
      decoding="async"
    />
  )

  if (onDark) {
    return (
      <span className="inline-flex max-w-full min-w-0 rounded-md bg-white px-2 py-1 shadow-sm ring-1 ring-black/10">
        {img}
      </span>
    )
  }

  return <span className="inline-flex max-w-full min-w-0">{img}</span>
}

export function TechnovaSidebarLogo({
  className,
  heightClass = "h-9",
  onDark,
}: TechnovaLogoProps) {
  const img = (
    <img
      src={SIDEBAR_LOGO_SRC}
      alt="TechNova"
      className={cn(
        heightClass,
        "w-auto max-w-full object-contain object-left",
        className
      )}
      width={1024}
      height={409}
      decoding="async"
    />
  )

  if (onDark) {
    return (
      <span className="inline-flex max-w-full min-w-0 rounded-md bg-white px-2 py-1 shadow-sm ring-1 ring-black/10">
        {img}
      </span>
    )
  }

  return <span className="inline-flex max-w-full min-w-0">{img}</span>
}
