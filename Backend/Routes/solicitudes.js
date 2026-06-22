import express from 'express';
import conexion from '../config/db.js';

const router = express.Router();

// Crear solicitud
router.post('/solicitudes', (req, res) => {
  const { orden, tipo, subtipo, danos, services, total, fecha } = req.body;

  const querySolicitud = `
    INSERT INTO solicitud (
      numeroOrden,
      fecha_registro,
      total_estimado,
      TipoDeSolicitud_idDeSolicitud
    )
    VALUES (
      ?,
      STR_TO_DATE(?, '%d/%m/%Y'),
      ?,
      1
    )
  `;

  conexion.query(querySolicitud, [orden, fecha, total], (err, resultSolicitud) => {
    if (err) {
      console.error('❌ Error al insertar en solicitud:', err.message);
      return res.status(500).json({ error: err.message });
    }

    const idSolicitud = resultSolicitud.insertId;

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
        [idProductoAsignado, idSolicitud, 1, servicio.nombre],
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
router.post('/solicitudes/cliente', (req, res) => {
  const { tipo, descripcion, cliente_idCliente } = req.body;

  if (!tipo || !descripcion || !cliente_idCliente) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  const ordenGenerada = Math.floor(Math.random() * 90000) + 10000;

  const query = `
    INSERT INTO solicitud (idSolicitud, fecha_registro, cliente_idCliente, estado, TipoDeSolicitud_idDeSolicitud)
    VALUES (?, NOW(), ?, 'Pendiente', 1)
  `;

  conexion.query(query, [ordenGenerada, cliente_idCliente], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const idProductoAsignado = tipo === 'reloj' ? 1 : 2;

    const queryRelacion = `
      INSERT INTO producto_y_solicitud (producto_idProducto, solicitud_idSolicitud, Cantidad, detalle_servicio)
      VALUES (?, ?, ?, ?)
    `;

    conexion.query(queryRelacion, [idProductoAsignado, ordenGenerada, 1, descripcion], (errRelacion) => {
      if (errRelacion) return res.status(500).json({ error: errRelacion.message });
      res.status(201).json({ message: 'Solicitud enviada correctamente', idSolicitud: ordenGenerada });
    });
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
// Reporte financiero — semana / mes / año
router.get('/reportes/financiero', (req, res) => {
  const { rango } = req.query; // 'semana', 'mes', 'anio'

  let formatoFecha;
  if (rango === 'semana') {
    formatoFecha = '%Y-%u'; // año-semana
  } else if (rango === 'anio') {
    formatoFecha = '%Y';
  } else {
    formatoFecha = '%Y-%m'; // mes por defecto
  }

  const query = `
    SELECT 
      DATE_FORMAT(s.fecha_registro, ?) AS periodo,
      s.TipoDeSolicitud_idDeSolicitud AS tipo,
      SUM(s.total_estimado) AS total
    FROM solicitud s
    WHERE s.estado = 'Entregado'
    GROUP BY periodo, tipo
    ORDER BY periodo ASC
  `;

  conexion.query(query, [formatoFecha], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const datosAgrupados = {};

    results.forEach(row => {
      if (!datosAgrupados[row.periodo]) {
        datosAgrupados[row.periodo] = { periodo: row.periodo, mantenimiento: 0, venta: 0 };
      }
      if (row.tipo === 1) datosAgrupados[row.periodo].mantenimiento = Number(row.total) || 0;
      if (row.tipo === 4) datosAgrupados[row.periodo].venta = Number(row.total) || 0;
    });

    res.json(Object.values(datosAgrupados));
  });
});

// Totales generales (para las tarjetas resumen)
router.get('/reportes/financiero/totales', (req, res) => {
  const query = `
    SELECT 
      s.TipoDeSolicitud_idDeSolicitud AS tipo,
      SUM(s.total_estimado) AS total,
      COUNT(*) AS cantidad
    FROM solicitud s
    WHERE s.estado = 'Entregado'
    GROUP BY tipo
  `;

  conexion.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const resumen = { mantenimiento: { total: 0, cantidad: 0 }, venta: { total: 0, cantidad: 0 } };

    results.forEach(row => {
      if (row.tipo === 1) resumen.mantenimiento = { total: Number(row.total) || 0, cantidad: row.cantidad };
      if (row.tipo === 4) resumen.venta = { total: Number(row.total) || 0, cantidad: row.cantidad };
    });

    res.json(resumen);
  });
});

export default router;