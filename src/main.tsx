import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Vite emits this event when an already-open tab still references a chunk
// removed by a newer deployment. A single guarded reload lets the new shell
// and service worker converge without trapping the user in a reload loop.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const reloadKey = 'turismo-vite-preload-reload'
  if (sessionStorage.getItem(reloadKey) !== '1') {
    sessionStorage.setItem(reloadKey, '1')
    window.location.reload()
  }
})
window.addEventListener('load', () => sessionStorage.removeItem('turismo-vite-preload-reload'), { once: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
