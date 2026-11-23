# Ingenix

Sistema de gestion para reparacion, mantenimiento y comercializacion de joyeria y relojeria.

## Estructura

- `src/`: aplicacion React/Vite y paginas del sistema.
- `Backend/`: conexion de base de datos, middleware y rutas del backend.
- `server.js`: API Express y punto de entrada del backend.
- `public/`: archivos publicos de Vite.
- `uploads/`: imagenes cargadas por solicitudes (no subir credenciales ni archivos privados).

## Configuracion local

1. Copia `.env.example` como `.env`.
2. En Supabase abre **Project Settings > Database > Connect** y copia la cadena PostgreSQL del Session Pooler en `DATABASE_URL`.
3. Define un `JWT_SECRET` nuevo y las credenciales SMTP. No uses ni publiques las credenciales antiguas.
4. Instala dependencias:

   ```bash
   npm install
   ```

5. Ejecuta el frontend:

   ```bash
   npm run dev
   ```

6. En otra terminal ejecuta la API:

   ```bash
   npm run server
   ```

La API queda disponible en `http://localhost:3000` y Vite en `http://localhost:5173`.
Ejecuta `npm run server` una sola vez: ese backend atiende tanto a la web como a la
aplicación móvil. El puerto predeterminado es `3000`; se puede cambiar con la
variable de entorno `PORT`. Para un teléfono físico, configura la app móvil para
usar la IP local de este equipo y el mismo puerto (no `localhost`, que apuntaría
al propio teléfono).

## Notificaciones

Las rutas protegidas de notificaciones usan el token JWT del usuario:

- `GET /notificaciones`: lista las notificaciones recibidas por el usuario.
- `GET /notificaciones/no-leidas`: devuelve el contador de pendientes.
- `PUT /notificaciones/:id/leida`: marca una notificación como leída.
- `PUT /notificaciones/marcar-todas-leidas`: marca todas como leídas.
- `POST /notificaciones`: crea una notificación para todos los usuarios de
  `rol_destino`; actualmente requiere rol de administrador.

Para una emergencia dirigida a todos los técnicos, el cuerpo puede ser:

```json
{
  "titulo": "Emergencia de mantenimiento",
  "mensaje": "Se requiere atención inmediata.",
  "tipo": "sistema",
  "rol_destino": "tecnico",
  "prioridad": "urgente",
  "requiere_accion": true
}
```

## Alertas de inventario

El backend genera una notificación urgente para los administradores cuando un
producto llega a 2 unidades o menos. La alerta se muestra brevemente en la
parte inferior de la pantalla; no se repite mientras el producto siga bajo.
Al reponer el stock por encima de 2, el sistema queda listo para alertar de
nuevo si vuelve a alcanzar el umbral.

## Base de datos

El backend usa PostgreSQL mediante `pg` y la cadena de conexion de Supabase. La capa
`Backend/config/db.js` conserva temporalmente la interfaz de callbacks que usan las
rutas existentes y adapta los marcadores `?` heredados de MySQL.

Antes de eliminar la instancia local de XAMPP:

1. Compara tablas, columnas, claves, secuencias y restricciones en Supabase.
2. Prueba login, usuarios, productos, categorias, solicitudes, ventas y reportes.
3. Verifica que las columnas con nombres camelCase hayan sido creadas exactamente como
   las consulta la aplicacion.
4. Realiza un respaldo de Supabase y conserva el respaldo de MySQL hasta terminar la
   validacion.

## Documentación de APIs

La documentación interactiva de todos los endpoints está disponible cuando el
backend está ejecutándose:

- Swagger UI: `http://localhost:3000/api-docs`
- Especificación OpenAPI JSON: `http://localhost:3000/api-docs.json`
- Ruta compatible con el backend web: `http://localhost:3000/docs`
- Especificación OpenAPI JSON: `http://localhost:3000/docs/openapi.json`

Los endpoints protegidos requieren el JWT obtenido en `POST /login`. En Swagger
UI usa el botón **Authorize** y escribe `Bearer <token>`.

La API también conserva rutas de compatibilidad para la aplicación móvil:
`GET /api/mis-solicitudes`, `GET /api/tecnico/solicitudes`,
`PUT /api/tecnico/solicitudes/:id/estado` (acepta `nuevoEstado`) y
`GET /api/reportes/dashboard`. Estas rutas usan la misma base de datos,
autenticación y proceso del backend principal.

## Almacenado automático

La migración `Backend/migrations/001_add_almacenado_status.sql` agrega `Almacenado`
al enum PostgreSQL `estado_solicitud`. Debe ejecutarse una vez en cada base de
datos existente antes de activar el archivado.

El personal autorizado puede consultar las solicitudes archivadas con
`GET /solicitudes/almacenado` (requiere JWT de administrador o técnico). Un
administrador ejecuta `POST /solicitudes/almacenado/ejecutar`; la operación
idempotente cambia a `Almacenado` las solicitudes en estado `Aprobado` cuando
han pasado 30 días desde `fecha_listo_retiro`, que se registra al aprobarlas.
El registro público requiere aceptar la regla de recogida y conserva la versión
y fecha de aceptación. Se envían recordatorios por correo y en la aplicación
los días 1, 15 y 30; cada canal registra sus envíos para evitar duplicados. Las
solicitudes que ya estaban aprobadas y no tenían fecha de disponibilidad al
activar la regla inician su plazo en el primer arranque del backend con esta
actualización.
