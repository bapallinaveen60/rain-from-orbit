import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { rateColor } from './draw'
import { NRAY, type GranuleSummary } from './reader'

/*
 * The orbit on a real map (Leaflet; key-free Esri and OpenStreetMap basemaps): nadir track,
 * every raining pixel coloured by near-surface rate, the current window's swath outline, and
 * the picked pixel. Clicking picks the nearest pixel.
 */

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
const GREY = {
  light: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  dark: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
}
const GREY_ATTR = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS'

function baseLayers(t: 'light' | 'dark') {
  const grey = L.tileLayer(GREY[t], { attribution: GREY_ATTR, maxNativeZoom: 16, maxZoom: 12 })
  return {
    grey,
    layers: {
      Map: grey,
      Satellite: L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 12,
      }),
      OpenStreetMap: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 12,
      }),
    },
  }
}

function theme(): 'light' | 'dark' {
  const t = document.documentElement.getAttribute('data-theme')
  if (t === 'light' || t === 'dark') return t
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Make a run of longitudes continuous across the antimeridian (Leaflet happily draws lon > 180). */
function unwrap(pts: [number, number][]): L.LatLngExpression[] {
  let shift = 0
  return pts.map(([lat, lon], i) => {
    if (i > 0) {
      const prev = pts[i - 1][1]
      if (lon - prev > 180) shift -= 360
      else if (prev - lon > 180) shift += 360
    }
    return [lat, lon + shift]
  })
}

export interface MapPick {
  scan: number
  ray: number
}

export function GranuleMap({
  summary,
  s0,
  s1,
  pick,
  onPick,
}: {
  summary: GranuleSummary
  s0: number
  s1: number
  pick: MapPick | null
  onPick: (p: MapPick) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
  const dataLayer = useRef<L.LayerGroup | null>(null)
  const windowLayer = useRef<L.Polygon | null>(null)
  const pickLayer = useRef<L.CircleMarker | null>(null)
  /** Bounds still to fit once the map has a size (it may be created before layout). */
  const pendingFit = useRef<L.LatLngBounds | null>(null)
  const onPickRef = useRef(onPick)
  const summaryRef = useRef(summary)
  // The click handler is bound once; let it see the latest props.
  useLayoutEffect(() => {
    onPickRef.current = onPick
    summaryRef.current = summary
  })

  // Create the map once.
  useEffect(() => {
    if (!box.current) return
    const m = L.map(box.current, { preferCanvas: true, worldCopyJump: true, zoomSnap: 0.5 }).setView([0, 0], 2)
    const base = baseLayers(theme())
    base.grey.addTo(m)
    L.control.layers(base.layers, undefined, { position: 'topright' }).addTo(m)
    tiles.current = base.grey
    map.current = m

    // The grey basemap follows the light/dark theme.
    const retheme = () => tiles.current?.setUrl(GREY[theme()])
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    window.addEventListener('themechange', retheme)
    mq.addEventListener('change', retheme)

    m.on('click', (e: L.LeafletMouseEvent) => {
      const s = summaryRef.current
      const lat = e.latlng.lat
      const lon = ((((e.latlng.lng + 180) % 360) + 360) % 360) - 180
      let best = -1
      let bd = Infinity
      for (let i = 0; i < s.lat.length; i++) {
        const dl = Math.abs(s.lon[i] - lon)
        const d = (s.lat[i] - lat) ** 2 + Math.min(dl, 360 - dl) ** 2
        if (d < bd) {
          bd = d
          best = i
        }
      }
      // Within ~0.5° counts as a pixel; farther away still jumps to the nearest part of the orbit.
      if (best >= 0 && bd < 0.25) onPickRef.current({ scan: Math.floor(best / NRAY), ray: best % NRAY })
    })

    // Leaflet measures its box on creation; re-measure once layout settles.
    const ro = new ResizeObserver(() => {
      m.invalidateSize()
      const b = pendingFit.current
      if (b && m.getSize().x > 0) {
        pendingFit.current = null
        m.fitBounds(b, { padding: [24, 24], maxZoom: 7 })
      }
    })
    ro.observe(box.current)
    return () => {
      ro.disconnect()
      window.removeEventListener('themechange', retheme)
      mq.removeEventListener('change', retheme)
      m.remove()
      map.current = null
    }
  }, [])

  // Track and rain pixels: redrawn when a new granule is opened.
  useEffect(() => {
    const m = map.current
    if (!m) return
    dataLayer.current?.remove()
    const g = L.layerGroup()
    const nadir: [number, number][] = []
    for (let sc = 0; sc < summary.nscan; sc += 4) {
      const i = sc * NRAY + 24
      if (Number.isFinite(summary.lat[i])) nadir.push([summary.lat[i], summary.lon[i]])
    }
    L.polyline(unwrap(nadir), {
      color: token('--ink3') || '#888',
      weight: 1.2,
      opacity: 0.8,
      interactive: false,
    }).addTo(g)
    for (let i = 0; i < summary.rate.length; i++) {
      const col = rateColor(summary.rate[i])
      if (!col) continue
      L.circleMarker([summary.lat[i], summary.lon[i]], {
        radius: 2.4,
        stroke: false,
        fillColor: col,
        fillOpacity: 0.9,
        interactive: false,
      }).addTo(g)
    }
    g.addTo(m)
    dataLayer.current = g
  }, [summary])

  // The window's swath outline; fit the view to it when it moves.
  useEffect(() => {
    const m = map.current
    if (!m) return
    windowLayer.current?.remove()
    const left: [number, number][] = []
    const right: [number, number][] = []
    const step = Math.max(1, Math.floor((s1 - s0) / 120))
    for (let sc = s0; sc < s1; sc += step) {
      left.push([summary.lat[sc * NRAY], summary.lon[sc * NRAY]])
      right.push([summary.lat[sc * NRAY + NRAY - 1], summary.lon[sc * NRAY + NRAY - 1]])
    }
    const ring = unwrap([...left, ...right.reverse()])
    const poly = L.polygon(ring, {
      color: token('--flow') || '#d6197f',
      weight: 2,
      fillOpacity: 0.04,
      interactive: false,
    }).addTo(m)
    windowLayer.current = poly
    if (m.getSize().x > 0) m.fitBounds(poly.getBounds(), { padding: [24, 24], maxZoom: 7 })
    else pendingFit.current = poly.getBounds()
  }, [summary, s0, s1])

  // The picked pixel.
  useEffect(() => {
    const m = map.current
    if (!m) return
    pickLayer.current?.remove()
    if (!pick) return
    const i = pick.scan * NRAY + pick.ray
    pickLayer.current = L.circleMarker([summary.lat[i], summary.lon[i]], {
      radius: 7,
      color: token('--ink') || '#000',
      weight: 2,
      fill: false,
      interactive: false,
    }).addTo(m)
  }, [summary, pick])

  return <div ref={box} className="granule-map" role="region" aria-label="Orbit on a map; click to pick a pixel" />
}
