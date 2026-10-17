import * as Comlink from 'comlink'
import h5wasm from 'h5wasm'
import { alongTrack, crossTrack, readProfile, readSummary, type Band, type H5Source } from './reader'

/*
 * Opens a granule inside a worker. A picked File is mounted with WORKERFS, so h5wasm reads
 * only the byte ranges each slice needs; a URL (the bundled sample) is fetched whole.
 */
let file: InstanceType<typeof h5wasm.File> | null = null
let name = ''
let mounted = false

async function close() {
  file?.close()
  file = null
  const { FS } = await h5wasm.ready
  if (mounted) {
    FS.unmount('/work')
    mounted = false
  }
}

const src = () => {
  if (!file) throw new Error('No granule is open.')
  return file as unknown as H5Source
}

const api = {
  async openFile(f: File) {
    await close()
    const { FS } = await h5wasm.ready
    try {
      FS.mkdir('/work')
    } catch {
      /* exists */
    }
    FS.mount(FS.filesystems.WORKERFS, { files: [f] }, '/work')
    mounted = true
    file = new h5wasm.File(`/work/${f.name}`, 'r')
    name = f.name
    return readSummary(src(), name)
  },
  async openUrl(url: string, fileName: string) {
    await close()
    const { FS } = await h5wasm.ready
    const buf = new Uint8Array(await (await fetch(url)).arrayBuffer())
    FS.writeFile('/' + fileName, buf)
    file = new h5wasm.File('/' + fileName, 'r')
    name = fileName
    return readSummary(src(), name)
  },
  crossTrack: (scan: number, band: Band) => crossTrack(src(), scan, band),
  alongTrack: (ray: number, s0: number, s1: number, band: Band) => alongTrack(src(), ray, s0, s1, band),
  profile: (scan: number, ray: number, band: Band) => readProfile(src(), scan, ray, band),
  close,
}

export type GranuleWorkerApi = typeof api
Comlink.expose(api)
