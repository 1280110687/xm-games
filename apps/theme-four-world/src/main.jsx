import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { EXPERIENCE_MESSAGES } from '@xm-games/experience-bridge'

const reportFailure = () => {
  window.parent.postMessage({ type: EXPERIENCE_MESSAGES.failed }, window.location.origin)
}

// Context loss can otherwise leave a frozen canvas behind a perpetual loader.
document.addEventListener('webglcontextlost', reportFailure, true)

class RuntimeErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    reportFailure()
    console.error('Theme Four runtime error', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return <pre data-theme-four-error>{String(this.state.error?.stack || this.state.error)}</pre>
  }
}

createRoot(document.getElementById('root'), {
  onUncaughtError(error) {
    reportFailure()
    console.error('Theme Four uncaught error', error)
  },
}).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <App />
    </RuntimeErrorBoundary>
  </StrictMode>,
)
