import { useEffect, useState } from 'react';
import { authFetch } from '../components/api.js';

export default function GestionSolicitudes({ tipo = 'venta' }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [detalle, setDetalle] = useState(null);
  const [precioFinal, setPrecioFinal] = useState('');
  const [contraoferta, setContraoferta] = useState('');
  const [comentarioContraoferta, setComentarioContraoferta] = useState('');
  const [guardandoContraoferta, setGuardandoContraoferta] = useState(false);

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

  const verDetalle = async (idSolicitud) => {
    const respuesta = await authFetch(`http://localhost:3000/solicitudes/${idSolicitud}`);
    const datos = await respuesta.json();
    if (respuesta.ok) {
      setDetalle(datos);
      setPrecioFinal(datos.precioFinal ?? '');
      setContraoferta(datos.contraoferta ?? '');
      setComentarioContraoferta(datos.comentarioContraoferta ?? '');
    }
  };

  const guardarContraoferta = async () => {
    setGuardandoContraoferta(true);
    const respuesta = await authFetch(`http://localhost:3000/solicitudes/${detalle.idSolicitud}/contraoferta`, {
      method: 'POST',
      body: JSON.stringify({ monto: Number(contraoferta), comentario: comentarioContraoferta }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setGuardandoContraoferta(false);
    if (!respuesta.ok) {
      alert(datos.error || 'No se pudo guardar la contraoferta.');
      return;
    }
    setDetalle({ ...detalle, contraoferta: Number(contraoferta), comentarioContraoferta });
    alert('Contraoferta enviada al cliente.');
  };

  const guardarPrecioFinal = async () => {
    const respuesta = await authFetch(`http://localhost:3000/solicitudes/${detalle.idSolicitud}/venta`, {
      method: 'PUT',
      body: JSON.stringify({ precioFinal: precioFinal === '' ? null : Number(precioFinal) }),
    });
    if (!respuesta.ok) {
      const error = await respuesta.json().catch(() => ({}));
      alert(error.error || 'No se pudo guardar el precio final.');
      return;
    }
    setDetalle({ ...detalle, precioFinal: precioFinal === '' ? null : Number(precioFinal) });
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
          <thead><tr><th>Orden</th><th>Cliente</th><th>Artículo / detalle</th><th>Fecha</th><th>Acciones</th></tr></thead>
          <tbody>{visibles.map((solicitud) => (
            <tr key={solicitud.idSolicitud}>
              <td>#{solicitud.numeroOrden || solicitud.idSolicitud}</td>
              <td>{solicitud.clienteNombre || '—'}</td>
              <td>{solicitud.servicios || '—'}</td>
              <td>{solicitud.fechaRegistro ? new Date(solicitud.fechaRegistro).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '—'}</td>
              <td>
              {tipo === 'venta' && <>
                <button className="btn-solicitud-detalle" type="button" onClick={() => verDetalle(solicitud.idSolicitud)}>Ver detalle</button>
                <select className="select-accion-solicitud" aria-label="Cambiar acción de la solicitud" value={solicitud.estado} onChange={(event) => cambiarEstado(solicitud.idSolicitud, event.target.value)}>
                    <option value="Pendiente">Recibida</option>
                    <option value="En revision">En revisión de oferta</option>
                    <option value="Aprobado">Oferta aprobada</option>
                    <option value="Cancelado">Oferta rechazada</option>
                  </select>
                </>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
      {detalle && (
        <div className="modal-overlay" role="presentation" onClick={() => setDetalle(null)}>
          <div className="modal-contenido" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="btn-modal-cerrar" type="button" onClick={() => setDetalle(null)}>Cerrar</button>
            <h3>Solicitud #{detalle.numeroOrden || detalle.idSolicitud}</h3>
            <p><strong>Cliente:</strong> {detalle.clienteNombre || '—'}</p>
            <p><strong>Artículo:</strong> {detalle.nombreArticulo || '—'}</p>
            <p><strong>Descripción:</strong> {detalle.descripcion || '—'}</p>
            <p><strong>Estado del artículo:</strong> {detalle.estadoArticulo || '—'}</p>
            <p><strong>Precio ofrecido por el cliente:</strong> {detalle.precioCliente == null ? 'No especificado' : `$${Number(detalle.precioCliente).toLocaleString('es-CO')} COP`}</p>
            <div className="seccion-contraoferta">
              <h4>Contraoferta</h4>
              <label className="campo-precio-final">
                Monto propuesto:
                <input type="number" min="0" value={contraoferta} onChange={(event) => setContraoferta(event.target.value)} />
              </label>
              <label className="campo-precio-final">
                Mensaje para el cliente:
                <textarea value={comentarioContraoferta} onChange={(event) => setComentarioContraoferta(event.target.value)} placeholder="Explica las condiciones de la oferta." />
              </label>
              <button className="btn-precio-final" type="button" disabled={guardandoContraoferta} onClick={guardarContraoferta}>
                {guardandoContraoferta ? 'Enviando...' : 'Enviar contraoferta'}
              </button>
            </div>
            <label className="campo-precio-final">
              Precio final de compra:
              <input type="number" min="0" value={precioFinal} onChange={(event) => setPrecioFinal(event.target.value)} />
            </label>
            <button className="btn-precio-final" type="button" onClick={guardarPrecioFinal}>Guardar precio final</button>
            {detalle.imagen && <img src={`http://localhost:3000${detalle.imagen}`} alt="Artículo de la solicitud" style={{ maxWidth: '100%' }} />}
            {Array.isArray(detalle.imagenes) && detalle.imagenes.map((imagen) => (
              <figure key={imagen.tipo}>
                <figcaption>{imagen.tipo === 'frontal' ? 'Parte frontal' : imagen.tipo === 'trasera' ? 'Parte trasera' : 'Imagen del artículo'}</figcaption>
                <img src={`http://localhost:3000${imagen.ruta}`} alt={`Parte ${imagen.tipo} del producto`} style={{ maxWidth: '100%' }} />
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
