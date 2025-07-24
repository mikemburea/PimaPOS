import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PimaPOSWelcome from './PimaPOSWelcome'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PimaPOSWelcome/>
  </StrictMode>
)