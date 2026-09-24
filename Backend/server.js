import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import conexion, { pool } from './config/db.js';
import { verificarToken, soloAdmin, soloTecnico } from './Middleware/Auth.js';
import rutasSolicitudes from './Routes/solicitudes.js';
import openapi from './docs/openapi.js';
import swaggerUi from 'swagger-ui-express';

// Las credenciales SMTP solo se cargan en el backend. Se prioriza .env.Front
// cuando existe; ENV_FILE permite elegir explícitamente otro archivo.
const envPath = process.env.ENV_FILE || (fs.existsSync('.env.Front') ? '.env.Front' : '.env');
dotenv.config({ path: envPath });

const app = express();
const PUERTO = process.env.PORT || 3000;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ─── Chequeo de arranque ────────────────────────────────────────────────────
// Se revisa UNA vez al iniciar el servidor, para que en un PC nuevo el error
// salga aquí (en la terminal) y no solo cuando alguien le da a "Olvidé mi
// contraseña". Si falta un archivo .env (normal: no debe subirse a git),
// las rutas de correo van a fallar aunque el resto del backend funcione bien.
const variablesFaltantes = ['DATABASE_URL', 'EMAIL_USER', 'EMAIL_PASS', 'JWT_SECRET']
    .filter((nombre) => !process.env[nombre] && !(nombre === 'DATABASE_URL' && process.env.SUPABASE_DB_URL));
if (variablesFaltantes.length) {
    console.warn(
        `⚠️  Faltan variables de entorno en "${envPath}": ${variablesFaltantes.join(', ')}.
` +
        `   Copia .env.example como "${envPath}" y complétalo en este PC.`
    );
}
// Formatea números como pesos colombianos: 150000 -> "$150.000"
const formatoPesos = (valor) => `$${Number(valor).toLocaleString('es-CO')}`;

