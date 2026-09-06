import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

class RuntimeErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Theme Four runtime error', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return <pre data-theme-four-error>{String(this.state.error?.stack || this.state.error)}</pre>
  }
}

createRoot(document.getElementById('root'), {
  onUncaughtError(error) {
    console.error('Theme Four uncaught error', error)
  },
}).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <App />
    </RuntimeErrorBoundary>
  </StrictMode>,
)
