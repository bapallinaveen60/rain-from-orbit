import { useEffect, useLayoutEffect, useRef } from 'react'
import { fit, readColors, type Frame } from './draw'

/**
 * Attach a draw function to a canvas. It redraws whenever `draw` changes (pass a function
 * built from the sim's state), when the canvas is resized, and when the theme changes.
 * @param aspect height ÷ width of the plot (the original canvas's height/width attributes)
 */
export function usePlot(draw: (f: Frame) => void, aspect: number) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  const frame = useRef(0)

  const paint = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const cv = ref.current
      if (!cv) return
      drawRef.current({ ...fit(cv, aspect), c: readColors() })
    })
  }

  useLayoutEffect(() => {
    drawRef.current = draw
    paint()
  })

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    let lastW = cv.clientWidth
    const ro = new ResizeObserver(() => {
      if (cv.clientWidth !== lastW) {
        lastW = cv.clientWidth
        paint()
      }
    })
    ro.observe(cv)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    window.addEventListener('themechange', paint)
    mq.addEventListener('change', paint)
    // Fonts load after first paint; redraw so canvas labels use the real faces.
    document.fonts?.ready.then(paint)
    return () => {
      ro.disconnect()
      window.removeEventListener('themechange', paint)
      mq.removeEventListener('change', paint)
      cancelAnimationFrame(frame.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return ref
}
