import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '../components/api.js';
import '../CSS/PanelSol.css';

const API = 'http://localhost:3000';

export default function SolicitudesAlmacenadas() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [detalle, setDetalle] = useState(null);
  const [ubicacion, setUbicacion] = useState('');
  const [nota, setNota] = useState('');
  const [estadoRevision, setEstadoRevision] = useState('Pendiente');
  const usuario = JSON.parse(localStorage.getItem('user') || 'null');
  const esAdmin = usuario?.rol === 'admin';

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await authFetch(`${API}/solicitudes/almacenado`);
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.message || datos.error || 'No se pudieron cargar las solicitudes.');
      setSolicitudes(Array.isArray(datos) ? datos : []);
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutarArchivado = async () => {
    setEjecutando(true);
    setMensaje('');
    try {
      const respuesta = await authFetch(`${API}/solicitudes/almacenado/ejecutar`, { method: 'POST' });
      const datos = await respuesta.json();
      if (!respuesta.ok && respuesta.status !== 207) {
        throw new Error(datos.message || datos.error || 'No se pudo ejecutar el almacenado automático.');
      }
      setMensaje(datos.message || `Se archivaron ${datos.archivadas} solicitudes.`);
      await cargar();
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setEjecutando(false);
    }
  };

  const abrirDetalle = (solicitud) => {
    setDetalle(solicitud);
    setUbicacion(solicitud.ubicacion || '');
    setNota(solicitud.nota || '');
    setEstadoRevision(solicitud.estadoRevision || 'Pendiente');
  };

  const guardarFicha = async () => {
    const respuesta = await authFetch(`${API}/solicitudes/${detalle.idSolicitud}/almacenado`, {
      method: 'PUT',
      body: JSON.stringify({ ubicacion, nota, estadoRevision }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setMensaje(datos.error || 'No se pudo guardar la ficha.');
      return;
    }
    setSolicitudes((actuales) => actuales.map((solicitud) => (
      solicitud.idSolicitud === detalle.idSolicitud
        ? { ...solicitud, ubicacion, nota, estadoRevision }
        : solicitud
    )));
    setDetalle(null);
    setMensaje('Ficha de inventario guardada.');
  };

  const visibles = solicitudes.filter((solicitud) => {
    const texto = `${solicitud.numeroOrden || ''} ${solicitud.clienteNombre || ''} ${solicitud.servicios || ''}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase()) && (filtro === 'Todos' || (solicitud.estadoRevision || 'Pendiente') === filtro);
  });

  return (
    <section className="seccion-actividad-reciente" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' }}>
        <div>
          <h2>Solicitudes almacenadas</h2>
          <p>Solicitudes enviadas al almacén manualmente o archivadas automáticamente después de 30 días.</p>
        </div>
        {esAdmin && (
          <button type="button" onClick={ejecutarArchivado} disabled={ejecutando}>
            {ejecutando ? 'Archivando...' : 'Ejecutar almacenado automático'}
          </button>
        )}
      </div>
      {mensaje && <p role="status">{mensaje}</p>}
      <div className="filtros-almacenado">
        <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por orden, cliente o producto" />
        <select value={filtro} onChange={(event) => setFiltro(event.target.value)}>
          <option>Todos</option>
          <option>Pendiente</option>
          <option>En revisión</option>
          <option>Listo para publicar</option>
        </select>
      </div>
      {cargando ? <p>Cargando solicitudes...</p> : visibles.length === 0 ? (
        <p>No hay solicitudes almacenadas.</p>
      ) : (
        <table className="tabla-dashboard">
          <thead>
            <tr><th>Orden</th><th>Cliente</th><th>Fecha de registro</th><th>Servicios</th><th>Revisión</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {visibles.map((solicitud) => (
              <tr key={solicitud.idSolicitud}>
                <td>#{solicitud.numeroOrden || solicitud.idSolicitud}</td>
                <td>{solicitud.clienteNombre || '—'}</td>
                <td>{solicitud.fechaRegistro ? new Date(solicitud.fechaRegistro).toLocaleDateString('es-CO') : '—'}</td>
                <td>{solicitud.servicios || '—'}</td>
                <td>{solicitud.estadoRevision || 'Pendiente'}</td>
                <td><button type="button" className="btn-solicitud-detalle" onClick={() => abrirDetalle(solicitud)}>Ver ficha</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {detalle && (
        <div className="modal-overlay" role="presentation" onClick={() => setDetalle(null)}>
          <div className="modal-contenido" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="btn-modal-cerrar" type="button" onClick={() => setDetalle(null)}>Cerrar</button>
            <h3>Ficha de inventario #{detalle.numeroOrden || detalle.idSolicitud}</h3>
            <p><strong>Producto:</strong> {detalle.servicios || '—'}</p>
            <label>Estado de revisión
              <select value={estadoRevision} onChange={(event) => setEstadoRevision(event.target.value)}>
                <option>Pendiente</option>
                <option>En revisión</option>
                <option>Listo para publicar</option>
              </select>
            </label>
            <label>Ubicación física
              <input value={ubicacion} onChange={(event) => setUbicacion(event.target.value)} placeholder="Ej: Vitrina 2, caja A-04" />
            </label>
            <label>Notas internas
              <textarea value={nota} onChange={(event) => setNota(event.target.value)} placeholder="Limpieza, reparación o información para publicar." />
            </label>
            <button type="button" className="btn-precio-final" onClick={guardarFicha}>Guardar ficha</button>
          </div>
        </div>
      )}
    </section>
  );
}
