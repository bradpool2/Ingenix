import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import './CSS/index.css'
import Home from './Paginas/Home'
import Login from './Paginas/Login'
import Relojs from './Paginas/Relojes'
import Usuarios from './Paginas/Usuarios'
import Register from './Paginas/Register'
import Home_invited from './Paginas/Home_invited'
import Panel_Solicitud from './Paginas/PanelSolicitudes'
import Solicitud from './Paginas/SolicitudMantenimiento'
import SolicitudEntrega from './Paginas/SolicitudEntrega'
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
        
        {/* ================= PANEL DE SOLICITUDES Y SUS RUTAS HIJAS ================= */}
        <Route path="/panel_solicitud" element={<Panel_Solicitud />}>
          
          {/* 1. Rutas que ya tenías (puedes dejarlas para los usuarios/clientes) */}
          <Route path="mantenimiento" element={<Solicitud />} />
          <Route path="Entrega" element={<SolicitudEntrega/>} />
          <Route path="Venta" element={<div>Vista Solicitud Venta</div>} />
          <Route path="Almacenado" element={<div>Vista Solicitud Almacenado</div>} />

          {/* 2. NUEVAS RUTAS PARA EL ADMINISTRADOR */}
          <Route path="admin/mantenimiento" element={<div>Vista Mantenimiento de Admin</div>} />
          <Route path="admin/Entrega" element={<div>Vista Entrega de Admin</div>} />
          <Route path="admin/Almacenado" element={<div>Vista Almacenado de Admin</div>} />
          <Route path="admin/Venta" element={<div>Vista Venta de Admin</div>} />

          {/* 3. NUEVAS RUTAS PARA EL TÉCNICO */}
          <Route path="tecnico/mantenimiento" element={<div>Vista Mantenimiento de Técnico</div>} />
          <Route path="tecnico/Entrega" element={<div>Vista Entrega de Técnico</div>} />
          <Route path="tecnico/Almacenado" element={<div>Vista Almacenado de Técnico</div>} />
          
        </Route>
        {/* ========================================================================== */}

        <Route path="/solicitud" element={<Navigate to="/panel_solicitud" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)