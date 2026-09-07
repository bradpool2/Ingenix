import { Link } from 'react-router-dom';
import { FaBell, FaBoxes, FaChartLine, FaClipboardList, FaTools } from 'react-icons/fa';
import NavBar from '../components/NavBar';
import '../CSS/RoleHome.css';

const roleData = {
  cliente: {
    eyebrow: 'MI ESPACIO',
    title: 'Todo el cuidado de tus piezas, en un solo lugar.',
    text: 'Consulta solicitudes, avances y compras sin perder ningún detalle.',
    cards: [
      ['Mis solicitudes', 'Revisa el estado de tus mantenimientos.', '/Solicitud_Cliente', FaClipboardList],
      ['Catálogo', 'Descubre productos disponibles.', '/Catalogo', FaBoxes],
      ['Perfil', 'Actualiza tus datos de contacto.', '/Perfil', FaTools],
    ],
  },
  tecnico: {
    eyebrow: 'CENTRO TÉCNICO',
    title: 'Trabaja con precisión. Responde a tiempo.',
    text: 'Accede a tus solicitudes, actualiza estados y atiende alertas urgentes.',
    cards: [
      ['Órdenes de servicio', 'Consulta solicitudes pendientes y asignadas.', '/panel_solicitud', FaClipboardList],
      ['Notificaciones', 'Revisa asignaciones y avisos urgentes.', '/home', FaBell],
      ['Mi perfil', 'Mantén actualizada tu información.', '/Perfil', FaTools],
    ],
  },
  admin: {
    eyebrow: 'CONTROL DEL NEGOCIO',
    title: 'Una visión completa de Ingenix.',
    text: 'Supervisa solicitudes, inventario, finanzas y comunicación del equipo.',
    cards: [
      ['Gestión general', 'Usuarios, inventario y categorías.', '/usuarios', FaBoxes],
      ['Solicitudes', 'Asigna técnicos y supervisa estados.', '/panel_solicitud', FaClipboardList],
      ['Reportes', 'Consulta el comportamiento financiero.', '/usuarios', FaChartLine],
    ],
  },
};

export default function Home() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const role = user?.rol?.toLowerCase() === 'usuario' ? 'cliente' : user?.rol?.toLowerCase();
  const content = roleData[role] || roleData.cliente;

  return (
    <div className="role-home">
      <NavBar />
      <main className="role-home-content">
        <section className="role-welcome">
          <span className="eyebrow">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.text}</p>
          <div className="role-welcome-line" />
          <span className="role-user">Hola, {user?.nombre || 'bienvenido'}.</span>
        </section>
        <section className="role-card-grid">
          {content.cards.map(([title, text, href, Icon]) => (
            <Link className="role-card" to={href} key={title}>
              <span className="role-card-icon"><Icon /></span>
              <span className="role-card-title">{title}</span>
              <span className="role-card-text">{text}</span>
              <span className="role-card-link">Abrir →</span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
