import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export type MapClientMarker = {
  id: string
  name: string
  city: string
  status: string
  lat: number
  lng: number
}

const ALGERIA_CENTER: L.LatLngExpression = [28.5, 2.5]
const DEFAULT_ZOOM = 5

/** Fix default marker assets under Vite. */
function ensureDefaultIcon() {
  const icon = L.divIcon({
    className: "client-map-marker",
    html: `<span class="material-symbols-outlined" style="font-size:22px;color:white;line-height:1;display:block;text-align:center;padding-top:2px">location_on</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  })
  return icon
}

type Props = {
  clients: MapClientMarker[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export default function ClientMapView({ clients, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const map = L.map(el, {
      center: ALGERIA_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const markers = markersRef.current
    const icon = ensureDefaultIcon()
    const activeIcon = L.divIcon({
      className: "client-map-marker client-map-marker--selected",
      html: `<span class="material-symbols-outlined" style="font-size:22px;color:#db143c;line-height:1;display:block;text-align:center;padding-top:2px">location_on</span>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    })

    const nextIds = new Set(clients.map(c => c.id))
    for (const [id, marker] of markers) {
      if (!nextIds.has(id)) {
        map.removeLayer(marker)
        markers.delete(id)
      }
    }

    for (const c of clients) {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue

      let marker = markers.get(c.id)
      const isSel = selectedId === c.id
      const useIcon = isSel ? activeIcon : icon

      if (!marker) {
        marker = L.marker([c.lat, c.lng], { icon: useIcon }).addTo(map)
        marker.on("click", () => {
          onSelect(isSel ? null : c.id)
        })
        markers.set(c.id, marker)
      } else {
        marker.setLatLng([c.lat, c.lng])
        marker.setIcon(useIcon)
        marker.off("click")
        marker.on("click", () => {
          onSelect(isSel ? null : c.id)
        })
      }

      marker.bindPopup(
        `<div style="font-family:system-ui,sans-serif;min-width:140px">
          <div style="font-weight:600">${escapeHtml(c.name)}</div>
          <div style="font-size:12px;opacity:.75">${escapeHtml(c.city)}</div>
          <div style="font-size:11px;margin-top:4px">${escapeHtml(c.status)}</div>
        </div>`
      )
    }
  }, [clients, selectedId, onSelect])

  useEffect(() => {
    const map = mapRef.current
    if (!map || clients.length === 0) return

    const valid = clients.filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng))
    if (valid.length === 0) return

    if (selectedId) {
      const one = valid.find(c => c.id === selectedId)
      if (one) {
        map.flyTo([one.lat, one.lng], Math.max(map.getZoom(), 10), { duration: 0.6 })
        return
      }
    }

    if (valid.length === 1) {
      map.flyTo([valid[0].lat, valid[0].lng], 10, { duration: 0.5 })
      return
    }

    const bounds = L.latLngBounds(valid.map(c => [c.lat, c.lng] as L.LatLngTuple))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
  }, [clients, selectedId])

  return <div ref={containerRef} className="absolute inset-0 z-0" />
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
