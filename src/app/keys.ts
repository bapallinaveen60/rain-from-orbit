/** Keys meant for a focused control (text field, slider, scrubbable number) aren't shortcuts. */
export function isTyping(e: KeyboardEvent) {
  const t = e.target
  if (e.defaultPrevented) return true
  return (
    t instanceof HTMLElement &&
    (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.getAttribute('role') === 'slider')
  )
}
