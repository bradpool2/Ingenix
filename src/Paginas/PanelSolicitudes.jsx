import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import NavBar from '../components/NavBar';
import DashboardBienvenida from './DashboardBienvenida'; 
import '../CSS/PanelSol.css';

const PanelSolicitudes = () => {
  const userString = localStorage.getItem('user');
  const usuarioLogueado = userString ? JSON.parse(userString) : null;
  const rol = usuarioLogueado?.rol || '';
  const esAdminOTecnico = rol === 'admin' || rol === 'tecnico';

  const location = useLocation();

  const mostrarDashboard = location.pathname === '/panel_solicitud' || location.pathname === '/panel_solcitud/';
  const enlaceActivo = (ruta) => location.pathname.toLowerCase().endsWith(`/${ruta.toLowerCase()}`);
  const claseEnlace = (ruta, adicional = '') => `${adicional} ${enlaceActivo(ruta) ? 'activo' : ''}`.trim();

  return (
    <div className="principal">
      <NavBar />
      <nav className="sidebar">
        <h2>Panel de Gestión</h2>
        <ul>
          <li>
            <Link to="/panel_solicitud" className={`link-estadisticas ${mostrarDashboard ? 'activo' : ''}`}>Estadísticas</Link>
          </li>
          <li>
            <Link to="mantenimiento" className={claseEnlace('mantenimiento')}>Solicitud Mantenimiento</Link>
          </li>
          
          {esAdminOTecnico && (
            <li>
              <Link to="Entrega" className={claseEnlace('entrega')}>Solicitud Entrega</Link>
            </li>
          )}

          <li>
            <Link to="Venta" className={claseEnlace('venta')}>Solicitud Venta</Link>
          </li>

          {esAdminOTecnico && (
            <li>
              <Link to="Almacenado" className={claseEnlace('almacenado')}>Solicitud Almacenado</Link>
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