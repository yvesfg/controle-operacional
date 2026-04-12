import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './design-system/tokens.css'
import './design-system/theme-dark.css'
import './design-system/theme-light.css'
import './design-system/components.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
