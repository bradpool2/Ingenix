import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import NavBar from '../components/NavBar';
import DashboardBienvenida from './DashboardBienvenida'; // Importamos el diseño del Dashboard
import '../CSS/PanelSol.css';

const PanelSolicitudes = () => {
  const userString = localStorage.getItem('user');
  const usuarioLogueado = userString ? JSON.parse(userString) : null;
  const rol = usuarioLogueado?.rol || '';
  const esAdminOTecnico = rol === 'admin' || rol === 'tecnico';

  // Usamos useLocation para saber en qué URL exacta está el usuario
  const location = useLocation();

  const mostrarDashboard = location.pathname === '/panel_solicitud' || location.pathname === '/panel_solcitud/';

  return (
    <div className="principal">
      <NavBar />
      <nav className="sidebar">
        <h2>Panel de Gestión</h2>
        <ul>
          <li>
            <Link to="mantenimiento">Solicitud Mantenimiento</Link>
          </li>
          
          {esAdminOTecnico && (
            <li>
              <Link to="Entrega">Solicitud Entrega</Link>
            </li>
          )}

          <li>
            <Link to="Venta">Solicitud Venta</Link>
          </li>

          {esAdminOTecnico && (
            <li>
              <Link to="Almacenado">Solicitud Almacenado</Link>
            </li>
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