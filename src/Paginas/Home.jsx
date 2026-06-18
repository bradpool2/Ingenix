import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import '../CSS/Global.css';
import { IoIosClock } from "react-icons/io";
import { GiDiamondRing } from "react-icons/gi";
import { RiJewelryLine } from "react-icons/ri";
import { FaUserShield, FaTools, FaBoxOpen, FaShoppingCart } from "react-icons/fa";

function Home() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const rol = user?.rol; // Asumiendo que el objeto tiene el campo 'rol'

  const cerrarSesion = () => {
    localStorage.removeItem('user');
    sessionStorage.clear();
    navigate('/', { replace: true });
  };

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="App">
      <NavBar cerrarSesion={cerrarSesion}/>

      <section className="hero">
        <h1>Bienvenido, {user.nombre}</h1>
        <p>Tu rol en Ingenix es: <strong>{rol}</strong></p>
      </section>

      {/* PANEL DE CONTROL DINÁMICO */}
      <section className="contenido-tarjetas">
        
        {/* VISTAS EXCLUSIVAS PARA ADMINISTRADOR */}
        {rol === 'admin' && (
          <div className="card admin-highlight">
            <h2>Panel de Administrador</h2>
            <FaUserShield size={50} />
            <p>Gestión total del sistema y usuarios.</p>
            <button onClick={() => navigate('/usuarios')}>Gestionar Usuarios</button>
          </div>
        )}

        {/* VISTAS PARA TÉCNICO */}
        {rol === 'tecnico' && (
          <div className="card tecnico-highlight">
            <h2>Panel de Técnico</h2>
            <FaTools size={50} />
            <p>Atender solicitudes de mantenimiento.</p>
            <button onClick={() => navigate('/panel_solicitud')}>Ver Mis Tareas</button>
          </div>
        )}

        {/* VISTAS COMUNES (Para todos los logueados) */}
        <div className="card">
          <h2>Relojes Clásicos</h2>
          <IoIosClock size={50}/>
          <button onClick={() => navigate('/relojes')}>Consultar</button>
        </div>

        <div className="card">
          <h2>Joyería de Oro</h2>
          <GiDiamondRing size={50} color='#FFD700'/>
          <button onClick={() => navigate('/joyeria')}>Ver Catálogo</button>
        </div>

        <div className="card">
          <h2>Exhibición</h2>
          <RiJewelryLine size={50}/>
          <button onClick={() => navigate('/exhibicion')}>Ver Vitrinas</button>
        </div>
      </section>
    </div>
  );
}

export default Home;