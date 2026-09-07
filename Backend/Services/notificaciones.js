import conexion from '../config/db.js';

const query = (sql, params = []) => new Promise((resolve, reject) => {
  conexion.query(sql, params, (error, results) => {
    if (error) reject(error);
    else resolve(results);
  });
});

export const crearNotificacion = async ({
  titulo,
  mensaje,
  tipo = 'sistema',
  rolDestino,
  usuarioIds = [],
  idSolicitud = null,
  prioridad = 'normal',
  requiereAccion = false,
}) => {
  const roles = rolDestino?.toLowerCase() === 'clientes' ? 'cliente' : rolDestino?.toLowerCase();
  const notificaciones = await query(
    `INSERT INTO notificacion
      (titulo, mensaje, tipo, rol_destino, idsolicitud, prioridad, requiere_accion)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [titulo, mensaje, tipo, roles, idSolicitud, prioridad, requiereAccion]
  );
  const idNotificacion = notificaciones[0]?.idnotificacion;

  if (!idNotificacion) throw new Error('No se pudo obtener el ID de la notificación creada.');

  let destinatarios = usuarioIds;
  if (destinatarios.length === 0) {
    const rolesCompatibles = roles === 'cliente' ? ['cliente', 'clientes'] : [roles];
    const placeholders = rolesCompatibles.map(() => '?').join(', ');
    const usuarios = roles === 'todos'
      ? await query('SELECT idusuario FROM usuario')
      : await query(
        `SELECT u.idusuario
         FROM usuario u
         INNER JOIN rol r ON r.idrol = u.rol_idrol
         WHERE LOWER(r.nombrerol) IN (${placeholders})`,
        rolesCompatibles
      );
    destinatarios = usuarios.map((usuario) => usuario.idusuario);
  }

  if (destinatarios.length > 0) {
    const values = destinatarios.map((idUsuario) => [idNotificacion, idUsuario]);
    await query(
      `INSERT INTO notificacion_usuario (id_notificacion, id_usuario)
       VALUES ?`,
      [values]
    );
  }

  return { idNotificacion, destinatarios: destinatarios.length };
};
