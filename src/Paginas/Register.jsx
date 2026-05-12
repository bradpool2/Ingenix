import React, { useState } from 'react';
import '../CSS/Global.css';
import { useNavigate } from 'react-router-dom';

function Register() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    pass: '',
    confirmar: ''
  });

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    if (name === 'telefono' && !/^\d*$/.test(value)) return;
    setDatos({ ...datos, [name]: value });
  };

  const registrar = async () => {
    if (datos.pass !== datos.confirmar) {
      alert("Las contraseñas no coinciden");
      return;
    }

    if (datos.telefono.length < 7) {
      alert("El teléfono debe tener al menos 7 dígitos");
      return;
    }

    try {
      const resCheck = await fetch(`http://localhost:3001/usuarios?user=${datos.nombre}`);
      const dataCheck = await resCheck.json();

      if (dataCheck.length > 0) {
        alert("El usuario ya existe");
        return;
      }

      const res = await fetch('http://localhost:3001/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: datos.nombre,
          correo: datos.correo,
          telefono: datos.telefono,
          pass: datos.pass,
          rol: 'cliente'
        })
      });

      if (res.ok) {
        alert("Usuario registrado correctamente");
        navigate('/login');
      } else {
        alert("Error al registrar, intenta de nuevo");
      }

    } catch (error) {
      console.error(error);
      alert("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="contenedor-padre">
      <div className="tarjeta-login">
        <div className="cabecera-pestanas">
          <button className="pestana" onClick={() => navigate('/login')}>
            Iniciar sesión
          </button>
          <div className="divisor-vertical"></div>
          <button className="pestana activa">
            Registrarse
          </button>
        </div>
        <div className="formulario">
          <label>Nombre</label>
          <input type="text" name="nombre" value={datos.nombre} onChange={manejarCambio} />

          <label>Correo</label>
          <input type="email" name="correo" value={datos.correo} onChange={manejarCambio} />

          <label>Teléfono</label>
          <input type="tel" name="telefono" value={datos.telefono} onChange={manejarCambio} maxLength={10} />

          <label>Contraseña</label>
          <input type="password" name="pass" value={datos.pass} onChange={manejarCambio} />

          <label>Confirmar contraseña</label>
          <input type="password" name="confirmar" value={datos.confirmar} onChange={manejarCambio} />

          <button onClick={registrar}>Registrarse</button>
        </div>
      </div>
    </div>
  );
}

export default Register;