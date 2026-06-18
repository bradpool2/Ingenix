import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import NavBar from '../components/NavBar';
import DashboardBienvenida from './DashboardBienvenida';
import '../CSS/PanelSol.css';

const PanelSolicitudes = () => {
  const userString = localStorage.getItem('user');
  const usuarioLogueado = userString ? JSON.parse(userString) : null;
  const rol = usuarioLogueado?.rol || '';

  const location = useLocation();
  // Corregido el typo en la ruta (solcitud -> solicitud)
  const mostrarDashboard = location.pathname === '/panel_solicitud' || location.pathname === '/panel_solicitud/';

  return (
    <div className="principal">
      <NavBar />
      <nav className="sidebar">
        <h2>Panel de Gestión</h2>
        <ul>
          
          {/* ================= VISTA EXCLUSIVA PARA ADMIN ================= */}
          {rol === 'admin' && (
            <>
              <li>
                {/* Corregido: Solicitud ya no es un componente, sino el nombre del enlace */}
                <Link to="admin/mantenimiento">Solicitud Mantenimiento (Admin)</Link>
              </li>
              <li>
                <Link to="admin/Entrega">Solicitud Entrega (Admin)</Link>
              </li>
              <li>
                <Link to="reporte-piezas">Gestión de Piezas</Link></li>
              <li>
                <Link to="admin/Almacenado">Solicitud Almacenado (Admin)</Link>
              </li>
              <li>
                <Link to="admin/Venta">Solicitud Venta</Link>
              </li>
            </>
          )}

          {/* ================= VISTA EXCLUSIVA PARA TÉCNICO ================= */}
          {rol === 'tecnico' && (
            <>
             
              <li>
                <Link to="tecnico/Entrega">Mis Entregas</Link>
              </li>
              <li>
                <Link to="reporte-piezas">Gestión de Piezas</Link></li>
              <li>
                <Link to="tecnico/Almacenado">Inventario Almacenado</Link>
              </li>
            </>
          )}

          {/* ================= VISTA PARA OTROS ROLES ================= */}
          {rol !== 'admin' && rol !== 'tecnico' && (
            <>
              <li>
                <Link to="mantenimiento">Crear Mantenimiento</Link>
              </li>
              <li>
                <Link to="Venta">Solicitud Venta</Link>
              </li>
            </>
          )}

        </ul>
      </nav>

      <main className="content">
        {mostrarDashboard ? <DashboardBienvenida /> : <Outlet />}
      </main>
    </div>
  );
};

export default PanelSolicitudes;