const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Ingenix API',
    version: '1.0.0',
    description: 'Endpoints de solicitudes, asignaciones y ofertas de venta.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  paths: {
    '/solicitudes': {
      get: {
        summary: 'Listar solicitudes para técnicos y administradores',
        responses: { 200: { description: 'Lista de solicitudes' } },
      },
    },
    '/solicitudes/{id}': {
      get: {
        summary: 'Consultar el detalle de una solicitud',
        parameters: [{ $ref: '#/components/parameters/SolicitudId' }],
        responses: {
          200: { description: 'Detalle, imágenes y valores de venta' },
          404: { description: 'Solicitud no encontrada' },
        },
      },
    },
    '/solicitudes/{id}/asignar': {
      put: {
        summary: 'Asignar técnico y urgencia',
        parameters: [{ $ref: '#/components/parameters/SolicitudId' }],
        requestBody: { $ref: '#/components/requestBodies/Asignacion' },
        responses: { 200: { description: 'Solicitud asignada' } },
      },
    },
    '/solicitudes/{id}/contraoferta': {
      post: {
        summary: 'Guardar la contraoferta del administrador',
        parameters: [{ $ref: '#/components/parameters/SolicitudId' }],
        requestBody: { $ref: '#/components/requestBodies/Contraoferta' },
        responses: { 200: { description: 'Contraoferta guardada' } },
      },
    },
    '/solicitudes/{id}/venta': {
      put: {
        summary: 'Guardar o limpiar el precio final de compra',
        parameters: [{ $ref: '#/components/parameters/SolicitudId' }],
        requestBody: { $ref: '#/components/requestBodies/PrecioFinal' },
        responses: { 200: { description: 'Precio final guardado' } },
      },
    },
    '/api/venta': {
      post: {
        summary: 'Crear una solicitud de venta o mantenimiento con imágenes',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['tipo', 'nombreArticulo', 'descripcion'],
                properties: {
                  tipo: { type: 'string', enum: ['venta', 'mantenimiento'] },
                  nombreArticulo: { type: 'string' },
                  descripcion: { type: 'string' },
                  estadoArticulo: { type: 'string' },
                  precioEstimado: { type: 'number', minimum: 0 },
                  imagen: { type: 'array', items: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Solicitud creada' } },
      },
    },
  },
  components: {
    parameters: {
      SolicitudId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
    },
    requestBodies: {
      Asignacion: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['tecnico_asignado', 'urgencia'],
              properties: {
                tecnico_asignado: { type: 'string' },
                urgencia: { type: 'string', enum: ['Baja', 'Media', 'Alta'] },
              },
            },
          },
        },
      },
      Contraoferta: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['monto'],
              properties: {
                monto: { type: 'number', minimum: 0 },
                comentario: { type: 'string' },
              },
            },
          },
        },
      },
      PrecioFinal: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { precioFinal: { type: 'number', minimum: 0, nullable: true } },
            },
          },
        },
      },
    },
  },
};

export default openapi;
