import { useState } from 'react';
import { useNavigate, Link, Outlet, useLocation  } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [correoInput, setCorreoInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validar = async () => {
    setError('');
    if (!correoInput || !passInput) {
      setError('Completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correoInput, pass: passInput })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        navigate('/home');
      } else {
        setError(data.message || 'Credenciales inválidas');
      }
    } catch (err) {
      setError('No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contenedor-padre">
      <div className="tarjeta-login">
        <div className="cabecera-pestanas">
          <button className="pestana activa">Iniciar sesión</button>
          <div className="divisor-vertical"></div>
          <button className="pestana" onClick={() => navigate('/register')}>
            Registrarse
          </button>
        </div>
        <div className="formulario">
          {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
          <label>Correo electronico</label>
          <input
            type="email"
            placeholder="Ej: Juan@ingenix.com"
            value={correoInput}
            onChange={(e) => setCorreoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && validar()}
          />
          <label>Contraseña</label>
          <input
            type="password"
            placeholder="*******"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && validar()}
          />
          <button onClick={validar} disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
          <Link to="/recuperar-password" className="recuperar"> Olvidé mi contraseña</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;