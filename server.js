import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import conexion from './Backend/config/db.js';
import crypto from 'crypto';


const app = express();
const PUERTO = 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('🟢 API funcionando correctamente');
});

app.post('/login', (req, res) => {
    const { nombre, pass } = req.body;
    if (!nombre || !pass) {
        return res.status(400).json({ message: 'Faltan datos' });
    }

    // Primero traemos el usuario por nombre
    conexion.query(
        'SELECT * FROM usuario WHERE nombre = ?',
        [nombre],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(401).json({ message: 'Credenciales inválidas' });

            const usuario = results[0];

            // Separar salt y hash guardado
            const [salt, hashGuardado] = usuario.pass.split(':');

            // Recalcular hash con la misma sal
            const hashIntento = crypto.createHash('sha256')
                .update(pass + salt)
                .digest('hex');

            // Comparar
            if (hashIntento !== hashGuardado) {
                return res.status(401).json({ message: 'Credenciales inválidas' });
            }

            const token = jwt.sign(
                { id: usuario.idUsuario, nombre: usuario.nombre, rol: usuario.rol_idRol },
                process.env.JWT_SECRET || 'clave_secreta_temporal',
                { expiresIn: '2h' }
            );

            res.json({ mensaje: 'Login exitoso', token, usuario });
        }
    );
});
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

app.post('/usuario', (req, res) => {
    const { nombre, correo, documento, telefono, pass, TipoDocumento_idTipoDocumento, rol_idRol } = req.body;

    if (!nombre || !correo || !documento || !pass) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    conexion.query(
        'INSERT INTO usuario (nombre, correo, documento, telefono, pass, TipoDocumento_idTipoDocumento, rol_idRol) VALUES (?, ?, ?, ?, ?, ?, ?)',
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

app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});