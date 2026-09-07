const jsonResponse = (description = 'Respuesta JSON') => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/JsonResponse' },
    },
  },
});

const errorResponses = {
  400: { description: 'Solicitud inválida' },
  401: { description: 'Token no proporcionado o sesión inválida' },
  403: { description: 'Sin permisos para realizar la operación' },
  404: { description: 'Recurso no encontrado' },
  500: { description: 'Error interno del servidor' },
};

const bearer = [{ bearerAuth: [] }];
const auth = (operation, secured = true) => ({
  ...operation,
  ...(secured ? { security: bearer } : {}),
  responses: {
    ...errorResponses,
    ...operation.responses,
  },
});

const pathParam = (name, description = 'Identificador del recurso') => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', format: 'int64' },
});

const jsonBody = (schema) => ({
  required: true,
  content: { 'application/json': { schema } },
});

const requestObject = (properties, required = []) => ({
  type: 'object',
  properties,
  required,
});

const id = { type: 'integer', format: 'int64', example: 1 };
const status = {
  type: 'string',
  enum: ['Pendiente', 'En proceso', 'Terminado', 'En revision', 'Aprobado', 'Entregado', 'Cancelado', 'Almacenado'],
};

const userProperties = {
  nombre: { type: 'string', example: 'Brayan Moreno' },
  correo: { type: 'string', format: 'email', example: 'cliente@ejemplo.com' },
  documento: { type: 'string', example: '1000000000' },
  direccion: { type: 'string', example: 'Carrera 10 #20-30' },
  telefono: { type: 'string', pattern: '^\\d{10}$', example: '3001234567' },
  rol_idRol: { type: 'integer', example: 3 },
};

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Ingenix API',
    version: '1.0.0',
    description: 'API del sistema de reparaciones, mantenimiento, ventas y gestión de joyería y relojería Ingenix.',
    contact: { name: 'Ingenix' },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Servidor local' },
  ],
  tags: [
    { name: 'Sistema', description: 'Salud y autenticación' },
    { name: 'Usuarios', description: 'Usuarios, perfiles y técnicos' },
    { name: 'Productos', description: 'Catálogo y categorías' },
    { name: 'Solicitudes', description: 'Mantenimiento, ventas y entregas' },
    { name: 'Dashboard', description: 'Indicadores del taller' },
    { name: 'Reportes', description: 'Reportes financieros y operativos' },
    { name: 'Ventas', description: 'Ventas realizadas desde el carrito' },
    { name: 'Notificaciones', description: 'Notificaciones y acciones pendientes' },
  ],
  paths: {
    '/': {
      get: { tags: ['Sistema'], summary: 'Comprobar disponibilidad de la API', ...jsonResponse('API disponible') },
    },
    '/login': {
      post: {
        tags: ['Sistema'],
        summary: 'Iniciar sesión',
        requestBody: jsonBody(requestObject({
          correo: { type: 'string', format: 'email' },
          pass: { type: 'string', format: 'password' },
        }, ['correo', 'pass'])),
        responses: {
          200: jsonResponse('Token JWT y usuario autenticado'),
          ...errorResponses,
        },
      },
    },
    '/recuperar-password': {
      post: {
        tags: ['Sistema'],
        summary: 'Solicitar recuperación de contraseña',
        requestBody: jsonBody(requestObject({ correo: { type: 'string', format: 'email' } }, ['correo'])),
        responses: { 200: jsonResponse(), ...errorResponses },
      },
    },
    '/restablecer-password': {
      post: {
        tags: ['Sistema'],
        summary: 'Restablecer contraseña con token',
        requestBody: jsonBody(requestObject({
          token: { type: 'string' },
          nuevaPassword: { type: 'string', format: 'password' },
        }, ['token', 'nuevaPassword'])),
        responses: { 200: jsonResponse(), ...errorResponses },
      },
    },
    '/usuarios/registro': {
      post: {
        tags: ['Usuarios'],
        summary: 'Registrar usuario público',
        requestBody: jsonBody(requestObject({ ...userProperties, pass: { type: 'string', format: 'password' } }, ['nombre', 'correo', 'documento', 'pass'])),
        responses: { 201: jsonResponse(), ...errorResponses },
      },
    },
    '/usuario': {
      get: {
        tags: ['Usuarios'],
        summary: 'Buscar usuario por correo o documento',
        parameters: [
          { name: 'correo', in: 'query', schema: { type: 'string', format: 'email' } },
          { name: 'documento', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: jsonResponse(), ...errorResponses },
      },
    },
    '/usuarios': {
      get: auth({ tags: ['Usuarios'], summary: 'Listar usuarios', responses: { 200: jsonResponse() } }),
      post: auth({
        tags: ['Usuarios'],
        summary: 'Crear usuario (administrador)',
        requestBody: jsonBody(requestObject({ ...userProperties, pass: { type: 'string', format: 'password' } }, ['nombre', 'correo', 'documento', 'pass'])),
        responses: { 201: jsonResponse() },
      }),
    },
    '/usuarios/{id}': {
      parameters: [pathParam('id', 'ID del usuario')],
      put: auth({
        tags: ['Usuarios'],
        summary: 'Actualizar perfil de usuario',
        requestBody: jsonBody(requestObject(userProperties, ['nombre', 'correo', 'telefono'])),
        responses: { 200: jsonResponse() },
      }),
      delete: auth({ tags: ['Usuarios'], summary: 'Eliminar usuario', responses: { 200: jsonResponse() } }),
    },
    '/usuarios/tecnicos': {
      get: auth({ tags: ['Usuarios'], summary: 'Listar técnicos', responses: { 200: jsonResponse() } }),
    },
    '/productos': {
      get: auth({ tags: ['Productos'], summary: 'Listar productos', responses: { 200: jsonResponse() } }),
      post: auth({
        tags: ['Productos'],
        summary: 'Crear producto (administrador)',
        requestBody: jsonBody(requestObject({
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          precio: { type: 'number', format: 'double' },
          stock: { type: 'integer' },
        }, ['nombre', 'precio', 'stock'])),
        responses: { 201: jsonResponse() },
      }),
    },
    '/productos/con-categorias': {
      get: { tags: ['Productos'], summary: 'Listar productos con categorías', responses: { 200: jsonResponse(), ...errorResponses } },
    },
    '/productos/{id}': {
      parameters: [pathParam('id', 'ID del producto')],
      put: auth({
        tags: ['Productos'],
        summary: 'Actualizar producto (administrador)',
        requestBody: jsonBody(requestObject({
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          precio: { type: 'number' },
          stock: { type: 'integer' },
        })),
        responses: { 200: jsonResponse() },
      }),
      delete: auth({ tags: ['Productos'], summary: 'Eliminar producto (administrador)', responses: { 200: jsonResponse() } }),
    },
    '/categorias': {
      get: { tags: ['Productos'], summary: 'Listar categorías', responses: { 200: jsonResponse(), ...errorResponses } },
      post: auth({
        tags: ['Productos'],
        summary: 'Crear categoría (administrador)',
        requestBody: jsonBody(requestObject({ nombre: { type: 'string' } }, ['nombre'])),
        responses: { 201: jsonResponse() },
      }),
    },
    '/categorias/{id}': {
      parameters: [pathParam('id', 'ID de la categoría')],
      delete: auth({ tags: ['Productos'], summary: 'Eliminar categoría (administrador)', responses: { 200: jsonResponse() } }),
    },
    '/productos/{id}/categorias': {
      parameters: [pathParam('id', 'ID del producto')],
      get: { tags: ['Productos'], summary: 'Obtener categorías de un producto', responses: { 200: jsonResponse(), ...errorResponses } },
      put: auth({
        tags: ['Productos'],
        summary: 'Reemplazar categorías de un producto',
        requestBody: jsonBody(requestObject({ categorias: { type: 'array', items: id } }, ['categorias'])),
        responses: { 200: jsonResponse() },
      }),
    },
    '/api/dashboard/estadisticas': {
      get: { tags: ['Dashboard'], summary: 'Obtener estadísticas generales', responses: { 200: jsonResponse(), ...errorResponses } },
    },
    '/api/dashboard/ultimas-solicitudes': {
      get: { tags: ['Dashboard'], summary: 'Obtener últimas solicitudes', responses: { 200: jsonResponse(), ...errorResponses } },
    },
    '/api/dashboard/comparativo': {
      get: auth({ tags: ['Dashboard'], summary: 'Comparar solicitudes de hoy y ayer', responses: { 200: jsonResponse() } }),
    },
    '/api/reportes/semanal': {
      get: auth({ tags: ['Reportes'], summary: 'Obtener reporte semanal', responses: { 200: jsonResponse() } }),
    },
    '/api/reportes/mensual': {
      get: auth({ tags: ['Reportes'], summary: 'Obtener reporte mensual', responses: { 200: jsonResponse() } }),
    },
    '/reportes/financiero': {
      get: {
        tags: ['Reportes'],
        summary: 'Obtener reporte financiero agrupado',
        parameters: [{ name: 'rango', in: 'query', schema: { type: 'string', enum: ['semana', 'mes', 'anio'], default: 'mes' } }],
        responses: { 200: jsonResponse(), ...errorResponses },
      },
    },
    '/reportes/financiero/totales': {
      get: { tags: ['Reportes'], summary: 'Obtener totales financieros', responses: { 200: jsonResponse(), ...errorResponses } },
    },
    '/api/venta': {
      post: auth({
        tags: ['Solicitudes'],
        summary: 'Crear solicitud de mantenimiento o venta',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: requestObject({
                tipo: { type: 'string', enum: ['mantenimiento', 'venta'] },
                nombreArticulo: { type: 'string' },
                descripcion: { type: 'string' },
                urgencia: { type: 'string', enum: ['Baja', 'Media', 'Alta'] },
                estadoArticulo: { type: 'string', enum: ['Excelente', 'Bueno', 'Regular', 'Malo'] },
                precioEstimado: { type: 'number' },
                imagen: { type: 'string', format: 'binary' },
              }, ['tipo', 'nombreArticulo', 'descripcion']),
            },
          },
        },
        responses: { 201: jsonResponse() },
      }),
    },
    '/solicitudes': {
      post: {
        tags: ['Solicitudes'],
        summary: 'Crear solicitud con payload legado',
        requestBody: jsonBody(requestObject({
          orden: { type: 'string' },
          tipo: { type: 'string' },
          subtipo: { type: 'string' },
          danos: { type: 'string' },
          services: { type: 'array', items: { type: 'object' } },
          total: { type: 'number' },
          fecha: { type: 'string' },
        })),
        responses: { 201: jsonResponse(), ...errorResponses },
      },
      get: auth({ tags: ['Solicitudes'], summary: 'Listar solicitudes para personal interno', responses: { 200: jsonResponse() } }),
    },
    '/solicitudes/mis-solicitudes': {
      get: auth({ tags: ['Solicitudes'], summary: 'Listar solicitudes del cliente autenticado', responses: { 200: jsonResponse() } }),
    },
    '/solicitudes/cliente': {
      post: {
        tags: ['Solicitudes'],
        summary: 'Crear solicitud de cliente con imagen',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: requestObject({
                tipo: { type: 'string', enum: ['mantenimiento', 'venta'] },
                cliente_idCliente: id,
                nombreArticulo: { type: 'string' },
                descripcion: { type: 'string' },
                urgencia: { type: 'string', enum: ['Baja', 'Media', 'Alta'] },
                estadoArticulo: { type: 'string' },
                precioEstimado: { type: 'number' },
                imagen: { type: 'string', format: 'binary' },
              }, ['tipo', 'cliente_idCliente', 'nombreArticulo', 'descripcion']),
            },
          },
        },
        responses: { 201: jsonResponse(), ...errorResponses },
      },
    },
    '/solicitudes/almacenado': {
      get: auth({ tags: ['Solicitudes'], summary: 'Listar solicitudes almacenadas', responses: { 200: jsonResponse() } }),
    },
    '/solicitudes/almacenado/ejecutar': {
      post: auth({ tags: ['Solicitudes'], summary: 'Archivar solicitudes aprobadas con más de 30 días', responses: { 200: jsonResponse() } }),
    },
    '/solicitudes/{id}': {
      parameters: [pathParam('id', 'ID de la solicitud')],
      get: { tags: ['Solicitudes'], summary: 'Consultar una solicitud', responses: { 200: jsonResponse(), ...errorResponses } },
    },
    '/solicitudes/{id}/estado': {
      parameters: [pathParam('id', 'ID de la solicitud')],
      put: auth({
        tags: ['Solicitudes'],
        summary: 'Actualizar estado de solicitud',
        requestBody: jsonBody(requestObject({ estado: status, tecnico_asignado: { type: 'string' }, observacion_admin: { type: 'string' } }, ['estado'])),
        responses: { 200: jsonResponse() },
      }),
    },
    '/solicitudes/{id}/asignar': {
      parameters: [pathParam('id', 'ID de la solicitud')],
      put: auth({
        tags: ['Solicitudes'],
        summary: 'Asignar técnico y/o urgencia',
        requestBody: jsonBody(requestObject({
          tecnico_asignado: { type: 'string' },
          urgencia: { type: 'string', enum: ['Baja', 'Media', 'Alta'] },
        })),
        responses: { 200: jsonResponse() },
      }),
    },
    '/venta': {
      post: auth({
        tags: ['Ventas'],
        summary: 'Registrar venta y pago del carrito',
        requestBody: jsonBody(requestObject({
          idUsuario: id,
          total: { type: 'number' },
          metodoPago: { type: 'string' },
          detallePago: { type: 'string' },
          productos: { type: 'array', items: { $ref: '#/components/schemas/VentaProducto' } },
        }, ['idUsuario', 'total', 'productos'])),
        responses: { 201: jsonResponse() },
      }),
    },
    '/ventas/{idUsuario}': {
      parameters: [pathParam('idUsuario', 'ID del usuario')],
      get: auth({ tags: ['Ventas'], summary: 'Listar ventas de un usuario', responses: { 200: jsonResponse() } }),
    },
    '/notificaciones': {
      get: auth({ tags: ['Notificaciones'], summary: 'Listar notificaciones del usuario', responses: { 200: jsonResponse() } }),
      post: auth({
        tags: ['Notificaciones'],
        summary: 'Crear notificación (administrador)',
        requestBody: jsonBody(requestObject({
          titulo: { type: 'string' },
          mensaje: { type: 'string' },
          tipo: { type: 'string' },
          rolDestino: { type: 'string', enum: ['admin', 'tecnico', 'cliente'] },
          usuarioIds: { type: 'array', items: id },
          idSolicitud: id,
        }, ['titulo', 'mensaje'])),
        responses: { 201: jsonResponse() },
      }),
    },
    '/notificaciones/no-leidas': {
      get: auth({ tags: ['Notificaciones'], summary: 'Contar notificaciones no leídas', responses: { 200: jsonResponse() } }),
    },
    '/notificaciones/{id}/leida': {
      parameters: [pathParam('id', 'ID de la notificación')],
      put: auth({ tags: ['Notificaciones'], summary: 'Marcar notificación como leída', responses: { 200: jsonResponse() } }),
    },
    '/notificaciones/{id}/accion': {
      parameters: [pathParam('id', 'ID de la notificación')],
      put: auth({
        tags: ['Notificaciones'],
        summary: 'Ejecutar acción de una notificación',
        requestBody: jsonBody(requestObject({ accion: { type: 'string' } }, ['accion'])),
        responses: { 200: jsonResponse() },
      }),
    },
    '/notificaciones/marcar-todas-leidas': {
      put: auth({ tags: ['Notificaciones'], summary: 'Marcar todas las notificaciones como leídas', responses: { 200: jsonResponse() } }),
    },
    '/notificaciones/tecnicos': {
      get: auth({ tags: ['Notificaciones'], summary: 'Listar técnicos destinatarios', responses: { 200: jsonResponse() } }),
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Usa el token obtenido en POST /login.',
      },
    },
    schemas: {
      JsonResponse: {
        type: 'object',
        additionalProperties: true,
        description: 'Respuesta JSON del backend. La forma exacta depende del endpoint.',
      },
      VentaProducto: {
        type: 'object',
        required: ['idProducto', 'cantidad', 'precioUnitario'],
        properties: {
          idProducto: id,
          cantidad: { type: 'integer', minimum: 1 },
          precioUnitario: { type: 'number' },
        },
      },
      EstadoSolicitud: { type: 'string', enum: status.enum },
    },
  },
};

export default openapi;
