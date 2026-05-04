import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Solicitudes.css';
// import { IconName } from "react-icons/bi";
import { BiAlignJustify } from "react-icons/bi";
import { BiAlignRight } from "react-icons/bi";
import NavBar  from '../components/NavBar';



function Solicitud() {
  const navigate = useNavigate();
  const finalizar = async () => {
    const nuevaSolicitud = {
      orden,
      tipo,
      subtipo,
      danos,
      servicios,
      total: totalEstimado,
      fecha: new Date().toLocaleDateString('es-CO')
    };
  
    await fetch('http://localhost:3000/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaSolicitud)
    });
  
    alert('Solicitud guardada correctamente');
    cambiarVista('home');
  };
  
  const pasoValido = () => {
    switch (paso) {
      case 1: return orden.trim() !== '';
      case 2: return tipo !== '' && subtipo !== '';
      case 3: return danos.length > 0;
      case 4: return servicios.length > 0;
      default: return true;
    }
  };

  // --- ESTADOS ---
  const [paso, setPaso] = useState(1);
  const [orden, setOrden] = useState('');
  const [tipo, setTipo] = useState('');
  const [subtipo, setSubtipo] = useState('');
  const [danos, setDanos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [piezas, setPiezas] = useState({});
  const [verResumen, setVerResumen] = useState(false);

  // --- DATOS ---
  const danosData = {
    reloj: [
      { zona: 'Exterior', items: ['Vidrio rayado o roto', 'Caja golpeada', 'Corona rota o floja', 'Tapa trasera dañada'] },
      { zona: 'Correa / pulso', items: ['Correa desgastada', 'Cierre roto', 'Eslabones sueltos'] },
      { zona: 'Funcionamiento', items: ['No enciende / sin movimiento', 'Atrasa o adelanta', 'Agujas sueltas o caídas'] }
    ],
    joyeria: [
      { zona: 'Estructura', items: ['Pieza rota o partida', 'Soldadura débil', 'Deformación visible'] },
      { zona: 'Acabado', items: ['Baño desgastado', 'Opacidad / falta de brillo', 'Manchas o corrosión'] },
      { zona: 'Accesorios', items: ['Piedra suelta o perdida', 'Cierre dañado', 'Engaste flojo'] }
    ]
  };

  const serviciosData = {
    reloj: [
      {
        zona: 'Exterior',
        items: [
          { nombre: 'Cambio de vidrio/cristal', precio: 25000 },
          { nombre: 'Enderezado de caja', precio: 15000 },
          { nombre: 'Cambio de corona', precio: 12000 },
          { nombre: 'Cambio de tapa trasera', precio: 10000 }
        ]
      },
      {
        zona: 'Correa / pulso',
        items: [
          { nombre: 'Cambio de correa', precio: 20000 },
          { nombre: 'Reparación de cierre', precio: 8000 },
          { nombre: 'Cambio de eslabones', precio: 6000 }
        ]
      },
      {
        zona: 'Funcionamiento',
        items: [
          { nombre: 'Cambio de pila', precio: 5000 },
          { nombre: 'Ajuste de hora', precio: 2000 },
          { nombre: 'Reparación de agujas', precio: 18000 },
          { nombre: 'Limpieza de mecanismo', precio: 30000 },
          { nombre: 'Cambio de mecanismo completo', precio: 80000 }
        ]
      }
    ],
    joyeria: [
      {
        zona: 'Estructura',
        items: [
          { nombre: 'Soldadura', precio: 20000 },
          { nombre: 'Enderezado', precio: 15000 },
          { nombre: 'Reparación de pieza rota', precio: 25000 }
        ]
      },
      {
        zona: 'Acabado',
        items: [
          { nombre: 'Baño en oro/plata', precio: 35000 },
          { nombre: 'Pulido y brillo', precio: 15000 },
          { nombre: 'Limpieza química', precio: 12000 }
        ]
      },
      {
        zona: 'Accesorios',
        items: [
          { nombre: 'Cambio de piedra', precio: 30000 },
          { nombre: 'Reparación de cierre', precio: 8000 },
          { nombre: 'Ajuste de engaste', precio: 12000 }
        ]
      }
    ]
  };

  const piezasData = [
    { nombre: 'Cristal / vidrio' },
    { nombre: 'Correa / pulso' },
    { nombre: 'Módulo interno completo' },
    { nombre: 'Corona / botón' }
  ];

  // --- FUNCIONES ---
  const navegar = (dir) => {
    setPaso(p => Math.max(1, Math.min(6, p + dir)));
  };

  const toggleDano = (item) => {
    setDanos(prev =>
      prev.includes(item) ? prev.filter(d => d !== item) : [...prev, item]
    );
  };

  const toggleServicio = (s) => {
    setServicios(prev =>
      prev.find(x => x.nombre === s.nombre)
        ? prev.filter(x => x.nombre !== s.nombre)
        : [...prev, s]
    );
  };

  const togglePieza = (nombre) => {
    setPiezas(prev => {
      const nuevo = { ...prev };
      if (nuevo[nombre] !== undefined) delete nuevo[nombre];
      else nuevo[nombre] = 0;
      return nuevo;
    });
  };

  const setPrecioPieza = (nombre, valor) => {
    setPiezas(prev => ({ ...prev, [nombre]: parseFloat(valor) || 0 }));
  };

  const totalEstimado =
    servicios.reduce((a, s) => a + s.precio, 0) +
    Object.values(piezas).reduce((a, v) => a + v, 0);

  // --- RENDER ---
  return (
    
    
    <div style={{ position: 'relative' }}>
     <div style={{ 
      display: 'flex', 
      justifyContent: 'flex-start', 
      marginBottom: '20px',
      position: 'relative',
      zIndex: 10 
    }}>
      <NavBar />
    </div>

      <button
  className="btn-resumen-flotante"
  onClick={() => setVerResumen(!verResumen)}
>
  <span className="icono">
    {verResumen ? <BiAlignRight color='black'/> : <BiAlignJustify color='black'/> }
  </span>
</button>

      {/* Panel lateral */}
      <div className={`panel-resumen ${verResumen ? 'abierto' : ''}`}>
        <p className="formulario-titulo" style={{ marginBottom: '1rem' }}>Resumen</p>

        <p className="seccion-label">Orden</p>
        <p className="resumen-valor">{orden || '—'}</p>

        <p className="seccion-label">Producto</p>
        <p className="resumen-valor">


          {tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : '—'}
          {subtipo ? ` — ${subtipo}` : ''}
        </p>

        <p className="seccion-label">Daños</p>
        {danos.length === 0
          ? <p className="resumen-vacio">Ninguno marcado</p>
          : danos.map(d => <p key={d} className="resumen-item">{d}</p>) 
        }

        <p className="seccion-label">Servicios</p>
        {servicios.length === 0
          ? <p className="resumen-vacio">Ninguno seleccionado</p>
          : servicios.map(s => (
              <div key={s.nombre} className="resumen-fila">
                <span>{s.nombre}</span>
                <span>${s.precio.toLocaleString('es-CO')}</span>
              </div>
            ))
        }

        <p className="seccion-label">Piezas</p>
        {Object.keys(piezas).length === 0
          ? <p className="resumen-vacio">Ninguna seleccionada</p>
          : Object.keys(piezas).map(k => (
              <div key={k} className="resumen-fila">
                <span>{k}</span>
                <span>${(piezas[k] || 0).toLocaleString('es-CO')}</span>
              </div>
            ))
        }

        <div className="resumen-total">
          <span>Total estimado</span>
          <span>${totalEstimado.toLocaleString('es-CO')} COP</span>
        </div>
      </div>

      {/* Formulario */}
      <div className="formulario-contenedor">
        <div className="formulario-tarjeta">

          {/* Barra de pasos */}
          <div className="formulario-barra">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`formulario-punto ${i < paso ? 'activo' : ''}`} />
            ))}
          </div>
          <p className="formulario-paso-label">Paso {paso} de 6</p>

          {/* PASO 1 */}
          {paso === 1 && (
            <div>
              <p className="formulario-titulo">Número de orden</p>
              <p className="formulario-subtitulo">Ingresa el número de orden del cliente</p>
              <input
                className="formulario-campo"
                type="text"
                placeholder="Ej: ORD-2024-001"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
              />
            </div>
          )}

          {/* PASO 2 */}
          {paso === 2 && (
            <div>
              <p className="formulario-titulo">¿Qué entró al taller?</p>
              <p className="formulario-subtitulo">Selecciona el tipo de producto</p>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem' }}>
                <div
                  className={`btn-tipo ${tipo === 'reloj' ? 'sel' : ''}`}
                  onClick={() => { setTipo('reloj'); setSubtipo(''); }}
                >
                  <div className="icono-tipo">⌚</div>
                  Reloj
                </div>
                <div
                  className={`btn-tipo ${tipo === 'joyeria' ? 'sel' : ''}`}
                  onClick={() => { setTipo('joyeria'); setSubtipo(''); }}
                >
                  <div className="icono-tipo">💍</div>
                  Joyería
                </div>
              </div>
              {tipo && (
                <div>
                  <p className="seccion-label">Subtipo</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(tipo === 'reloj'
                      ? ['De pulso', 'De bolsillo', 'De pared', 'Despertador']
                      : ['Anillo', 'Cadena', 'Pulsera', 'Aretes', 'Dije']
                    ).map((s) => (
                      <div
                        key={s}
                        className={`btn-subtipo ${subtipo === s ? 'sel' : ''}`}
                        onClick={() => setSubtipo(s)}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 3 */}
          {paso === 3 && (
            <div>
              <p className="formulario-titulo">Daños encontrados</p>
              <p className="formulario-subtitulo">Marca todo lo que observas</p>
              {danosData[tipo]?.map((zona) => (
                <div key={zona.zona}>
                  <p className="seccion-label">{zona.zona}</p>
                  {zona.items.map((item) => (
                    <div
                      key={item}
                      className={`check-item ${danos.includes(item) ? 'sel' : ''}`}
                      onClick={() => toggleDano(item)}
                    >
                      <input
                        type="checkbox"
                        checked={danos.includes(item)}
                        onChange={() => toggleDano(item)}
                        onClick={e => e.stopPropagation()}
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* PASO 4 */}
          {paso === 4 && (
            <div>
              <p className="formulario-titulo">Servicios de mano de obra</p>
              <p className="formulario-subtitulo">Selecciona los servicios a realizar</p>
              {serviciosData[tipo]?.map((zona) => (
                <div key={zona.zona}>
                  <p className="seccion-label">{zona.zona}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {zona.items.map((s) => (
                      <div
                        key={s.nombre}
                        className={`servicio-item ${servicios.find(x => x.nombre === s.nombre) ? 'sel' : ''}`}
                        onClick={() => toggleServicio(s)}
                      >
                        <span>{s.nombre}</span>
                        <span className="servicio-precio">${s.precio.toLocaleString('es-CO')} COP</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PASO 5 */}
          {paso === 5 && (
            <div>
              <p className="formulario-titulo">Piezas a reemplazar</p>
              <p className="formulario-subtitulo">Marca las piezas e ingresa su precio en COP</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {piezasData.map((p) => (
                  <div key={p.nombre} className={`pieza-item ${piezas[p.nombre] !== undefined ? 'sel' : ''}`}>
                    <input
                      type="checkbox"
                      checked={piezas[p.nombre] !== undefined}
                      onChange={() => togglePieza(p.nombre)}
                    />
                    <span style={{ flex: 1 }}>{p.nombre}</span>
                    <input
                      type="number"
                      className="pieza-precio"
                      placeholder="Precio COP"
                      disabled={piezas[p.nombre] === undefined}
                      value={piezas[p.nombre] || ''}
                      onChange={(e) => setPrecioPieza(p.nombre, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {paso === 6 && (
  <div>
    <p className="formulario-titulo">Resumen del diagnóstico</p>
    <p className="formulario-subtitulo">Revisa todo antes de finalizar</p>

    <p className="seccion-label">Orden</p>
    <p className="resumen-valor">{orden}</p>

    <p className="seccion-label">Producto</p>
    <p className="resumen-valor">
      {tipo.charAt(0).toUpperCase() + tipo.slice(1)} — {subtipo}
    </p>

    <p className="seccion-label">Daños encontrados</p>
    {danos.map(d => (
      <p key={d} className="resumen-item">{d}</p>
    ))}

    <p className="seccion-label">Servicios</p>
    {servicios.map(s => (
      <div key={s.nombre} className="resumen-fila">
        <span>{s.nombre}</span>
        <span>${s.precio.toLocaleString('es-CO')} COP</span>
      </div>
    ))}

    <div className="resumen-total">
      <span>Total estimado</span>
      <span>${totalEstimado.toLocaleString('es-CO')} COP</span>
    </div>
  </div>
)}

          {/* NAVEGACIÓN */}
          <div className="formulario-nav">
            {paso > 1
              ? <button className="btn-atras" onClick={() => navegar(-1)}>Atrás</button>
              : <span />
            }
            <button
  className={`btn-siguiente ${!pasoValido() ? 'desactivado' : ''}`}
  onClick={() => {
    if (!pasoValido()) return;
    if (paso === 6) finalizar();
    else navegar(1);
  }}
>
  {paso === 6 ? 'Guardar solicitud' : 'Siguiente'}
</button>
          </div>

        </div>
        
      </div>
      
    </div>
  );
}

export default Solicitud;