import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

console.log(
  '%cSUCHITRA ARTS%c\nLike this sign? We build real ones — BTM Layout, Bangalore.',
  'font-size:28px;font-weight:900;color:#FF5A1F;text-shadow:0 0 12px rgba(255,90,31,.6)',
  'font-size:12px;color:#9A9182',
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
