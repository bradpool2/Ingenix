
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "clave_secreta";

// Leé db.json
const getUsuarios = () => {
  const data = fs.readFileSync('db.json');
  const json = JSON.parse(data);
  return json.usuarios;
};

// Ruta login con JWT
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
    {
      id: usuario.id,
      rol: usuario.rol
    },
    SECRET,
    { expiresIn: '1h' }
  );

  res.json({
    token,
    usuario
  });
});

// prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando con JWT');
});

app.listen(3001, () => {
  console.log('Servidor corriendo en puerto 3001');
});