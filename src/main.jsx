import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import './CSS/index.css'
import Home from './Paginas/Home'
import Login from './Paginas/Login'
import Relojs from './Paginas/Relojes'
import Usuarios from './Paginas/Usuarios'
import Register from './Paginas/Register'
import Solicitud from './Paginas/Solicitud'
import Home_invited from './Paginas/Home_invited'
import RutaProtegida from './components/RutaProtegida'




createRoot(document.getElementById('root')).render(
  <StrictMode>
    
    <BrowserRouter>
      <Routes>
      <Route path="/" element={<Home_invited />} /> 

        <Route path="/Login" element={<Login />} /> 
            
        <Route path="/home" element={
          <RutaProtegida>
          <Home />
          </RutaProtegida>
          } />
        <Route path="/relojes" element={<Relojs />} />
        <Route path="/solicitud" element={<Solicitud />} />
        <Route path="/register" element={<Register />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
