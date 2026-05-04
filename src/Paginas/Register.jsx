import React, { useState } from 'react';
import '../CSS/Global.css';
import { useNavigate } from 'react-router-dom';


function Register() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState({
    nombre: '',
    correo: '',
    pass: '',
    confirmar: ''
  });

  const manejarCambio = (e) => {
    setDatos({
      ...datos,
      [e.target.name]: e.target.value
    });
  };
  const registrar = async () => {
    if (datos.pass !== datos.confirmar) {
      alert("Las contraseñas no coinciden");
      return;
    }
  
    try {
      // verificar si ya existe el usuario
      const resCheck = await fetch(`http://localhost:3000/usuarios?user=${datos.nombre}`);
      const dataCheck = await resCheck.json();
  
      if (dataCheck.length > 0) {
        alert("El usuario ya existe");
        return;
      }
  
      // guardar usuario
      const res = await fetch('http://localhost:3000/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: datos.nombre,
          pass: datos.pass,
          rol: 'cliente'
        })
      });
  
      if (res.ok) {
        alert("Usuario registrado correctamente");
        navigate('/login');
      }
  
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="contenedor-padre">
      <div className="tarjeta-login">
        <div className="cabecera-pestanas">
          <button
            className="pestana"
            onClick={() => navigate('/login')}
          >
            Iniciar sesión
          </button>
          <div className="divisor-vertical"></div>
          <button className="pestana activa">
            Registrarse
          </button>
        </div>
        <div className="formulario">
          <label>Nombre</label>
          <input
            type="text"
            name="nombre"
            value={datos.nombre}
            onChange={manejarCambio}
          />
          <label>Correo</label>
          <input
            type="email"
            name="correo"
            value={datos.correo}
            onChange={manejarCambio}
          />
          <label>Contraseña</label>
          <input
            type="password"
            name="pass"
            value={datos.pass}
            onChange={manejarCambio}
          />
          <label>Confirmar contraseña</label>
          <input
            type="password"
            name="confirmar"
            value={datos.confirmar}
            onChange={manejarCambio}
          />
          <button onClick={registrar}>
            Registrarse
          </button>
        </div>
      </div>
    </div>
  )
}

export default Register;  