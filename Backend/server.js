const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "clave_secreta";

// Lee db.json
const getUsuarios = () => {
  const data = fs.readFileSync('db.json');
  const json = JSON.parse(data);
  return json.usuarios;
};

// Ruta login con JWT
// Login
app.post('/login', (req, res) => {
  const { user, pass } = req.body;
  const usuarios = getUsuarios();

  const usuario = usuarios.find(
    u => u.user === user && u.pass == pass
  );

  if (!usuario) {
    return res.status(401).json({ mensaje: "Credenciales incorrectas" });
  }

  // Generar token
  const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token, usuario });
});

// Obtener usuarios
app.get('/usuarios', (req, res) => {
  const usuarios = getUsuarios();
  const { user } = req.query;
  if (user) {
    const filtrados = usuarios.filter(u => u.user === user);
    return res.json(filtrados);
  }
  res.json(usuarios);
});

// Registrar usuario nuevo
app.post('/usuarios', (req, res) => {
  const data = JSON.parse(fs.readFileSync('db.json'));
  
  const ultimoId = data.usuarios.length > 0
    ? Math.max(...data.usuarios.map(u => parseInt(u.id) || 0))
    : 0;

  const nuevoUsuario = {
    id: (ultimoId + 1).toString(),
    ...req.body
  };

  data.usuarios.push(nuevoUsuario);
  fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
  res.status(201).json(nuevoUsuario);
});

// Prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando con JWT');
});

app.listen(3001, () => {
  console.log('Servidor corriendo en puerto 3001');
});

app.patch('/usuarios/:id', (req, res) => {
  const data = JSON.parse(fs.readFileSync('db.json'));
  const index = data.usuarios.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ mensaje: "Usuario no encontrado" });
  }

  data.usuarios[index] = { ...data.usuarios[index], ...req.body };
  fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
  res.json(data.usuarios[index]);
});