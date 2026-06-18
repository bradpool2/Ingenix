import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../CSS/NavBar.css';
import logo from '../assets/Logo_reloj.png';

function NavBar() {
  const navigate = useNavigate();
  // Nota: Asegúrate de que al guardar el usuario en el localStorage 
  // el rol esté en minúsculas para que el .toLowerCase() funcione bien.
  const user = JSON.parse(localStorage.getItem('user'));
  const rol = user?.rol?.toLowerCase(); 

  const cerrarSesion = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.clear();
    navigate('/', { replace: true });
  };

  return (
    <nav>
      <div className="nav-links">
        <div className='logo-container'>
          <img className='logo' src={logo} alt="Logo" />
        </div>

        {!user && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}

        {user && (
          <>
            <Link to="/home">Home</Link>
            <Link to="/panel_solicitud">Solicitudes</Link>
            
            {/* Perfil para Admin y Técnico */}
            {(rol === 'admin' || rol === 'tecnico') && (
              <Link to="/perfil">Perfil</Link>
            )}

            {/* Acciones exclusivas del Admin */}
            {rol === 'admin' && (
              <Link to="/usuarios">Usuarios</Link>
            )}
            
            
          </>
        )}
      </div>

      {user && (
        <button className="nav-right" onClick={cerrarSesion}>
          Cerrar Sesión
        </button>
      )}
    </nav>
  );
}

export default NavBar;