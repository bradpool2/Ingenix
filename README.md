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

Los endpoints protegidos requieren el JWT obtenido en `POST /login`. En Swagger
UI usa el botón **Authorize** y escribe `Bearer <token>`.

## Almacenado automático

La migración `Backend/migrations/001_add_almacenado_status.sql` agrega `Almacenado`
al enum PostgreSQL `estado_solicitud`. Debe ejecutarse una vez en cada base de
datos existente antes de activar el archivado.

El personal autorizado puede consultar las solicitudes archivadas con
`GET /solicitudes/almacenado` (requiere JWT de administrador o técnico). Un
administrador ejecuta `POST /solicitudes/almacenado/ejecutar`; la operación
idempotente cambia a `Almacenado` los mantenimientos en estado `Aprobado` cuya
`fecha_registro` supera 30 días y notifica al cliente asociado y a los
administradores.
