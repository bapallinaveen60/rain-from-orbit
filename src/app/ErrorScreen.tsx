import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { isChunkLoadError } from './staleChunks'

function Message({ error, inline }: { error: unknown; inline?: boolean }) {
  const stale = isChunkLoadError(error)
  const notFound = isRouteErrorResponse(error) && error.status === 404
  const detail = error instanceof Error ? error.message : isRouteErrorResponse(error) ? error.statusText : String(error)
  const body = (
    <>
      <h3 className="ph">{stale ? 'A new version is ready' : notFound ? 'No such page' : 'Something went wrong'}</h3>
      <div className="pbox plain">
        <p>
          {stale
            ? 'The book was updated while this tab was open, so part of it could not load. Reloading fetches the new version.'
            : notFound
              ? 'That address is not part of the book.'
              : 'This part of the page could not be shown.'}
        </p>
        <div className="seg">
          <button type="button" className="btn go" onClick={() => window.location.reload()}>
            Reload
          </button>
          {!inline && (
            <Link className="btn" to="/">
              Back to the book
            </Link>
          )}
        </div>
        {!stale && !notFound && (
          <details style={{ marginTop: 10 }}>
            <summary className="tiny">Details</summary>
            <code style={{ whiteSpace: 'pre-wrap' }}>{detail}</code>
          </details>
        )}
      </div>
    </>
  )
  return inline ? <div className="wgt">{body}</div> : <div className="wrap">{body}</div>
}

/** Route-level error screen (replaces React Router's developer default). */
export function RouteError() {
  return <Message error={useRouteError()} />
}

/** Keeps one failing piece (a simulator, a page body) from taking the whole app down. */
export class ErrorBoundary extends Component<{ children: ReactNode; inline?: boolean }, { error: unknown }> {
  state = { error: null as unknown }
  static getDerivedStateFromError(error: unknown) {
    return { error }
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }
  render() {
    return this.state.error ? <Message error={this.state.error} inline={this.props.inline} /> : this.props.children
  }
}
