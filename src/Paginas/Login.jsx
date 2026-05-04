import '../CSS/Global.css'  
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';


function Login() {
  
  const navigate = useNavigate();  
  const [usuarioInput, setUsuarioInput] = useState('');
  const [passInput, setPassInput] = useState('');
  
  const cerrarSesion = () => {
  localStorage.removeItem('user');
  sessionStorage.clear();

  navigate('/', { replace: true });
};
  

const validar = async () => {
  try {
    const res = await fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user: usuarioInput,
        pass: passInput
      })
    });

    const data = await res.json();
    console.log(data); 

    if (res.ok) {
      // guardar token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.usuario));

      navigate('/home');
    } else {
      alert(data.mensaje);
    }

  } catch (error) {
    console.error("Error:", error);
  }
};

  return (
    <div className="contenedor-padre">
      <div className="tarjeta-login">
        <div className="cabecera-pestanas">
          <button className="pestana activa">
            Iniciar sesión
          </button>
          <div className="divisor-vertical"></div>
          <button
            className="pestana"
            onClick={() => navigate('/register')}
          >
            Registrarse
          </button>
        </div>
        <div className="formulario">
          <label>Usuario</label>
          <input
            type="text"
            placeholder="Ej: JuanPerez"
            value={usuarioInput}
            onChange={(e) => setUsuarioInput(e.target.value)}
          />
          <label>Contraseña</label>
          <input
            type="password"
            placeholder="*******"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
          />
          <button onClick={validar}>
            Iniciar Sesión
          </button>
          <p className="recuperar">
            ¿Olvidaste tu contraseña?
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login;