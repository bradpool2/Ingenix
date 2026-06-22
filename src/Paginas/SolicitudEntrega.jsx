import { useState, useEffect } from 'react';
import '../CSS/Solicitudes.css';

const COLORES_ESTADO = {
  'Pendiente': '#888',
  'En proceso': '#E6A817',
  'Terminado': '#2E7D32',
  'En revision': '#7B1FA2',
  'Aprobado': '#1565C0',
  'Entregado': '#222',
  'Cancelado': '#C62828',
};

const COLORES_URGENCIA = {
  'Baja': '#888',
  'Media': '#E6A817',
  'Alta': '#C62828',
};

const SIGUIENTE_ESTADO_TECNICO = {
  'Pendiente': 'En proceso',
  'En proceso': 'Terminado',
};

const SIGUIENTE_ESTADO_ADMIN = {
  'En revision': 'Aprobado',
  'Aprobado': 'Entregado',
};

export default function SolicitudEntrega() {
  const userString = localStorage.getItem('user');
  const usuario = userString ? JSON.parse(userString) : null;
  const rol = usuario?.rol || '';
  const nombreUsuario = usuario?.user || '';

  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState('Pendiente');
  const [busqueda, setBusqueda] = useState('');
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [observacion, setObservacion] = useState('');
  const [modalDevolver, setModalDevolver] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [modalAsignar, setModalAsignar] = useState(null);
  const [tecnicoElegido, setTecnicoElegido] = useState('');
  const [urgenciaElegida, setUrgenciaElegida] = useState('Media');

  useEffect(() => {
    cargarSolicitudes();
  }, []);
  useEffect(() => {
    cargarSolicitudes();
    cargarTecnicos();
  }, []);
  
  const cargarTecnicos = async () => {
    try {
      const res = await fetch('http://localhost:3000/usuarios/tecnicos');
      const data = await res.json();
      setTecnicos(data);
    } catch (err) {
      console.error('Error al cargar técnicos:', err);
    }
  };

  const cargarSolicitudes = async () => {
    try {
      const res = await fetch('http://localhost:3000/solicitudes');
      const data = await res.json();
      setSolicitudes(data);
    } catch (err) {
      console.error('Error al cargar solicitudes:', err);
    }
  };

  const buscarPorOrden = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setErrorBusqueda('');
    setResultadoBusqueda(null);
    try {
      const res = await fetch(`http://localhost:3000/solicitudes/${busqueda.trim()}`);
      if (!res.ok) {
        setErrorBusqueda('No se encontró ninguna solicitud con ese número.');
        return;
      }
      const data = await res.json();
      setResultadoBusqueda(data);
    } catch {
      setErrorBusqueda('Error al buscar la solicitud.');
    } finally {
      setBuscando(false);
    }
  };

  const cambiarEstado = async (id, nuevoEstado, opciones = {}) => {
    try {
      const body = { estado: nuevoEstado, ...opciones };
      const res = await fetch(`http://localhost:3000/solicitudes/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await cargarSolicitudes();
        if (resultadoBusqueda?.idSolicitud === id) {
          setResultadoBusqueda(prev => ({ ...prev, estado: nuevoEstado, ...opciones }));
        }
        setModalDevolver(null);
        setObservacion('');
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };
  const asignarCaso = async () => {
    if (!modalAsignar) return;
    try {
      const res = await fetch(`http://localhost:3000/solicitudes/${modalAsignar.idSolicitud}/asignar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tecnico_asignado: tecnicoElegido,
          urgencia: urgenciaElegida
        })
      });
      if (res.ok) {
        await cargarSolicitudes();
        setModalAsignar(null);
        setTecnicoElegido('');
        setUrgenciaElegida('Media');
      }
    } catch (err) {
      console.error('Error al asignar caso:', err);
    }
  };

  const filtrosPorRol = () => {
    if (rol === 'admin') {
      return ['Pendiente', 'En proceso', 'Terminado', 'En revision', 'Aprobado', 'Entregado', 'Cancelado'];
    }
    return ['Pendiente', 'En proceso', 'Terminado'];
  };

  const solicitudesFiltradas = solicitudes.filter(s => s.estado === filtro);

  const TarjetaSolicitud = ({ solicitud }) => (
    <div className="tarjeta-entrega">
      <div className="tarjeta-entrega-header">
        <span className="orden-numero">Orden #{solicitud.idSolicitud}</span>
        <span
          className="estado-badge"
          style={{ background: COLORES_ESTADO[solicitud.estado] }}
        >
          {solicitud.estado}
        </span>
      </div><div className="tarjeta-entrega-body">
  <p>
    <span className="label-campo">Urgencia:</span>{' '}
    <span className="urgencia-badge" style={{ background: COLORES_URGENCIA[solicitud.urgencia] || '#888' }}>
      {solicitud.urgencia || 'Media'}
    </span>
  </p>
  <p><span className="label-campo">Técnico asignado:</span> {solicitud.tecnico_asignado || '—'}</p>
  <p><span className="label-campo">Fecha:</span> {new Date(solicitud.fecha_registro).toLocaleDateString('es-CO')}</p>
  <p><span className="label-campo">Servicios:</span> {solicitud.servicios || '—'}</p>
  <p><span className="label-campo">Total:</span> ${solicitud.total_estimado?.toLocaleString('es-CO')} COP</p>
  {solicitud.observacion_admin && (
    <p className="observacion-admin">
      <span className="label-campo">Observación admin:</span> {solicitud.observacion_admin}
    </p>
  )}
</div>

      

      <div className="tarjeta-entrega-footer">

        {rol === 'tecnico' && SIGUIENTE_ESTADO_TECNICO[solicitud.estado] && (
          <button
            className="btn-cambiar-estado"
            onClick={() => cambiarEstado(
              solicitud.idSolicitud,
              SIGUIENTE_ESTADO_TECNICO[solicitud.estado],
              solicitud.estado === 'Pendiente' ? { tecnico_asignado: nombreUsuario } : {}
            )}
          >
            {solicitud.estado === 'Pendiente' ? 'Tomar solicitud' : 'Marcar como Terminado'}
          </button>
        )}

        {rol === 'tecnico' && solicitud.estado === 'Terminado' && (
          <button
            className="btn-cambiar-estado"
            onClick={() => cambiarEstado(solicitud.idSolicitud, 'En revision')}
          >
            Enviar a revisión
          </button>
        )}

        {rol === 'admin' && SIGUIENTE_ESTADO_ADMIN[solicitud.estado] && (
          <button
            className="btn-cambiar-estado"
            onClick={() => cambiarEstado(solicitud.idSolicitud, SIGUIENTE_ESTADO_ADMIN[solicitud.estado])}
          >
            {solicitud.estado === 'En revision' ? 'Aprobar' : 'Confirmar entrega'}
          </button>
        )}
        

        {rol === 'admin' && solicitud.estado === 'En revision' && (
          <button
            className="btn-cancelar"
            onClick={() => setModalDevolver(solicitud)}
          >
            Devolver al técnico
          </button>
        )}
        {rol === 'admin' && !['Entregado', 'Cancelado'].includes(solicitud.estado) && (
  <button
    className="btn-cambiar-estado"
    onClick={() => {
      setModalAsignar(solicitud);
      setTecnicoElegido(solicitud.tecnico_asignado || '');
      setUrgenciaElegida(solicitud.urgencia || 'Media');
    }}
  >
    Asignar
  </button>
)}

        {rol === 'admin' && !['Entregado', 'Cancelado'].includes(solicitud.estado) && (
          <button
            className="btn-cancelar"
            onClick={() => cambiarEstado(solicitud.idSolicitud, 'Cancelado')}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="entrega-contenedor">
      {modalAsignar && (
  <div className="modal-overlay">
    <div className="modal-caja">
      <p className="formulario-titulo">Asignar caso</p>
      <p className="formulario-subtitulo">Orden #{modalAsignar.idSolicitud}</p>

      <label className="seccion-label">Técnico</label>
      <select
        className="formulario-campo"
        value={tecnicoElegido}
        onChange={(e) => setTecnicoElegido(e.target.value)}
      >
        <option value="">Selecciona un técnico</option>
        {tecnicos.map(t => (
          <option key={t.idUsuario} value={t.nombre}>{t.nombre}</option>
        ))}
      </select>

      <label className="seccion-label">Urgencia</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {['Baja', 'Media', 'Alta'].map(u => (
          <div
            key={u}
            className={`btn-subtipo ${urgenciaElegida === u ? 'sel' : ''}`}
            onClick={() => setUrgenciaElegida(u)}
            style={{ cursor: 'pointer' }}
          >
            {u}
          </div>
        ))}
      </div>

      <div className="modal-botones">
        <button className="btn-atras" onClick={() => setModalAsignar(null)}>
          Cancelar
        </button>
        <button
          className="btn-cambiar-estado"
          disabled={!tecnicoElegido}
          onClick={asignarCaso}
        >
          Asignar
        </button>
      </div>
    </div>
  </div>
)}

      {modalDevolver && (
        <div className="modal-overlay">
          <div className="modal-caja">
            <p className="formulario-titulo">Devolver al técnico</p>
            <p className="formulario-subtitulo">Orden #{modalDevolver.idSolicitud}</p>
            <textarea
              className="formulario-campo"
              placeholder="Describe qué debe corregir el técnico..."
              rows={4}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
            <div className="modal-botones">
              <button className="btn-atras" onClick={() => { setModalDevolver(null); setObservacion(''); }}>
                Cancelar
              </button>
              <button
                className="btn-cambiar-estado"
                disabled={!observacion.trim()}
                onClick={() => cambiarEstado(modalDevolver.idSolicitud, 'En proceso', { observacion_admin: observacion })}
              >
                Devolver
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="entrega-buscador">
        <p className="formulario-titulo">Solicitud de Entrega</p>
        <p className="formulario-subtitulo">Busca por número de orden o filtra por estado</p>
        <div className="buscador-fila">
          <input
            className="formulario-campo"
            type="text"
            placeholder="Número de orden Ej: 12345"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setResultadoBusqueda(null); setErrorBusqueda(''); }}
            onKeyDown={(e) => e.key === 'Enter' && buscarPorOrden()}
          />
          <button className="btn-siguiente" onClick={buscarPorOrden} disabled={buscando}>
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {errorBusqueda && <p className="error-busqueda">{errorBusqueda}</p>}
        {resultadoBusqueda && <TarjetaSolicitud solicitud={resultadoBusqueda} />}
      </div>

      <div className="entrega-filtros">
        {filtrosPorRol().map(e => (
          <button
            key={e}
            className={`filtro-btn ${filtro === e ? 'activo' : ''}`}
            onClick={() => setFiltro(e)}
          >
            {e}
            <span className="filtro-count">
              {solicitudes.filter(s => s.estado === e).length}
            </span>
          </button>
        ))}
      </div>

      <div className="entrega-lista">
        {solicitudesFiltradas.length === 0
          ? <p className="resumen-vacio">No hay solicitudes en estado "{filtro}"</p>
          : solicitudesFiltradas.map(s => (
              <TarjetaSolicitud key={s.idSolicitud} solicitud={s} />
            ))
        }
      </div>

    </div>
  );
}