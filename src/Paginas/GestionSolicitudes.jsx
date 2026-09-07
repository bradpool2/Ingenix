import { useEffect, useState } from 'react';
import { authFetch } from '../components/api.js';

export default function GestionSolicitudes({ tipo = 'venta' }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    const respuesta = await authFetch('http://localhost:3000/solicitudes');
    const datos = await respuesta.json();
    setSolicitudes(Array.isArray(datos) ? datos : []);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const cambiarEstado = async (idSolicitud, estado) => {
    const respuesta = await authFetch(`http://localhost:3000/solicitudes/${idSolicitud}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    });
    if (!respuesta.ok) {
      const error = await respuesta.json().catch(() => ({}));
      alert(error.message || error.error || 'No se pudo actualizar la solicitud.');
      return;
    }
    cargar();
  };

  const visibles = solicitudes.filter((solicitud) => (
    tipo === 'venta' ? solicitud.tipo === 'Venta' : solicitud.estado === 'Aprobado'
  ));

  if (cargando) return <p>Cargando solicitudes...</p>;

  return (
    <section className="seccion-actividad-reciente">
      <h2>{tipo === 'venta' ? 'Solicitudes de venta' : 'Solicitudes de almacenado'}</h2>
      {visibles.length === 0 ? <p>No hay solicitudes para mostrar.</p> : (
        <table className="tabla-dashboard">
          <thead><tr><th>Orden</th><th>Cliente</th><th>Artículo / detalle</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead>
          <tbody>{visibles.map((solicitud) => (
            <tr key={solicitud.idSolicitud}>
              <td>#{solicitud.numeroOrden || solicitud.idSolicitud}</td>
              <td>{solicitud.clienteNombre || '—'}</td>
              <td>{solicitud.servicios || '—'}</td>
              <td>{solicitud.estado}</td>
              <td>{solicitud.fechaRegistro ? new Date(solicitud.fechaRegistro).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '—'}</td>
              <td>
                {tipo === 'venta' && (
                  <select
                    value={solicitud.estado}
                    onChange={(event) => cambiarEstado(solicitud.idSolicitud, event.target.value)}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En proceso">En revisión</option>
                    <option value="Aprobado">Aprobar</option>
                    <option value="Cancelado">Rechazar</option>
                  </select>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </section>
  );
}
