import React from 'react';

function Relojs({ volver }) {
  const productos = [
    { id: 1, nombre: "Classic Gold Edition", precio: 850000, img: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=200", modelo: "Luxury-X", anio: 2023 },
    { id: 2, nombre: "Sport Stealth Black", precio: 420000, img: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=200", modelo: "Runner-Z", anio: 2024 },
    { id: 3, nombre: "Ocean Diver Pro", precio: 1250000, img: "https://images.unsplash.com/photo-1547996160-81dfa63595dd?q=80&w=200", modelo: "Marine-50", anio: 2022 },
    { id: 4, nombre: "Minimalist Silver", precio: 310000, img: "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?q=80&w=200", modelo: "Slim-Fit", anio: 2023 },
    { id: 5, nombre: "Vintage Leather", precio: 580000, img: "https://images.unsplash.com/photo-1539533377285-bb41ee502941?q=80&w=200", modelo: "Retro-Classic", anio: 2021 },
    { id: 6, nombre: "Executive Chrono", precio: 2100000, img: "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=200", modelo: "Titan-XV", anio: 2024 },
    { id: 7, nombre: "Sky Pilot Blue", precio: 940000, img: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=200", modelo: "Aviator-G1", anio: 2023 },
    { id: 8, nombre: "Midnight Rose", precio: 720000, img: "https://images.unsplash.com/photo-1508685096489-7aac291ba597?q=80&w=200", modelo: "Elegance-R", anio: 2022 },
    { id: 9, nombre: "Urban Graphite", precio: 395000, img: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?q=80&w=200", modelo: "City-Pulse", anio: 2024 },
    { id: 10, nombre: "Heritage Automatic", precio: 3400000, img: "https://images.unsplash.com/photo-1619134769035-4733f892d24c?q=80&w=200", modelo: "Legacy-One", anio: 2023 }
  ];

  function formatoMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  return (

    
    <div style={{ backgroundColor: '#121212', minHeight: '100vh', padding: '40px 20px', color: 'white' }}>
      <button 
        onClick={volver} 
        style={{
          backgroundColor: '#4caf50',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        ← Volver al Inicio
      </button>
      <div style={{ maxWidth: '1000px', margin: '0 auto', overflowX: 'auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', fontFamily: 'sans-serif' }}>
          Productos de Relojería
        </h2>
        
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e1e1e' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>Imagen</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Nombre del Reloj</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Modelo y Año</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Precio (COP)</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(function(p) {
              return (
                <tr key={p.id} style={{ backgroundColor: '#1e1e1e' }}>
                  <td style={{ padding: '15px' }}>
                    <img src={p.img} alt={p.nombre} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px' }} />
                  </td>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>{p.nombre}</td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ color: '#00d4ff' }}>{p.modelo}</span> | <small>{p.anio}</small>
                  </td>
                  <td style={{ padding: '15px', color: '#4caf50', fontSize: '1.1em' }}>
                    {formatoMoneda(p.precio)}
                  </td>
                </tr>
                
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Relojs;