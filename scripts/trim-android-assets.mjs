// After `npm run build:android`: drop files the app never links to, to keep the APK small.
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const www = fileURLToPath(new URL('../android/app/src/main/assets/www/', import.meta.url))
// Only the full-size edition is linked from the book (ChapterRail and Pager).
for (const f of ['pdf/Rain-from-Orbit-A5.pdf', 'pdf/Rain-from-Orbit-A5-pocket.pdf']) {
  rmSync(www + f, { force: true })
}
console.log('trimmed', www)