// Correo de pago confirmado. Reutiliza el mismo estilo visual del correo
// de "Recuperación de contraseña" (mismo encabezado, mismos colores) para
// que se vea como parte de la misma app.
const enviarCorreoPagoConfirmado = ({ correo, nombre, total, referencia, idVenta }) => (
    transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: correo,
        subject: 'Pago confirmado - Ingenix',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;">
            <h1 style="color:#99c1bb;text-align:center;">INGENIX</h1>
            <h2 style="text-align:center;">¡Tu pago fue confirmado!</h2>
            <p>Hola ${nombre || ''}, te confirmamos que tu pago se procesó correctamente.</p>
            <table style="width:100%;border-collapse:collapse;margin:25px 0;">
                <tr>
                    <td style="padding:10px;border-bottom:1px solid #eee;color:#777;">Número de venta</td>
                    <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">#${idVenta}</td>
                </tr>
                <tr>
                    <td style="padding:10px;border-bottom:1px solid #eee;color:#777;">Referencia de pago</td>
                    <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${referencia}</td>
                </tr>
                <tr>
                    <td style="padding:10px;color:#777;">Total pagado</td>
                    <td style="padding:10px;text-align:right;font-weight:bold;color:#2a2f33;">${formatoPesos(total)}</td>
                </tr>
            </table>
            <p style="font-size:13px;color:#777;">Si no reconoces esta compra, contáctanos respondiendo este correo.</p>
        </div>`,
    })
);

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter.verify((error) => {
        if (error) {
            console.error(`❌ No se pudo autenticar con Gmail (recuperar contraseña NO va a funcionar): ${error.message}
   Causas típicas: EMAIL_PASS debe ser una "contraseña de aplicación" de Gmail (no la clave normal),
   o Google bloqueó el inicio de sesión por venir de un PC/red nuevo (revisa https://myaccount.google.com/security).`);
        } else {
            console.log('✅ Envío de correo (Gmail) verificado correctamente');
        }
    });
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(rutasSolicitudes);

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const carpeta = './uploads/solicitudes';
        if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
        cb(null, carpeta);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `solicitud_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 2 },
    fileFilter: (req, file, cb) => {
        const tiposValidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (tiposValidos.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Tipo de archivo no permitido'));
    }
});

const cargarImagenesSolicitud = (req, res, next) => {
    upload.array('imagen', 2)(req, res, (error) => {
        if (!error) return next();

        const mensaje = error.code === 'LIMIT_FILE_SIZE'
            ? 'Cada imagen debe pesar máximo 10 MB.'
            : error.code === 'LIMIT_FILE_COUNT'
                ? 'Solo puedes cargar máximo 2 imágenes.'
                : error.message === 'Tipo de archivo no permitido'
                    ? 'Formato de imagen no permitido. Usa JPG, PNG o WEBP.'
                    : 'No se pudieron cargar las imágenes.';

        return res.status(400).json({ error: mensaje });
    });
};

app.use('/uploads', express.static('uploads'));
app.get('/docs/openapi.json', (req, res) => res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

// ─── Test ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send('🟢 API funcionando correctamente');
});

// ─── Login ────────────────────────────────────────────────────────────────────
app.post('/login', async (req, res) => {
    const { correo, pass } = req.body;
    if (!correo || !pass) return res.status(400).json({ message: 'Faltan datos' });

    try {
        const { rows } = await conexion.query(
            `SELECT u.*, r.nombrerol AS rol
             FROM usuario u
             JOIN rol r ON u.rol_idrol = r.idrol
             WHERE lower(u.correo) = lower($1)`,
            [correo]
        );

        if (rows.length === 0) return res.status(401).json({ message: 'Credenciales inválidas' });

        const usuario = rows[0];
        const coinciden = await bcrypt.compare(pass, usuario.pass);
        if (!coinciden) return res.status(401).json({ message: 'Credenciales inválidas' });

        const usuarioNormalizado = {
            idUsuario: usuario.idusuario ?? usuario.idUsuario ?? usuario["idUsuario"],
            nombre: usuario.nombre,
            correo: usuario.correo,
            documento: usuario.documento,
            telefono: usuario.telefono,
            direccion: usuario.direccion,
            rol: usuario.rol ?? usuario.nombrerol ?? 'usuario',
        };

        const token = jwt.sign(
            { id: usuarioNormalizado.idUsuario, nombre: usuarioNormalizado.nombre, rol: usuarioNormalizado.rol },
            process.env.JWT_SECRET || 'clave_secreta_temporal',
            { expiresIn: '2h' }
        );

        res.json({ mensaje: 'Login exitoso', token, usuario: usuarioNormalizado });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Notificaciones del usuario autenticado.
app.get('/notificaciones', verificarToken, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT n.idnotificacion AS "idNotificacion", n.titulo, n.mensaje,
                    n.tipo, n.rol_destino AS "rolDestino",
                    n.idsolicitud AS "idSolicitud", n.prioridad,
                    n.requiere_accion AS "requiereAccion", n.created_at AS "createdAt",
                    COALESCE(nu.leida, false) AS leida
             FROM notificacion_usuario nu
             JOIN notificacion n ON n.idnotificacion = nu.id_notificacion
             WHERE nu.id_usuario = $1
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [req.usuario.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/notificaciones/:id/leida', verificarToken, async (req, res) => {
    try {
        await conexion.query(
            `UPDATE notificacion_usuario SET leida = true
             WHERE id_notificacion = $1 AND id_usuario = $2`,
            [req.params.id, req.usuario.id]
        );
        res.json({ message: 'Notificación marcada como leída.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/notificaciones/marcar-todas-leidas', verificarToken, async (req, res) => {
    try {
        await conexion.query(
            'UPDATE notificacion_usuario SET leida = true WHERE id_usuario = $1',
            [req.usuario.id]
        );
        res.json({ message: 'Notificaciones marcadas como leídas.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/notificaciones/:id/accion', verificarToken, soloTecnico, async (req, res) => {
    const { accion } = req.body;
    if (accion !== 'aceptar') return res.status(400).json({ message: 'Acción no válida.' });
    try {
        const { rows } = await conexion.query(
            `SELECT n.idsolicitud AS "idSolicitud"
             FROM notificacion_usuario nu
             JOIN notificacion n ON n.idnotificacion = nu.id_notificacion
             WHERE n.idnotificacion = $1 AND nu.id_usuario = $2`,
            [req.params.id, req.usuario.id]
        );
        if (rows.length === 0 || !rows[0].idSolicitud) return res.status(404).json({ message: 'Notificación no encontrada.' });
        await conexion.query(
            `UPDATE solicitud SET estado = 'En proceso', tecnico_asignado = $1
             WHERE idSolicitud = $2 AND estado = 'Pendiente'`,
            [req.usuario.nombre, rows[0].idSolicitud]
        );
        await conexion.query(
            `UPDATE notificacion_usuario SET leida = true
             WHERE id_notificacion = $1 AND id_usuario = $2`,
            [req.params.id, req.usuario.id]
        );
        res.json({ message: 'Solicitud aceptada.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Recuperar contraseña ─────────────────────────────────────────────────────
app.post('/recuperar-password', async (req, res) => {
    const correo = req.body.correo?.trim().toLowerCase();
    const respuestaSegura = { message: 'Si existe una cuenta con ese correo, recibiras un enlace de recuperacion.' };
    if (!correo) return res.status(400).json({ message: 'El correo es obligatorio.' });
    try {
        // Instala las columnas necesarias en bases ya creadas antes de esta función.
        await conexion.query(`
            ALTER TABLE usuario
            ADD COLUMN IF NOT EXISTS token_recuperacion TEXT,
            ADD COLUMN IF NOT EXISTS expiracion_token TIMESTAMPTZ
        `);
        const { rows } = await conexion.query(
            'SELECT idusuario FROM usuario WHERE lower(correo) = $1', [correo]
        );
        if (rows.length === 0) return res.json(respuestaSegura);

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        // La expiración se calcula DENTRO de la base de datos (NOW() + 15 min), no en JavaScript.
        // Así se guarda y se compara con el mismo reloj y la misma zona horaria.
        await conexion.query(
            `UPDATE usuario
             SET token_recuperacion = $1,
                 expiracion_token = NOW() + INTERVAL '15 minutes'
             WHERE idusuario = $2`,
            [tokenHash, rows[0].idusuario]
        );

        // El enlace abre una página que sirve este mismo backend (ver GET /restablecer-password/:token).
        // Si pruebas desde el celular, pon en .env PUBLIC_URL=http://IP_DE_TU_PC:3000
        const urlPublica = (process.env.PUBLIC_URL || `http://localhost:${PUERTO}`).replace(/\/$/, '');
        const enlace = `${urlPublica}/restablecer-password/${token}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: correo,
            subject: 'Recuperación de contraseña - Ingenix',
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;">
                <h1 style="color:#99c1bb;text-align:center;">INGENIX</h1>
                <h2 style="text-align:center;">Recuperación de contraseña</h2>
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
                <div style="text-align:center;margin:35px 0;">
                    <a href="${enlace}" style="background:#99c1bb;color:white;text-decoration:none;padding:15px 30px;border-radius:8px;font-weight:bold;">
                        Restablecer contraseña
                    </a>
                </div>
                <p style="font-size:13px;color:#777;">Este enlace será válido durante <strong>15 minutos</strong>.</p>
            </div>`
        });

        res.json({ message: 'Se envió un correo de recuperación.' });
    } catch (err) {
        console.error('Error en /recuperar-password:', err.message);
        res.status(500).json({
            message: 'No fue posible enviar el correo de recuperación. Revisa la configuración SMTP del servidor.',
        });
    }
});

