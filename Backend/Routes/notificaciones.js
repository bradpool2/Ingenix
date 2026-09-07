import express from 'express';
import conexion from '../config/db.js';
import { verificarToken, soloAdmin } from '../Middleware/Auth.js';
import { crearNotificacion } from '../Services/notificaciones.js';

const router = express.Router();

const enviarError = (res, error) => {
  console.error('❌ Error en notificaciones:', error.message);
  res.status(500).json({ error: 'No fue posible procesar la notificación.' });
};

// Obtener las notificaciones del usuario autenticado.
router.get('/notificaciones', verificarToken, (req, res) => {
  const query = `
    SELECT
      n.idnotificacion,
      n.titulo,
      n.mensaje,
      n.tipo,
      n.rol_destino,
      n.idsolicitud,
      n.prioridad,
      n.requiere_accion,
      n.created_at,
      nu.leida,
      nu.leida_at,
      nu.recibida_at
    FROM notificacion_usuario nu
    INNER JOIN notificacion n ON n.idnotificacion = nu.id_notificacion
    WHERE nu.id_usuario = ?
    ORDER BY n.created_at DESC
    LIMIT 100
  `;

  conexion.query(query, [req.usuario.id], (error, resultados) => {
    if (error) return enviarError(res, error);
    res.json(resultados);
  });
});

// Obtener solamente el contador de notificaciones pendientes.
router.get('/notificaciones/no-leidas', verificarToken, (req, res) => {
  conexion.query(
    `SELECT COUNT(*)::integer AS total
     FROM notificacion_usuario
     WHERE id_usuario = ? AND leida = FALSE`,
    [req.usuario.id],
    (error, resultados) => {
      if (error) return enviarError(res, error);
      res.json({ total: resultados[0]?.total || 0 });
    }
  );
});

// Marcar una notificación como leída solo para el usuario autenticado.
router.put('/notificaciones/:id/leida', verificarToken, (req, res) => {
  conexion.query(
    `UPDATE notificacion_usuario
     SET leida = TRUE, leida_at = CURRENT_TIMESTAMP
     WHERE id_notificacion = ? AND id_usuario = ?`,
    [req.params.id, req.usuario.id],
    (error, resultados) => {
      if (error) return enviarError(res, error);
      if (resultados.affectedRows === 0) {
        return res.status(404).json({ message: 'Notificación no encontrada.' });
      }
      res.json({ message: 'Notificación marcada como leída.' });
    }
  );
});

router.put('/notificaciones/:id/accion', verificarToken, (req, res) => {
  const { accion } = req.body;
  const accionesValidas = ['aceptar', 'en-proceso', 'terminado'];
  if (!accionesValidas.includes(accion)) {
    return res.status(400).json({ message: 'Acción de notificación no válida.' });
  }

  const estado = {
    aceptar: 'En proceso',
    'en-proceso': 'En proceso',
    terminado: 'Terminado',
  }[accion];

  conexion.query(
    `SELECT n.idsolicitud
     FROM notificacion_usuario nu
     INNER JOIN notificacion n ON n.idnotificacion = nu.id_notificacion
     WHERE n.idnotificacion = ? AND nu.id_usuario = ?`,
    [req.params.id, req.usuario.id],
    (error, notificaciones) => {
      if (error) return enviarError(res, error);
      const idSolicitud = notificaciones[0]?.idsolicitud;
      if (!idSolicitud) return res.status(404).json({ message: 'Solicitud asociada no encontrada.' });

      conexion.query(
        `UPDATE solicitud
         SET estado = ?, tecnico_asignado = ?
         WHERE idsolicitud = ? AND (tecnico_asignado IS NULL OR tecnico_asignado = '')`,
        [estado, req.usuario.id, idSolicitud],
        (updateError, resultado) => {
          if (updateError) return enviarError(res, updateError);
          if (resultado.affectedRows === 0) {
            return res.status(409).json({ message: 'La solicitud ya fue tomada por otro técnico.' });
          }

          conexion.query(
            `UPDATE notificacion_usuario
             SET leida = TRUE, leida_at = CURRENT_TIMESTAMP
             WHERE id_notificacion = ? AND id_usuario = ?`,
            [req.params.id, req.usuario.id],
            (readError) => {
              if (readError) return enviarError(res, readError);
              res.json({ message: 'Solicitud aceptada correctamente.', idSolicitud, estado });
            }
          );
        }
      );
    }
  );
});

// Marcar todas las notificaciones pendientes del usuario como leídas.
router.put('/notificaciones/marcar-todas-leidas', verificarToken, (req, res) => {
  conexion.query(
    `UPDATE notificacion_usuario
     SET leida = TRUE, leida_at = CURRENT_TIMESTAMP
     WHERE id_usuario = ? AND leida = FALSE`,
    [req.usuario.id],
    (error, resultados) => {
      if (error) return enviarError(res, error);
      res.json({
        message: 'Notificaciones marcadas como leídas.',
        actualizadas: resultados.affectedRows,
      });
    }
  );
});

// Crear una notificación y entregarla a todos los usuarios del rol indicado.
router.post('/notificaciones', verificarToken, soloAdmin, (req, res) => {
  const {
    titulo,
    mensaje,
    tipo = 'sistema',
    rol_destino: rolDestino,
    idSolicitud = null,
    prioridad = 'normal',
    requiere_accion: requiereAccion = false,
  } = req.body;

  if (!titulo?.trim() || !mensaje?.trim() || !rolDestino) {
    return res.status(400).json({
      message: 'titulo, mensaje y rol_destino son obligatorios.',
    });
  }

  const usuarioIds = req.body.usuario_ids || (req.body.usuario_id ? [req.body.usuario_id] : []);
  crearNotificacion({
    titulo: titulo.trim(),
    mensaje: mensaje.trim(),
    tipo,
    rolDestino,
    usuarioIds,
    idSolicitud,
    prioridad,
    requiereAccion,
  })
    .then((resultado) => res.status(201).json({
      message: 'Notificación creada y entregada correctamente.',
      ...resultado,
    }))
    .catch((error) => enviarError(res, error));
});

router.get('/notificaciones/tecnicos', verificarToken, soloAdmin, (req, res) => {
  conexion.query(
    `SELECT u.idusuario AS "idUsuario", u.nombre
     FROM usuario u
     INNER JOIN rol r ON r.idrol = u.rol_idrol
     WHERE LOWER(r.nombrerol) = 'tecnico'
     ORDER BY u.nombre`,
    (error, resultados) => {
      if (error) return enviarError(res, error);
      res.json(resultados);
    }
  );
});

export default router;
