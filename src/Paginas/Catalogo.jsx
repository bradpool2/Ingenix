import React, { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import '../CSS/Global.css';

function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/productos')
      .then(res => res.json())
      .then(data => {
        setProductos(data);
        setCargando(false);
      })
      .catch(err => {
        console.error('Error al cargar productos:', err);
        setCargando(false);
      });
  }, []);

  function formatoMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  return (
    <div>
      <NavBar />

      <div style={{ padding: '100px 40px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px', fontFamily: 'century gothic' }}>
          Catálogo de Productos
        </h2>

        {cargando && (
          <p style={{ textAlign: 'center', color: '#777' }}>Cargando productos...</p>
        )}

        {!cargando && productos.length === 0 && (
          <p style={{ textAlign: 'center', color: '#777' }}>No hay productos disponibles.</p>
        )}

        {!cargando && productos.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '30px',
            justifyContent: 'center'
          }}>
            {productos.map(p => (
              <div key={p.idProducto} className="card" style={{ width: '260px', padding: '20px' }}>
                <h5>{p.nombre}</h5>
                <p className="card-text">{p.descripcion || 'Sin descripción'}</p>
                <p style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '10px' }}>
                  {formatoMoneda(p.precio)}
                </p>
                <p style={{ textAlign: 'center', color: '#777', fontSize: '13px' }}>
                  Stock: {p.stock ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Catalogo;