import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Application root element not found')

if (window.self !== window.top) {
  root.remove()
} else
  createRoot(root).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  )
