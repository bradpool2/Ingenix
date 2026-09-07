import { useEffect, useState } from 'react';
import { authFetch } from '../components/api.js';
import '../CSS/AdminPanel.css';

const estadoInicial = {
  titulo: '',
  mensaje: '',
  tipo: 'sistema',
  rol_destino: 'tecnico',
  prioridad: 'normal',
  requiere_accion: false,
};

export default function NotificacionesAdmin() {
  const [formulario, setFormulario] = useState(estadoInicial);
  const [estado, setEstado] = useState({ tipo: '', mensaje: '' });
  const [enviando, setEnviando] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);
  const [destino, setDestino] = useState('rol');

  useEffect(() => {
    authFetch('http://localhost:3000/notificaciones/tecnicos')
      .then((response) => response.ok ? response.json() : [])
      .then(setTecnicos)
      .catch((error) => console.error('No se pudieron cargar los técnicos:', error));
  }, []);

  const actualizarCampo = (event) => {
    const { name, value, type, checked } = event.target;
    setFormulario((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const crearNotificacion = async (event) => {
    event.preventDefault();
    setEnviando(true);
    setEstado({ tipo: '', mensaje: '' });

    try {
      const payload = destino === 'tecnico-especifico'
        ? { ...formulario, rol_destino: 'tecnico', usuario_id: formulario.usuario_id }
        : formulario;
      const response = await authFetch('http://localhost:3000/notificaciones', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setEstado({ tipo: 'error', mensaje: data.message || 'No se pudo crear la notificación.' });
        return;
      }

      setFormulario(estadoInicial);
      setEstado({
        tipo: 'exito',
        mensaje: `Notificación enviada a ${data.destinatarios} usuario(s).`,
      });
    } catch (error) {
      console.error('Error al crear notificación:', error);
      setEstado({ tipo: 'error', mensaje: 'No se pudo conectar con el servidor.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="notificaciones-admin">
      <div className="notificaciones-admin-header">
        <div>
          <h2>Crear notificación</h2>
          <p>Envía avisos a todos los usuarios de un rol.</p>
        </div>
      </div>

      <form className="form-crear-notificacion" onSubmit={crearNotificacion}>
        <div className="grid-inputs">
          <input
            name="titulo"
            value={formulario.titulo}
            onChange={actualizarCampo}
            placeholder="Título"
            maxLength="150"
            required
          />
          <select name="rol_destino" value={formulario.rol_destino} onChange={actualizarCampo}>
            <option value="tecnico">Técnicos</option>
            <option value="admin">Administradores</option>
            <option value="cliente">Clientes</option>
          </select>
          {formulario.rol_destino === 'tecnico' && (
            <select value={destino} onChange={(event) => {
              setDestino(event.target.value);
              setFormulario((actual) => ({ ...actual, usuario_id: '' }));
            }}>
              <option value="rol">Todos los técnicos</option>
              <option value="tecnico-especifico">Técnico específico</option>
            </select>
          )}
          {destino === 'tecnico-especifico' && formulario.rol_destino === 'tecnico' && (
            <select
              name="usuario_id"
              value={formulario.usuario_id || ''}
              onChange={actualizarCampo}
              required
            >
              <option value="">Selecciona un técnico</option>
              {tecnicos.map((tecnico) => (
                <option key={tecnico.idUsuario} value={tecnico.idUsuario}>{tecnico.nombre}</option>
              ))}
            </select>
          )}
          <select name="prioridad" value={formulario.prioridad} onChange={actualizarCampo}>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>

        <textarea
          name="mensaje"
          value={formulario.mensaje}
          onChange={actualizarCampo}
          placeholder="Escribe el mensaje..."
          rows="5"
          required
        />

        <label className="notificacion-check">
          <input
            type="checkbox"
            name="requiere_accion"
            checked={formulario.requiere_accion}
            onChange={actualizarCampo}
          />
          Requiere acción del destinatario
        </label>

        <button className="btn-guardar" type="submit" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar notificación'}
        </button>

        {estado.mensaje && (
          <p className={`notificacion-estado ${estado.tipo}`}>{estado.mensaje}</p>
        )}
      </form>
    </section>
  );
}
