  import React from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import '../CSS/NavBar.css';
  import logo from '../assets/Logo_reloj.png';
  import Carrito_plegable from "../Paginas/Carrito_plegable";


  function NavBar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
  const rol = user?.rol?.toLowerCase();

    const cerrarSesion = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.clear();
      navigate('/', { replace: true });
    };
    const userString = localStorage.getItem('user');
    const usuario = userString ? JSON.parse(userString) : null;

    

    return (
      <nav>
  <div className="logo-container">
    <img className='logo' src={logo} alt="Logo" />
        <span>{usuario?.nombre}</span>

  </div>

  <div className="nav-links">
    {!user && (
      <>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </>
    )}

    {user && (
      <>
        <Link to="/home">Home</Link>

        {rol === 'admin' && (
          <>
            <Link to="/panel_solicitud">Solicitudes</Link>
            <Link to="/perfil">Perfil</Link>
            <Link to="/usuarios">Usuarios</Link>
          </>
        )}

        {rol === 'tecnico' && (
          <>
            <Link to="/panel_solicitud">Solicitudes</Link>
            <Link to="/Perfil">Perfil</Link>
          </>
        )}

        {(rol === 'usuario' || rol === 'cliente') && (
          <>
            <Link to="/mis-solicitudes">Mis Solicitudes</Link>
            <Link to="/catalogo">Catálogo</Link>
            <Link to="/perfil">Perfil</Link>
            <Carrito_plegable />
          </>
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