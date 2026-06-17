import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./CSS/index.css";
import Home from "./Paginas/Home";
import Login from "./Paginas/Login";
import Usuarios from "./Paginas/Usuarios";
import Register from "./Paginas/Register";
import Home_invited from "./Paginas/Home_invited";
import Panel_Solicitud from "./Paginas/PanelSolicitudes";
import Solicitud from "./Paginas/SolicitudMantenimiento";
import RutaProtegida from "./components/RutaProtegida";
import Perfil from "./Paginas/Perfil";
import Catalogo from "./Paginas/Catalogo";
import Carrito_compra from "./Paginas/Carrito_compra";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home_invited />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/home"
          element={
            <RutaProtegida>
              <Home />
            </RutaProtegida>
          }
        />

        <Route path="/panel_solicitud" element={<Panel_Solicitud />}>
          <Route path="mantenimiento" element={<Solicitud />} />
          <Route path="Entrega" element={<div>Vista Solicitud Entrega</div>} />
          <Route path="Venta" element={<div>Vista Solicitud Venta</div>} />
          <Route
            path="Almacenado"
            element={<div>Vista Solicitud Almacenado</div>}
          />
        </Route>

        <Route
          path="/solicitud"
          element={<Navigate to="/panel_solicitud" replace />}
        />
        <Route path="/register" element={<Register />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/carrito" element={<Carrito_compra />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
