import defs from '../../assets/defs.svg?raw'

/** Rough-edge filters (#rf1, #rf2) and the Dot/Core character symbols, mounted once. */
export function SvgDefs() {
  return <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: defs }} />
}
