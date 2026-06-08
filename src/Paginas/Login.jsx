import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [nombreInput, setNombreInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validar = async () => {
    setError('');
    if (!nombreInput || !passInput) {
      setError('Completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreInput, pass: passInput })
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
          <label>Usuario</label>
          <input
            type="text"
            placeholder="Ej: Brayan Moreno"
            value={nombreInput}
            onChange={(e) => setNombreInput(e.target.value)}
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
          <p className="recuperar">¿Olvidaste tu contraseña?</p>
        </div>
      </div>
    </div>
  );
}

export default Login;