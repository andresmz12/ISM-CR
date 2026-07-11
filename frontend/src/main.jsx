import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Cada deploy cambia el hash de los archivos en /assets (incluidos los que se
// cargan bajo demanda, como exceljs). Una pestaña que quedó abierta desde
// antes del deploy pide el archivo viejo (ya no existe, 404) al intentar un
// import() dinámico — en vez de mostrar un error confuso, se recarga la
// página una vez para traer la versión actual.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