// ─── Página web para restablecer contraseña (la abre el enlace del correo) ────
app.get('/restablecer-password/:token', (req, res) => {
    const { token } = req.params;
    // El token real es hexadecimal de 64 caracteres; si no, no lo metemos en la página.
    if (!/^[a-f0-9]{64}$/i.test(token)) {
        return res.status(400).send('Enlace no válido.');
    }
    res.type('html').send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Restablecer contraseña - Ingenix</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1f2326;font-family:Arial,sans-serif;color:#fff}
  .tarjeta{width:100%;max-width:400px;margin:20px;padding:32px;background:#2a2f33;border-radius:12px}
  h1{margin:0 0 4px;text-align:center;color:#99c1bb;letter-spacing:2px}
  h2{margin:0 0 24px;text-align:center;font-weight:normal;font-size:18px}
  label{display:block;margin:14px 0 6px;font-size:14px}
  input{width:100%;padding:12px;border:1px solid #444;border-radius:8px;background:#1f2326;color:#fff;font-size:15px}
  button{width:100%;margin-top:22px;padding:14px;border:0;border-radius:8px;background:#99c1bb;color:#1f2326;font-weight:bold;font-size:15px;cursor:pointer}
  button:disabled{opacity:.6;cursor:default}
  #mensaje{margin-top:16px;text-align:center;font-size:14px;min-height:20px}
  .ok{color:#7ddf9b}.error{color:#ff8a8a}
</style>
</head>
<body>
<div class="tarjeta">
  <h1>INGENIX</h1>
  <h2>Restablecer contraseña</h2>
  <form id="formulario">
    <label for="password">Nueva contraseña (mínimo 8 caracteres)</label>
    <input type="password" id="password" autocomplete="new-password" required>
    <label for="confirmar">Confirmar contraseña</label>
    <input type="password" id="confirmar" autocomplete="new-password" required>
    <button type="submit" id="boton">Guardar contraseña</button>
  </form>
  <p id="mensaje"></p>
</div>
<script>
  const token = ${JSON.stringify(token)};
  const formulario = document.getElementById('formulario');
  const mensaje = document.getElementById('mensaje');
  const boton = document.getElementById('boton');

  function mostrar(texto, clase) {
    mensaje.textContent = texto;
    mensaje.className = clase;
  }

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const confirmar = document.getElementById('confirmar').value;

    if (password.length < 8) return mostrar('La contraseña debe tener al menos 8 caracteres.', 'error');
    if (password !== confirmar) return mostrar('Las contraseñas no coinciden.', 'error');

    boton.disabled = true;
    try {
      const res = await fetch('/restablecer-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        formulario.style.display = 'none';
        mostrar('Contraseña actualizada. Ya puedes iniciar sesión en la app de Ingenix.', 'ok');
      } else {
        mostrar(data.message || 'No se pudo actualizar la contraseña.', 'error');
        boton.disabled = false;
      }
    } catch {
      mostrar('No se pudo conectar con el servidor.', 'error');
      boton.disabled = false;
    }
  });
</script>
</body>
</html>`);
});

// ─── Restablecer contraseña ───────────────────────────────────────────────────
app.post('/restablecer-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Datos incompletos.' });
    if (password.length < 8) return res.status(400).json({ message: 'La contrasena debe tener al menos 8 caracteres.' });

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const { rows } = await conexion.query(
            `SELECT idusuario, (expiracion_token > NOW()) AS vigente
             FROM usuario
             WHERE token_recuperacion = $1`,
            [tokenHash]
        );
        if (rows.length === 0) {
            return res.status(400).json({
                message: 'Este enlace no es válido o ya fue reemplazado. Usa el correo más reciente que te llegó, o pide uno nuevo.',
            });
        }
        if (!rows[0].vigente) {
            return res.status(400).json({ message: 'El enlace ya expiró. Pide uno nuevo.' });
        }

        const nuevaPassword = await bcrypt.hash(password, 10);
        await conexion.query(
            `UPDATE usuario SET pass = $1, token_recuperacion = NULL, expiracion_token = NULL WHERE idusuario = $2`,
            [nuevaPassword, rows[0].idusuario]
        );

        res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        res.status(500).json({ message: 'Error al actualizar.' });
    }
});

// ─── Registro público ─────────────────────────────────────────────────────────
app.post('/usuarios/registro', async (req, res) => {
    const { nombre, correo, documento, direccion, telefono, pass, rol_idRol } = req.body;
    if (!nombre || !correo || !documento || !pass)
        return res.status(400).json({ message: 'Faltan datos obligatorios' });

    const rolFinal = rol_idRol || 3; // 3 = cliente, el rol por defecto de "Registrarse"
    const esCliente = Number(rolFinal) === 3;

    // Transacción: usuario + (si es cliente) su fila en "cliente" se guardan juntos.
    // Si algo falla a mitad de camino, se deshace todo (ROLLBACK) y no queda
    // un usuario "a medias" sin perfil de cliente, que es justo el bug que tenías.
    let cliente;
    try {
        cliente = await pool.connect();
        await cliente.query('BEGIN');

        const passEncriptada = await bcrypt.hash(pass, 10);
        const { rows } = await cliente.query(
            'INSERT INTO usuario (nombre, correo, documento, direccion, telefono, pass, "rol_idRol") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "idUsuario"',
            [nombre, correo, documento, direccion || null, telefono || null, passEncriptada, rolFinal]
        );
        const idUsuario = rows[0].idUsuario;

        if (esCliente) {
            await cliente.query(
                'INSERT INTO cliente (documento, direccion, telefono, usuario_idusuario) VALUES ($1, $2, $3, $4)',
                [documento, direccion || null, telefono || null, idUsuario]
            );
        }

        await cliente.query('COMMIT');
        res.status(201).json({ message: 'Usuario registrado con éxito', idUsuario });
    } catch (err) {
        if (cliente) await cliente.query('ROLLBACK').catch(() => {});
        // 23505 = correo o documento ya existen (restricción UNIQUE)
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Ese correo o documento ya está registrado.' });
        }
        console.error('Error en /usuarios/registro ->', err.message);
        res.status(500).json({ error: 'No se pudo completar el registro.' });
    } finally {
        if (cliente) cliente.release();
    }
});

// ─── Buscar usuario ───────────────────────────────────────────────────────────
app.get('/usuario', async (req, res) => {
    const { correo, documento } = req.query;
    if (!correo && !documento) return res.status(400).json({ message: 'Se requiere correo o documento.' });

    try {
        const campo = correo ? 'correo' : 'documento';
        const valor = correo || documento;
        const { rows } = await conexion.query(
            `SELECT "idUsuario", nombre, correo, documento FROM usuario WHERE ${campo} = $1`,
            [valor]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Listar usuarios ──────────────────────────────────────────────────────────
app.get('/usuarios', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT u.idusuario AS "idUsuario", u.nombre, u.correo, u.documento, u.direccion,
                    u.rol_idrol AS "rol_idRol", r.nombrerol AS rol
             FROM usuario u
             LEFT JOIN rol r ON u.rol_idrol = r.idrol`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/usuarios/tecnicos', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT u.idusuario AS "idUsuario", u.nombre
             FROM usuario u
             JOIN rol r ON u.rol_idrol = r.idrol
             WHERE LOWER(r.nombrerol) = 'tecnico'`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/usuarios', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, correo, documento, direccion, pass, rol_idRol } = req.body;
    if (!nombre || !correo || !documento || !pass)
        return res.status(400).json({ message: 'Faltan datos obligatorios' });

    try {
        const passEncriptada = await bcrypt.hash(pass, 10);
        const { rows } = await conexion.query(
            'INSERT INTO usuario (nombre, correo, documento, direccion, pass, rol_idrol) VALUES ($1, $2, $3, $4, $5, $6) RETURNING idusuario AS "idUsuario"',
            [nombre, correo, documento, direccion, passEncriptada, rol_idRol || 1]
        );
        res.status(201).json({ message: 'Usuario creado con éxito', idUsuario: rows[0].idUsuario });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/usuarios/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, documento, direccion, telefono, rol_idRol } = req.body;
    const esPropio = Number(req.usuario?.id) === Number(id);
    if (!esPropio && req.usuario?.rol !== 'admin') {
        return res.status(403).json({ message: 'Solo puedes editar tu propio perfil.' });
    }

    // Los datos pueden llegar como número (documento, teléfono) o como null.
    // Los pasamos SIEMPRE a texto antes de usar .trim(); si no, un número hace reventar el servidor.
    const aTexto = (valor) => (valor === null || valor === undefined ? '' : String(valor)).trim();
    const nombreTxt = aTexto(nombre);
    const correoTxt = aTexto(correo).toLowerCase();
    const documentoTxt = aTexto(documento);
    const direccionTxt = aTexto(direccion);
    const telefonoTxt = aTexto(telefono);

    if (!nombreTxt || !correoTxt || !documentoTxt) {
        return res.status(400).json({ message: 'Nombre, correo y documento son obligatorios.' });
    }
    try {
        const rolActual = await conexion.query(
            'SELECT rol_idrol FROM usuario WHERE idusuario = $1', [id]
        );
        if (rolActual.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        // Solo un admin que edita a otra persona puede cambiar el rol.
        const rolFinal = req.usuario?.rol === 'admin' && !esPropio && rol_idRol
            ? rol_idRol
            : rolActual.rows[0].rol_idrol;
        await conexion.query(
            'UPDATE usuario SET nombre=$1, correo=$2, documento=$3, direccion=$4, telefono=$5, rol_idrol=$6 WHERE idusuario=$7',
            [nombreTxt, correoTxt, documentoTxt, direccionTxt || null, telefonoTxt || null, rolFinal, id]
        );
        const { rows } = await conexion.query(
            `SELECT idusuario AS "idUsuario", nombre, correo, documento,
                    telefono, direccion
             FROM usuario
             WHERE idusuario = $1`,
            [id]
        );
        res.json({
            message: 'Usuario actualizado con éxito',
            usuario: { ...rows[0], rol: req.usuario.rol },
        });
    } catch (err) {
        // Así ves la causa real en la terminal del backend.
        console.error('Error en PUT /usuarios/:id ->', err.message);
        // 23505 = violación de restricción UNIQUE en PostgreSQL (correo o documento repetido)
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Ese correo o documento ya está registrado por otro usuario.' });
        }
        res.status(500).json({ message: 'No se pudo actualizar el usuario.', error: err.message });
    }
});

app.delete('/usuarios/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
        await conexion.query('DELETE FROM usuario WHERE idusuario = $1', [req.params.id]);
        res.json({ message: 'Usuario eliminado con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Productos ────────────────────────────────────────────────────────────────
app.get('/productos/con-categorias', async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT p.idproducto AS "idProducto",
                    p.nombre,
                    p.descripcion,
                    p.precio,
                    p.stock,
                    p.tipoproducto_idtipoproducto AS "tipoProducto_idTipoProducto",
                    categorias.categorias
             FROM producto p
             LEFT JOIN (
                 SELECT pc.producto_idproducto,
                        STRING_AGG(c.nombre, ', ') AS categorias
                 FROM producto_categoria pc
                 JOIN categoria c ON c.idcategoria = pc.categoria_idcategoria
                 GROUP BY pc.producto_idproducto
             ) AS categorias
             ON categorias.producto_idproducto = p.idproducto`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/productos', verificarToken, async (req, res) => {
    try {
        const { rows } = await conexion.query('SELECT * FROM producto');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/productos', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, descripcion, precio, stock } = req.body;
    if (!nombre || !precio) return res.status(400).json({ message: 'Nombre y Precio son requeridos' });
    try {
        const { rows } = await conexion.query(
            'INSERT INTO producto (nombre, descripcion, precio, stock) VALUES ($1, $2, $3, $4) RETURNING "idProducto"',
            [nombre, descripcion, precio, stock || 0]
        );
        res.status(201).json({ message: 'Producto creado', idProducto: rows[0].idProducto });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/productos/:id', verificarToken, soloAdmin, async (req, res) => {
    const { nombre, descripcion, precio, stock } = req.body;
    try {
        await conexion.query(
            'UPDATE producto SET nombre=$1, descripcion=$2, precio=$3, stock=$4 WHERE "idProducto"=$5',
            [nombre, descripcion, precio, stock, req.params.id]
        );
        res.json({ message: 'Producto actualizado con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/productos/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
        await conexion.query('DELETE FROM producto_y_solicitud WHERE "producto_idProducto" = $1', [req.params.id]);
        await conexion.query('DELETE FROM producto WHERE "idProducto" = $1', [req.params.id]);
        res.json({ message: 'Producto eliminado con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/productos/:id/categorias', async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT c."idCategoria", c.nombre
             FROM categoria c
             JOIN producto_categoria pc ON pc."categoria_idCategoria" = c."idCategoria"
             WHERE pc."producto_idProducto" = $1`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/productos/:id/categorias', async (req, res) => {
    const { categorias } = req.body;
    try {
        await conexion.query('DELETE FROM producto_categoria WHERE "producto_idProducto" = $1', [req.params.id]);
        if (categorias && categorias.length > 0) {
            for (const catId of categorias) {
                await conexion.query(
                    'INSERT INTO producto_categoria ("producto_idProducto", "categoria_idCategoria") VALUES ($1, $2)',
                    [req.params.id, catId]
                );
            }
        }
        res.json({ message: 'Categorías actualizadas correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Categorías ───────────────────────────────────────────────────────────────
app.get('/categorias', async (req, res) => {
    try {
        const { rows } = await conexion.query('SELECT * FROM categoria ORDER BY nombre ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/categorias', verificarToken, soloAdmin, async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });
    try {
        const { rows } = await conexion.query(
            'INSERT INTO categoria (nombre) VALUES ($1) RETURNING "idCategoria"',
            [nombre]
        );
        res.status(201).json({ idCategoria: rows[0].idCategoria, nombre });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/categorias/:id', verificarToken, soloAdmin, async (req, res) => {
    try {
        await conexion.query('DELETE FROM categoria WHERE "idCategoria" = $1', [req.params.id]);
        res.json({ message: 'Categoría eliminada con éxito' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
app.get('/api/dashboard/estadisticas', verificarToken, soloTecnico, async (req, res) => {
    const periodo = req.query.periodo === 'semana' ? 'semana' : 'hoy';
    const filtroFecha = periodo === 'semana'
        ? "fecha_registro >= CURRENT_DATE - INTERVAL '6 days'"
        : 'CAST(fecha_registro AS DATE) = CURRENT_DATE';
    try {
        const { rows } = await conexion.query(
            `SELECT
                COUNT(*) FILTER (WHERE TipoDeSolicitud_idDeSolicitud = 1
                    AND estado NOT IN ('Entregado', 'Cancelado')) AS mantenimientos,
                COUNT(*) FILTER (WHERE estado = 'Pendiente') AS entregas_pendientes,
                COALESCE(SUM(total_estimado), 0) AS suma_total
             FROM solicitud
             WHERE ${filtroFecha}`
        );
        const datos = rows[0];
        res.json({
            periodo,
            mantenimientos: `${datos.mantenimientos || 0} Activos`,
            entregas: `${datos.entregas_pendientes || 0} Pendientes`,
            totalEstimado: `$${Number(datos.suma_total).toLocaleString('es-CO')}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/ultimas-solicitudes', async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT idsolicitud AS "idSolicitud", numeroOrden AS "numeroOrden",
                    estado, TO_CHAR(fecha_registro, 'DD/MM/YYYY HH24:MI') AS fecha,
                    total_estimado
             FROM solicitud
             ORDER BY fecha_registro DESC LIMIT 5`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reportes/dashboard', verificarToken, soloAdmin, async (req, res) => {
    const periodo = ['semanal', 'mensual', 'anual'].includes(req.query.periodo)
        ? req.query.periodo
        : 'mensual';
    const intervalos = {
        semanal: "CURRENT_DATE - INTERVAL '6 days'",
        mensual: "CURRENT_DATE - INTERVAL '1 month'",
        anual: "CURRENT_DATE - INTERVAL '1 year'",
    };
    try {
        const { rows } = await conexion.query(
            `SELECT
                COUNT(*)::integer AS total_solicitudes,
                COUNT(*) FILTER (WHERE TipoDeSolicitud_idDeSolicitud = 1)::integer AS mantenimientos,
                COUNT(*) FILTER (WHERE TipoDeSolicitud_idDeSolicitud = 4)::integer AS ventas,
                COUNT(*) FILTER (WHERE estado = 'Entregado')::integer AS entregadas,
                COALESCE(SUM(total_estimado), 0)::numeric AS total_estimado
             FROM solicitud
             WHERE fecha_registro >= ${intervalos[periodo]}`
        );
        res.json({ periodo, generadoEn: new Date().toISOString(), ...rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard/comparativo', verificarToken, soloTecnico, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT DATE(fecha_registro) AS fecha, COUNT(*) AS total_solicitudes,
                    COALESCE(SUM(total_estimado), 0) AS suma_total
             FROM solicitud
             WHERE DATE(fecha_registro) IN (CURRENT_DATE, CURRENT_DATE - INTERVAL '1 day')
             GROUP BY DATE(fecha_registro)`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Reportes ─────────────────────────────────────────────────────────────────
app.get('/api/reportes/semanal', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT TO_CHAR(DATE_TRUNC('week', fecha_registro), 'IYYY-IW') AS semana,
                    MIN(DATE(fecha_registro)) AS fecha_inicio,
                    MAX(DATE(fecha_registro)) AS fecha_fin,
                    COUNT(*) AS total_solicitudes,
                    COALESCE(SUM(total_estimado), 0) AS suma_total
             FROM solicitud
             GROUP BY DATE_TRUNC('week', fecha_registro)
             ORDER BY semana DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reportes/mensual', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT TO_CHAR(fecha_registro, 'YYYY-MM') AS mes,
                    COUNT(*) AS total_solicitudes,
                    COALESCE(SUM(total_estimado), 0) AS suma_total
             FROM solicitud
             GROUP BY TO_CHAR(fecha_registro, 'YYYY-MM')
             ORDER BY mes DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Solicitud cliente ────────────────────────────────────────────────────────
app.post('/api/venta', verificarToken, cargarImagenesSolicitud, async (req, res) => {
    const { tipo, nombreArticulo, descripcion, urgencia, estadoArticulo, precioEstimado } = req.body;
    const imagenes = Array.isArray(req.files) ? req.files : [];
    const imagenUrls = imagenes.map((file) => `/uploads/solicitudes/${file.filename}`);
    const imagenUrl = imagenUrls[0] || null;
    const eliminarImagenes = () => {
        imagenes.forEach((file) => fs.unlink(file.path, () => {}));
    };

    if (!tipo || !nombreArticulo || !descripcion) {
        eliminarImagenes();
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const tipoDeSolicitud = tipo === 'mantenimiento' ? 1 : 4;
    const urgenciaFinal   = tipo === 'mantenimiento' ? (urgencia || 'Media') : 'Media';
    const ordenGenerada   = Math.floor(Math.random() * 90000) + 10000;
    const totalEstimado = tipo === 'venta' && precioEstimado
        ? Number(precioEstimado)
        : 0;

    if (!Number.isFinite(totalEstimado) || totalEstimado < 0) {
        eliminarImagenes();
        return res.status(400).json({ error: 'El precio estimado no es válido.' });
    }

    try {
        let clienteResult = await conexion.query(
            'SELECT idcliente FROM cliente WHERE usuario_idusuario = $1',
            [req.usuario.id]
        );

        if (clienteResult.rows.length === 0) {
            // Cuenta creada ANTES de este arreglo: le creamos su fila en "cliente"
            // ahora mismo, tomando los datos que ya tiene guardados en "usuario",
            // en vez de dejarla bloqueada para siempre.
            const { rows: datosUsuario } = await conexion.query(
                'SELECT documento, direccion, telefono FROM usuario WHERE idusuario = $1',
                [req.usuario.id]
            );
            if (datosUsuario.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado.' });
            }
            clienteResult = await conexion.query(
                `INSERT INTO cliente (documento, direccion, telefono, usuario_idusuario)
                 VALUES ($1, $2, $3, $4) RETURNING idcliente`,
                [datosUsuario[0].documento, datosUsuario[0].direccion, datosUsuario[0].telefono, req.usuario.id]
            );
        }

        const idCliente = clienteResult.rows[0].idcliente;

        await conexion.query(
            `INSERT INTO solicitud (
                idSolicitud, numeroOrden, fecha_registro, cliente_idCliente,
                estado, TipoDeSolicitud_idDeSolicitud, urgencia, total_estimado
             )
             VALUES ($1, $2, NOW(), $3, 'Pendiente', $4, $5, $6)`,
            [
                ordenGenerada,
                String(ordenGenerada),
                idCliente,
                tipoDeSolicitud,
                urgenciaFinal,
                totalEstimado,
            ]
        );

        const detalleCompleto = `[${tipo.toUpperCase()}] ${nombreArticulo}: ${descripcion}` +
            `${estadoArticulo ? ` | Estado: ${estadoArticulo}` : ''}` +
            `${precioEstimado ? ` | Precio estimado: $${precioEstimado}` : ''}` +
            `${imagenUrls.length ? ` | Imágenes: ${imagenUrls.join(', ')}` : ''}`;
        const detalle = detalleCompleto.slice(0, 200);

        await conexion.query(
            `INSERT INTO producto_y_solicitud (producto_idProducto, solicitud_idSolicitud, Cantidad, detalle_servicio)
             VALUES ($1, $2, 1, $3)`,
            [2, ordenGenerada, detalle]
        );

        await conexion.query(
            `INSERT INTO detalle_solicitud
                (solicitud_idsolicitud, nombrearticulo, descripcion, estadoarticulo, precioestimado, imagen)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                ordenGenerada,
                nombreArticulo.trim(),
                descripcion.trim(),
                tipo === 'venta' ? estadoArticulo || null : null,
                tipo === 'venta' && precioEstimado ? Number(precioEstimado) : null,
                imagenUrls.length ? imagenUrls.join(',') : null,
            ]
        );

        for (const imagenUrl of imagenUrls) {
            await conexion.query(
                `INSERT INTO solicitud_imagen (solicitud_id, tipo, ruta)
                 VALUES ($1, $2, $3)`,
                [ordenGenerada, tipo, imagenUrl]
            );
        }

        res.status(201).json({ message: 'Solicitud enviada correctamente', numeroOrden: ordenGenerada, tipo, imagenUrl, imagenUrls });
    } catch (err) {
        eliminarImagenes();
        console.error('Error al guardar solicitud de cliente:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Ventas / Carrito ─────────────────────────────────────────────────────────
app.post('/venta', async (req, res) => {
    const { idUsuario, total, metodoPago, detallePago, productos } = req.body;
    if (!idUsuario || !total || !productos || productos.length === 0)
        return res.status(400).json({ message: 'Faltan datos para registrar la venta' });

    try {
        const { rows: ventaRows } = await conexion.query(
            `INSERT INTO venta (fecha, estado, total, idusuario) VALUES (CURRENT_DATE, 'pagado', $1, $2) RETURNING idventa`,
            [total, idUsuario]
        );
        // OJO: RETURNING idventa (minúscula) devuelve la clave "idventa", no "idVenta".
        // Con el nombre mal escrito esto quedaba en `undefined` y rompía los inserts de abajo.
        const idVenta = ventaRows[0].idventa;

        for (const p of productos) {
            await conexion.query(
                `INSERT INTO ventadetalle (cantidad, preciounitario, subtotal, venta_idventa, producto_idproducto) VALUES ($1, $2, $3, $4, $5)`,
                [p.cantidad, p.precioUnitario, p.cantidad * p.precioUnitario, idVenta, p.idProducto]
            );
        }

        const referencia = 'PAY-' + Date.now();
        await conexion.query(
            `INSERT INTO pago (venta_idventa, metodopago, referenciapago, detallepago, estadopago) VALUES ($1, $2, $3, $4, $5)`,
            [idVenta, metodoPago, referencia, detallePago || null, 'aprobado']
        );

        res.status(201).json({ message: 'Venta y pago registrados correctamente', idVenta, referencia });

        // El correo se manda DESPUÉS de responder: si Gmail falla o tarda, el cliente
        // ya recibió su confirmación de compra y no se queda esperando por el correo.
        try {
            const { rows: datosUsuario } = await conexion.query(
                'SELECT nombre, correo FROM usuario WHERE idusuario = $1', [idUsuario]
            );
            if (datosUsuario[0]?.correo) {
                await enviarCorreoPagoConfirmado({
                    correo: datosUsuario[0].correo,
                    nombre: datosUsuario[0].nombre,
                    total,
                    referencia,
                    idVenta,
                });
            }
        } catch (errCorreo) {
            // Que falle el correo nunca debe verse como que falló la venta.
            console.error('No se pudo enviar el correo de pago confirmado:', errCorreo.message);
        }
    } catch (err) {
        console.error('Error en /venta ->', err.message);
        res.status(500).json({ error: 'No se pudo registrar la venta.' });
    }
});

app.get('/ventas/:idUsuario', verificarToken, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT v."idVenta", v."Fecha", v.total, v."Estado",
                    vd.cantidad, vd."precioUnitario", vd.subtotal,
                    p.nombre AS producto,
                    pg."metodoPago", pg."referenciaPago", pg."estadoPago"
             FROM "Venta" v
             JOIN "VentaDetalle" vd ON v."idVenta" = vd."Venta_idVenta"
             JOIN producto p ON vd."producto_idProducto" = p."idProducto"
             LEFT JOIN pago pg ON v."idVenta" = pg."Venta_idVenta"
             WHERE v."idUsuario" = $1
             ORDER BY v."Fecha" DESC`,
            [req.params.idUsuario]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Técnico solicitudes ──────────────────────────────────────────────────────
app.get('/api/tecnico/solicitudes', verificarToken, soloTecnico, async (req, res) => {
    try {
        const { rows } = await conexion.query(
            `SELECT idSolicitud, TO_CHAR(fecha_registro, 'DD/MM/YYYY') AS fecha, total_estimado, estado
             FROM solicitud ORDER BY fecha_registro DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tecnico/solicitudes/:id/estado', verificarToken, soloTecnico, async (req, res) => {
    const { nuevoEstado } = req.body;
    try {
        await conexion.query(
            'UPDATE solicitud SET estado = $1 WHERE idSolicitud = $2',
            [nuevoEstado, req.params.id]
        );
        res.json({ message: `Solicitud #${req.params.id} actualizada a ${nuevoEstado}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Solicitudes del cliente autenticado
app.get('/api/mis-solicitudes', verificarToken, async (req, res) => {
    try {
        const { rows } = await conexion.query(
                `SELECT s.idSolicitud AS "idSolicitud",
                    s.numeroOrden AS "numeroOrden",
                    s.fecha_registro,
                    s.total_estimado,
                    s.estado,
                    s.urgencia,
                    COALESCE(STRING_AGG(COALESCE(ps.detalle_servicio, ''), ', '), '') AS servicios
             FROM solicitud s
                         JOIN cliente c ON c.idcliente = s.cliente_idcliente
                         LEFT JOIN producto_y_solicitud ps
                             ON ps.solicitud_idSolicitud = s.idSolicitud
                         WHERE c.usuario_idusuario = $1
                         GROUP BY s.idSolicitud, s.numeroOrden, s.fecha_registro,
                      s.total_estimado, s.estado, s.urgencia
             ORDER BY s.fecha_registro DESC`,
            [req.usuario.id]
        );

        const payload = rows.map((row) => ({
            ...row,
            servicios: row.servicios || 'Sin servicios',
            fecha_registro: row.fecha_registro
                ? new Date(row.fecha_registro).toISOString().slice(0, 10)
                : null,
        }));

        res.json(payload);
    } catch (err) {
        console.error('Error en /api/mis-solicitudes:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});