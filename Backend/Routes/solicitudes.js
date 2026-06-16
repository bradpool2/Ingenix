import express from 'express';
import conexion from '../config/db.js';

const router = express.Router();

// Crear solicitud
router.post('/solicitudes', (req, res) => {
  const { orden, tipo, subtipo, danos, services, total, fecha } = req.body;

  const ordenLimpia = parseInt(orden.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 90000) + 10000;

  const querySolicitud = `
    INSERT INTO solicitud (idSolicitud, fecha_registro, total_estimado)
    VALUES (?, STR_TO_DATE(?, '%d/%m/%Y'), ?)
  `;

  conexion.query(querySolicitud, [ordenLimpia, fecha, total], (err, resultSolicitud) => {
    if (err) {
      console.error('❌ Error al insertar en solicitud:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!services || services.length === 0) {
      return res.status(201).json({ message: 'Solicitud guardada correctamente sin servicios' });
    }

    const idProductoAsignado = tipo === 'reloj' ? 1 : 2;

    const queryRelacion = `
      INSERT INTO producto_y_solicitud (producto_idProducto, solicitud_idSolicitud, Cantidad, detalle_servicio)
      VALUES (?, ?, ?, ?)
    `;

    let completados = 0;
    let huboError = false;

    services.forEach((servicio) => {
      conexion.query(
        queryRelacion,
        [idProductoAsignado, ordenLimpia, 1, servicio.nombre],
        (errRelacion) => {
          if (huboError) return;
          if (errRelacion) {
            huboError = true;
            return res.status(500).json({ error: errRelacion.message });
          }
          completados++;
          if (completados === services.length) {
            res.status(201).json({ message: 'Solicitud guardada correctamente' });
          }
        }
      );
    });
  });
});

// Traer todas las solicitudes
router.get('/solicitudes', (req, res) => {
  const query = `
    SELECT 
      s.idSolicitud,
      s.fecha_registro,
      s.total_estimado,
      s.estado,
      s.nombreTecnico,
      s.tecnico_asignado,
      s.observacion_admin,
      s.cliente_idCliente,
      GROUP_CONCAT(ps.detalle_servicio SEPARATOR ', ') AS servicios
    FROM solicitud s
    LEFT JOIN producto_y_solicitud ps ON ps.solicitud_idSolicitud = s.idSolicitud
    GROUP BY s.idSolicitud
    ORDER BY s.fecha_registro DESC
  `;

  conexion.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Buscar solicitud por id
router.get('/solicitudes/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      s.idSolicitud,
      s.fecha_registro,
      s.total_estimado,
      s.estado,
      s.nombreTecnico,
      s.tecnico_asignado,
      s.observacion_admin,
      s.cliente_idCliente,
      GROUP_CONCAT(ps.detalle_servicio SEPARATOR ', ') AS servicios
    FROM solicitud s
    LEFT JOIN producto_y_solicitud ps ON ps.solicitud_idSolicitud = s.idSolicitud
    WHERE s.idSolicitud = ?
    GROUP BY s.idSolicitud
  `;

  conexion.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(results[0]);
  });
});

// Cambiar estado
router.put('/solicitudes/:id/estado', (req, res) => {
  const { id } = req.params;
  const { estado, tecnico_asignado, observacion_admin } = req.body;

  const estadosValidos = ['Pendiente', 'En proceso', 'Terminado', 'En revision', 'Aprobado', 'Entregado', 'Cancelado'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  let query = `UPDATE solicitud SET estado = ?`;
  const params = [estado];

  if (tecnico_asignado) {
    query += `, tecnico_asignado = ?`;
    params.push(tecnico_asignado);
  }

  if (observacion_admin) {
    query += `, observacion_admin = ?`;
    params.push(observacion_admin);
  }

  query += ` WHERE idSolicitud = ?`;
  params.push(id);

  conexion.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ message: 'Estado actualizado correctamente' });
  });
});

export default router;