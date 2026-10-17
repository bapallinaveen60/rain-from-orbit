// Injected into the page by MainActivity. Routes the few browser features a WebView lacks
// (downloads, the clipboard, the bar colours) to the native RainApp bridge.
(function () {
  if (window.__rainBridge) return
  window.__rainBridge = true
  var SITE = 'https://bapallinaveen60.github.io/rain-from-orbit/'

  // Remember every blob handed out, so a download still works after the page revokes its URL.
  var blobs = new Map()
  var createObjectURL = URL.createObjectURL
  URL.createObjectURL = function (obj) {
    var url = createObjectURL.call(URL, obj)
    if (obj instanceof Blob) blobs.set(url, obj)
    return url
  }

  function save(a) {
    var href = a.href
    var name = a.getAttribute('download') || href.split('/').pop() || 'download'
    if (href.indexOf('blob:') === 0) {
      var blob = blobs.get(href)
      if (!blob) return false
      blobs.delete(href)
      var reader = new FileReader()
      reader.onload = function () {
        RainApp.saveFile(name, blob.type || 'application/octet-stream', String(reader.result).split(',')[1] || '')
      }
      reader.readAsDataURL(blob)
      return true
    }
    if (href.indexOf(location.origin + '/') === 0) {
      RainApp.saveAsset(href.slice(location.origin.length).split(/[?#]/)[0], name)
      return true
    }
    return false
  }

  // Links built in code and clicked without joining the page (the notes export) ...
  var click = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && save(this)) return
    return click.call(this)
  }
  // ... and ordinary download links (the PDF edition).
  document.addEventListener(
    'click',
    function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[download]')
      if (a && save(a)) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
    true,
  )

  // Shared storm links should open the live site, not this app's private origin.
  var writeText = function (text) {
    RainApp.copy(String(text).split(location.origin + '/').join(SITE))
    return Promise.resolve()
  }
  if (navigator.clipboard) navigator.clipboard.writeText = writeText
  else Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeText } })

  // Keep the status and navigation bars the colour of the page, in light and dark themes.
  function bars() {
    if (document.body) RainApp.setBars(getComputedStyle(document.body).backgroundColor)
  }
  window.addEventListener('themechange', function () {
    setTimeout(bars, 0)
  })
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', bars)
  bars()
})()
