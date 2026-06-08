import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import conexion from './Backend/config/db.js';

const app = express();
const PUERTO = 3000;

app.use(cors());
app.use(bodyParser.json());

// ─── Test ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send('🟢 API funcionando correctamente');
});

// ─── Login ─────────────────────────────────────────────────────────────────────
app.post('/login', (req, res) => {
    const { nombre, pass } = req.body;

    if (!nombre || !pass) {
        return res.status(400).json({ message: 'Faltan datos' });
    }

    conexion.query(
        `SELECT u.*, r.nombreRol AS rol
         FROM usuario u
         JOIN rol r ON u.rol_idRol = r.idRol
         WHERE u.nombre = ? AND u.pass = SHA2(?, 256)`,
        [nombre, pass],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0)
                return res.status(401).json({ message: 'Credenciales inválidas' });

            const usuario = results[0];

            const token = jwt.sign(
                { id: usuario.idUsuario, nombre: usuario.nombre, rol: usuario.rol },
                process.env.JWT_SECRET || 'clave_secreta_temporal',
                { expiresIn: '2h' }
            );

            res.json({ mensaje: 'Login exitoso', token, usuario });
        }
    );
});

// ─── Buscar usuario ────────────────────────────────────────────────────────────
app.get('/usuario', (req, res) => {
    const { nombre, correo, documento } = req.query;

    let campo, valor;

    if (correo) {
        campo = 'correo';
        valor = correo;
    } else if (documento) {
        campo = 'documento';
        valor = documento;
    } else if (nombre) {
        campo = 'nombre';
        valor = nombre;
    } else {
        return res.status(400).json({ message: 'Falta parámetro de búsqueda' });
    }

    conexion.query(
        `SELECT * FROM usuario WHERE ${campo} = ?`,
        [valor],
        (err, results) => {
            if (err) {
                console.error('❌ Error GET /usuario:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json(results);
        }
    );
});

// ─── Crear usuario ─────────────────────────────────────────────────────────────
app.post('/usuario', (req, res) => {
    const { nombre, correo, documento, telefono, pass, TipoDocumento_idTipoDocumento, rol_idRol } = req.body;

    if (!nombre || !correo || !documento || !pass) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    // ✅ SHA2(?, 256) — mismo hash que usa el login para verificar
    conexion.query(
        'INSERT INTO usuario (nombre, correo, documento, telefono, pass, TipoDocumento_idTipoDocumento, rol_idRol) VALUES (?, ?, ?, ?, SHA2(?, 256), ?, ?)',
        [nombre, correo, documento, telefono, pass, TipoDocumento_idTipoDocumento, rol_idRol],
        (err, results) => {
            if (err) {
                console.error('❌ Error POST /usuario:', err);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'Usuario creado', id: results.insertId });
        }
    );
});

// ─── Iniciar servidor ──────────────────────────────────────────────────────────
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});