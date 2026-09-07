  import React from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import { useEffect, useState } from 'react';
  import { FaBell } from 'react-icons/fa';
  import '../CSS/NavBar.css';
  import logo from '../assets/Logo_reloj.png';
  import Carrito_plegable from "../Paginas/Carrito_plegable";
  import { authFetch } from './api.js';
  import { useRef } from 'react';


  function NavBar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const rol = user?.rol?.toLowerCase();
    const [notificaciones, setNotificaciones] = useState([]);
    const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
    const [toast, setToast] = useState(null);
    const inicializado = useRef(false);
    const notificacionesConocidas = useRef(new Set());

    const cargarNotificaciones = async () => {
      if (!user) return;

      try {
        const response = await authFetch('http://localhost:3000/notificaciones');
        if (!response.ok) return;
        const nuevas = await response.json();
        const noLeidasNuevas = nuevas.filter((notificacion) => (
          !notificacion.leida && !notificacionesConocidas.current.has(notificacion.idnotificacion)
        ));
        if (inicializado.current && noLeidasNuevas.length > 0) {
          setToast(noLeidasNuevas[0]);
          window.setTimeout(() => setToast(null), 6000);
        }
        nuevas.forEach((notificacion) => notificacionesConocidas.current.add(notificacion.idnotificacion));
        inicializado.current = true;
        setNotificaciones(nuevas);
      } catch (error) {
        console.error('No se pudieron cargar las notificaciones:', error);
      }
    };

    useEffect(() => {
      cargarNotificaciones();
      const intervalo = window.setInterval(cargarNotificaciones, 30000);
      return () => window.clearInterval(intervalo);
    }, [user?.idUsuario]);

    const marcarComoLeida = async (notificacion) => {
      if (notificacion.leida) return;

      const response = await authFetch(
        `http://localhost:3000/notificaciones/${notificacion.idnotificacion}/leida`,
        { method: 'PUT' }
      );

      if (response.ok) {
        setNotificaciones((actuales) => actuales.map((actual) => (
          actual.idnotificacion === notificacion.idnotificacion
            ? { ...actual, leida: true }
            : actual
        )));
      }
    };

    const marcarTodasComoLeidas = async () => {
      const response = await authFetch(
        'http://localhost:3000/notificaciones/marcar-todas-leidas',
        { method: 'PUT' }
      );

      if (response.ok) {
        setNotificaciones((actuales) => actuales.map((notificacion) => (
          { ...notificacion, leida: true }
        )));
      }
    };

    const ejecutarAccion = async (event, notificacion, accion) => {
      event.stopPropagation();
      const response = await authFetch(
        `http://localhost:3000/notificaciones/${notificacion.idnotificacion}/accion`,
        { method: 'PUT', body: JSON.stringify({ accion }) }
      );
      if (response.ok) {
        setNotificaciones((actuales) => actuales.map((actual) => (
          actual.idnotificacion === notificacion.idnotificacion
            ? { ...actual, leida: true }
            : actual
        )));
      } else {
        const data = await response.json();
        setToast({ titulo: 'No se pudo ejecutar la acción', mensaje: data.message });
        window.setTimeout(() => setToast(null), 5000);
      }
    };

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
            <Link to="/usuarios">Gestion</Link>
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
            <Link to="/Solicitud_Cliente">Mis Solicitudes</Link>
            <Link to="/catalogo">Catálogo</Link>
            <Link to="/perfil">Perfil</Link>
            <Carrito_plegable />
          </>
        )}
      </>
    )}
  </div>

  {user && (
    <div className="notificaciones-wrapper">
      <button
        className="notificaciones-button"
        onClick={() => setMostrarNotificaciones((visible) => !visible)}
        aria-label="Ver notificaciones"
        aria-expanded={mostrarNotificaciones}
      >
        <FaBell />
        {notificaciones.some((notificacion) => !notificacion.leida) && (
          <span className="notificaciones-badge">
            {notificaciones.filter((notificacion) => !notificacion.leida).length}
          </span>
        )}
      </button>

      {mostrarNotificaciones && (
        <div className="notificaciones-panel">
          <div className="notificaciones-header">
            <strong>Notificaciones</strong>
            {notificaciones.some((notificacion) => !notificacion.leida) && (
              <button onClick={marcarTodasComoLeidas}>
                Marcar todas
              </button>
            )}
          </div>

          {notificaciones.length === 0 ? (
            <p className="notificaciones-vacio">No tienes notificaciones.</p>
          ) : (
            <div className="notificaciones-lista">
              {notificaciones.map((notificacion) => (
                <div
                  className={`notificacion-item ${notificacion.leida ? '' : 'no-leida'}`}
                  key={notificacion.idnotificacion}
                  onClick={() => marcarComoLeida(notificacion)}
                  role="button"
                  tabIndex="0"
                >
                  <span className={`notificacion-prioridad ${notificacion.prioridad}`}>
                    {notificacion.prioridad}
                  </span>
                  <strong>{notificacion.titulo}</strong>
                  <span>{notificacion.mensaje}</span>
                  <small>
                    {new Date(notificacion.created_at).toLocaleString('es-CO')}
                  </small>
                  {notificacion.requiere_accion && rol === 'tecnico' && !notificacion.leida && (
                    <span className="notificacion-actions">
                      <button onClick={(event) => ejecutarAccion(event, notificacion, 'aceptar')}>
                        Aceptar solicitud
                      </button>
                      {notificacion.idsolicitud && (
                        <button onClick={(event) => {
                          event.stopPropagation();
                          navigate('/panel_solicitud');
                        }}>
                          Ver detalles
                        </button>
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )}

  {toast && (
    <button
      className="notificacion-toast"
      onClick={() => {
        setToast(null);
        setMostrarNotificaciones(true);
        if (toast.idsolicitud) navigate('/panel_solicitud');
      }}
    >
      <FaBell />
      <span><strong>{toast.titulo}</strong><small>{toast.mensaje}</small></span>
    </button>
  )}

  {user && (
    <button className="nav-right" onClick={cerrarSesion}>
      Cerrar Sesión
    </button>
  )}
</nav>
    );
  }

  export default NavBar;