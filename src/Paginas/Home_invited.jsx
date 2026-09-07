import { Link } from 'react-router-dom';
import { FaClock, FaGem, FaWrench } from 'react-icons/fa';
import '../CSS/HomePublic.css';

export default function Home_invited() {
  return (
    <main className="public-home">
      <section className="public-hero">
        <div className="public-hero-content">
          <span className="eyebrow">INGENIX · RELOJERÍA Y JOYERÍA</span>
          <h1>El tiempo también merece cuidado.</h1>
          <p>
            Mantenimiento, reparación y valoración de piezas especiales con
            seguimiento claro y atención experta.
          </p>
          <div className="public-actions">
            <Link className="public-primary" to="/Login">Iniciar sesión</Link>
            <Link className="public-secondary" to="/register">Crear cuenta</Link>
          </div>
        </div>
        <div className="hero-showcase" aria-label="Servicios destacados">
          <div className="showcase-card showcase-main">
            <FaClock />
            <span>Precisión</span>
            <strong>Tu pieza, en buenas manos.</strong>
          </div>
          <div className="showcase-card showcase-small showcase-top">
            <FaGem />
            <span>Joyas</span>
          </div>
          <div className="showcase-card showcase-small showcase-bottom">
            <FaWrench />
            <span>Servicio experto</span>
          </div>
        </div>
      </section>

      <section className="public-services">
        <div>
          <span className="eyebrow">NUESTRO SERVICIO</span>
          <h2>Una experiencia más clara para cada pieza.</h2>
        </div>
        <div className="public-service-grid">
          <article><FaWrench /><h3>Mantenimiento</h3><p>Solicita una revisión y consulta cada avance.</p></article>
          <article><FaClock /><h3>Relojería</h3><p>Cuidamos mecanismos, correas y detalles de precisión.</p></article>
          <article><FaGem /><h3>Joyería</h3><p>Valoración y atención personalizada para tus piezas.</p></article>
        </div>
      </section>
    </main>
  );
}
