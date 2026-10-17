// Renders the app icons (a raindrop on the book's blue) to public/icons/*.png.
// Pure Node: a tiny rasteriser plus a PNG encoder, so no image tooling is needed.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BG = [0x10, 0x50, 0x8f]
const FILL = [0xdc, 0xee, 0xff]
const LINE = [0x2a, 0x7f, 0xd4]

/** Is (x, y) in unit coordinates inside a teardrop scaled by `s` about the centre? */
function inDrop(x, y, s) {
  const cx = 0.5
  const cy = 0.6
  const r = 0.25 * s
  const tip = cy - 0.46 * s
  const dx = x - cx
  const dy = y - cy
  if (dx * dx + dy * dy <= r * r) return true
  if (y < tip || y > cy) return false
  const t = (y - tip) / (cy - tip)
  return Math.abs(dx) <= r * Math.pow(t, 0.75)
}

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

/** @param pad fraction of the canvas kept clear around the drop (maskable icons need more). */
function render(size, pad) {
  const scale = 1 - pad * 2
  const SS = 4 // supersampling per axis
  const rows = []
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3)
    for (let px = 0; px < size; px++) {
      let fill = 0
      let line = 0
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const x = 0.5 + ((px + (sx + 0.5) / SS) / size - 0.5) / scale
          const y = 0.5 + ((py + (sy + 0.5) / SS) / size - 0.5) / scale
          if (inDrop(x, y, 0.86)) fill++
          else if (inDrop(x, y, 1)) line++
        }
      const n = SS * SS
      for (let c = 0; c < 3; c++)
        row[1 + px * 3 + c] = Math.round((BG[c] * (n - fill - line) + FILL[c] * fill + LINE[c] * line) / n)
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = (name, buf) => {
  const p = resolve(root, 'public/icons', name)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, buf)
  console.log('wrote public/icons/' + name, buf.length, 'bytes')
}
out('icon-192.png', render(192, 0.1))
out('icon-512.png', render(512, 0.1))
out('maskable-512.png', render(512, 0.2))
out('apple-touch-icon.png', render(180, 0.12))
