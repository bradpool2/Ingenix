import React, { useState } from "react";
import "../CSS/Global.css";
import { useNavigate } from "react-router-dom";


function Register() {
  const navigate = useNavigate();

  const [datos, setDatos] = useState({
    nombre: "",
    correo: "",
    documento: "",
    telefono: "",
    tipoDocumento: "",
    pass: "",
    confirmar: "",
  });

  const manejarCambio = (e) => {
    setDatos({
      ...datos,
      [e.target.name]: e.target.value,
    });
  };

  const registrar = async () => {
    if (datos.pass !== datos.confirmar) {
      alert("Las contraseñas no coinciden");
      return;
    }

    try {
      const resCheck = await fetch(
        `http://localhost:3000/usuario?correo=${datos.correo}`,
      );

      const dataCheck = await resCheck.json();

      if (dataCheck.length > 0) {
        alert("El correo ya existe");
        return;
      }

      // verificar documento
      const resDocumento = await fetch(
        `http://localhost:3000/usuario?documento=${datos.documento}`,
      );

      const dataDocumento = await resDocumento.json();

      if (dataDocumento.length > 0) {
        alert("El documento ya existe");
        return;
      }

      // registrar usuario
      const res = await fetch("http://localhost:3000/usuarios/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: datos.nombre,
          correo: datos.correo,
          documento: datos.documento,
          telefono: datos.telefono,
          pass: datos.pass,
      
          TipoDocumento_idTipoDocumento: parseInt(datos.tipoDocumento),
      
          rol_idRol: 3,
        }),
      });

      if (res.ok) {
        alert("Usuario registrado correctamente");
        navigate("/login");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="contenedor-padre">
      <div className="tarjeta-login">
        <div className="cabecera-pestanas">
          <button className="pestana" onClick={() => navigate("/login")}>
            Iniciar sesión
          </button>

          <div className="divisor-vertical"></div>

          <button className="pestana activa">Registrarse</button>
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

          <label>Tipo de documento</label>
          <select
            className="input-select"
            name="tipoDocumento"
            value={datos.tipoDocumento}
            onChange={manejarCambio}
          >
            <option value="">Seleccione</option>
            <option value="1">CC</option>
            <option value="2">TI</option>
            <option value="3">CE</option>
            <option value="4">PASAPORTE</option>
            <option value="5">NIT</option>
          </select>

          <label>Documento</label>
          <input
            type="text"
            name="documento"
            value={datos.documento}
            onChange={manejarCambio}
          />

          <label>Teléfono</label>
          <input
            type="text"
            name="telefono"
            value={datos.telefono}
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

          <button onClick={registrar}>Registrarse</button>
        </div>
      </div>
    </div>
  );
}

export default Register;
