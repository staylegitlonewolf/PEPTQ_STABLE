import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { ManifestProvider } from './context/ManifestContext.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { AccessibilityProvider } from './context/AccessibilityContext.jsx'

const appTree = (
  <AccessibilityProvider>
    <ThemeProvider>
      <AuthProvider>
        <ManifestProvider>
          <App />
        </ManifestProvider>
      </AuthProvider>
    </ThemeProvider>
  </AccessibilityProvider>
)

createRoot(document.getElementById('root')).render(
  import.meta.env.DEV ? appTree : <StrictMode>{appTree}</StrictMode>,
)

