import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import './CSS/index.css'
import Pago from './Paginas/Pago'
import Home from './Paginas/Home'
import Login from './Paginas/Login'
import Perfil from './Paginas/Perfil'
import Usuarios from './Paginas/Usuarios'
import Catalogo from "./Paginas/Catalogo";
import Register from './Paginas/Register'
import Home_invited from './Paginas/Home_invited'
import Carrito_compra from "./Paginas/Carrito_compra";
import RestablecerPassword from "./Paginas/RestablecerPassword";
import RecuperarPassword from "./Paginas/RecuperarPassword";
import Panel_Solicitud from './Paginas/PanelSolicitudes'
import SolicitudCliente from './Paginas/SolicitudCliente'
import Solicitud from './Paginas/SolicitudMantenimiento'
import SolicitudEntrega from './Paginas/SolicitudEntrega'
import RutaProtegida from './components/RutaProtegida'
import GestionSolicitudes from './Paginas/GestionSolicitudes'
import SolicitudesAlmacenadas from './Paginas/SolicitudesAlmacenadas'

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
        
        
        <Route path="/panel_solicitud" element={<Panel_Solicitud />}>
          <Route path="mantenimiento" element={<Solicitud />} />
          <Route path="Entrega" element={<SolicitudEntrega/>} />
          <Route path="Venta" element={<GestionSolicitudes tipo="venta" />} />
          <Route path="Almacenado" element={<SolicitudesAlmacenadas />} />
        </Route>

        <Route path="/solicitud" element={<Navigate to="/panel_solicitud" replace />} />
        <Route path="/Perfil" element={<Perfil />} />
        <Route path="/Pago" element={<Pago />} />
        <Route path="/Solicitud_Cliente" element={<SolicitudCliente />} />
        <Route path="/Catalogo" element={<Catalogo />} />
        <Route path="/Carrito_compra" element={<Carrito_compra />} />
        <Route path="/register" element={<Register />} />
        <Route path="/restablecer-password/:token" element={<RestablecerPassword />}/>
        <Route path="/recuperar-password" element={<RecuperarPassword/>}/>
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)