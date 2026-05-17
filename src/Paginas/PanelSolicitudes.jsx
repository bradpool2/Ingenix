import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import NavBar from '../components/NavBar'
import '../CSS/PanelSol.css'
const PanelSolicitudes = () => {
  return (
    <div className="principal">
        <NavBar />
      <nav className="sidebar">
        <h2>Panel de Gestión</h2>
        <ul>
          <li><Link to="mantenimiento">Solicitud Mantenimiento</Link></li>
          <li><Link to="reparacion">Solicitud Reparación</Link></li>
          <li><Link to="garantia">Solicitud Garantía</Link></li>
        </ul>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default PanelSolicitudes;