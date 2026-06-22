import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Solicitudes.css';
import { BiAlignJustify, BiAlignRight } from "react-icons/bi";

export default function SolicitudMantenimiento() {
  const navigate = useNavigate();

  const [pestanaActiva, setPestanaActiva] = useState(1);
  const [orden, setOrden] = useState('');
  const [tipo, setTipo] = useState('');
  const [subtipo, setSubtipo] = useState('');
  const [danos, setDanos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [piezas, setPiezas] = useState({});
  const [verResumen, setVerResumen] = useState(false);

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

  const finalizar = async () => {
    const nuevaSolicitud = {
      orden,
      tipo,
      subtipo,
      danos,
      services: servicios,
      total: totalEstimado,
      fecha: new Date().toLocaleDateString('es-CO')
    };
  
    try {
      const res = await fetch('http://localhost:3000/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaSolicitud)
      });
      const data = await res.json();
      console.log(data);

      if (res.ok) {
        alert('Solicitud guardada correctamente');
        navigate('/panel_solicitud');
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formularioCompleto = () => {
    return orden.trim() !== '' && tipo !== '' && subtipo !== '' && danos.length > 0 && servicios.length > 0;
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

  const pestañas = [
    { id: 1, label: '1. Orden' },
    { id: 2, label: '2. Clasificación' },
    { id: 3, label: '3. Daños' },
    { id: 4, label: '4. Servicios' },
    { id: 5, label: '5. Piezas' },
    { id: 6, label: '6. Resumen' }
  ];

  return (
    <div className="solicitud-root-container">
      
      <button className="btn-resumen-flotante" onClick={() => setVerResumen(!verResumen)}>
        <span className="icono">
          {verResumen ? <BiAlignRight color='black'/> : <BiAlignJustify color='black'/> }
        </span>
      </button>

      <div className={`panel-resumen ${verResumen ? 'abierto' : ''}`}>
        <p className="formulario-titulo-resumen">Resumen Rápido</p>
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

      <div className="layout-pestañas-panel">
        
        <div className="pestanas-navegacion">
          {pestañas.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pestana-link ${pestanaActiva === p.id ? 'activa' : ''}`}
              onClick={() => setPestanaActiva(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="formulario-tarjeta-pestanas">
          {pestanaActiva === 1 && (
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

          {pestanaActiva === 2 && (
            <div>
              <p className="formulario-titulo">¿Qué entró al taller?</p>
              <p className="formulario-subtitulo">Selecciona el tipo de producto</p>
              <div className="contenedor-tipo-producto">
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
                  <div className="contenedor-subtipo-items">
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

          {pestanaActiva === 3 && (
            <div>
              <p className="formulario-titulo">Daños encontrados</p>
              <p className="formulario-subtitulo">Marca todo lo que observas</p>
              {!tipo && <p className="resumen-vacio">Por favor selecciona primero el tipo de producto en la pestaña 2.</p>}
              {danosData[tipo]?.map((zona) => (
                <div key={zona.zona} className="bloque-zona-seccion">
                  <p className="seccion-label">{zona.zona}</p>
                  <div className="grid-opciones-compactas">
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
                        <span className="texto-item-check">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pestanaActiva === 4 && (
            <div>
              <p className="formulario-titulo">Servicios de mano de obra</p>
              <p className="formulario-subtitulo">Selecciona los servicios a realizar</p>
              {!tipo && <p className="resumen-vacio">Por favor selecciona primero el tipo de producto en la pestaña 2.</p>}
              {serviciosData[tipo]?.map((zona) => (
                <div key={zona.zona} className="bloque-zona-seccion">
                  <p className="seccion-label">{zona.zona}</p>
                  <div className="grid-opciones-compactas">
                    {zona.items.map((s) => (
                      <div
                        key={s.nombre}
                        className={`servicio-item ${servicios.find(x => x.nombre === s.nombre) ? 'sel' : ''}`}
                        onClick={() => toggleServicio(s)}
                      >
                        <span>{s.nombre}</span>
                        <span className="servicio-precio-tag">${s.precio.toLocaleString('es-CO')} COP</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {pestanaActiva === 5 && (
            <div>
              <p className="formulario-titulo">Piezas a reemplazar</p>
              <p className="formulario-subtitulo">Marca las piezas e ingresa su precio en COP</p>
              <div className="grid-opciones-compactas">
                {piezasData.map((p) => (
                  <div key={p.nombre} className={`pieza-item ${piezas[p.nombre] !== undefined ? 'sel' : ''}`}>
                    <input
                      type="checkbox"
                      checked={piezas[p.nombre] !== undefined}
                      onChange={() => togglePieza(p.nombre)}
                    />
                    <span className="texto-pieza-nombre">{p.nombre}</span>
                    <input
                      type="number"
                      className="pieza-precio-input"
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

          {pestanaActiva === 6 && (
            <div>
              <p className="formulario-titulo">Resumen del diagnóstico</p>
              <p className="formulario-subtitulo">Revisa todo antes de finalizar</p>
              <div className="grid-resumen-dos-columnas">
                <div className='resumen-columna'>
                  <p className="seccion-label">Orden</p>
                  <p className="resumen-valor">{orden || '—'}</p>
                  <p className="seccion-label">Producto</p>
                  <p className="resumen-valor">
                    {tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : '—'} {subtipo ? `— ${subtipo}` : ''}
                  </p>
                </div>
                <div>
                  <p className="seccion-label">Daños encontrados</p>
                  {danos.length === 0 ? <p className="resumen-vacio">Ninguno</p> : danos.map(d => <p key={d} className="resumen-item">{d}</p>)}
                </div>
              </div>
              
              <p className="seccion-label">Servicios</p>
              {servicios.length === 0 ? <p className="resumen-vacio">Ninguno</p> : servicios.map(s => (
                <div key={s.nombre} className="resumen-fila">
                  <span>{s.nombre}</span>
                  <span>${s.precio.toLocaleString('es-CO')} COP</span>
                </div>
              ))}
              
              <div className="resumen-total-final">
                <span>Total estimado</span>
                <span>${totalEstimado.toLocaleString('es-CO')} COP</span>
              </div>
            </div>
          )}

          <div className="contenedor-nav-final">
            <button
              className={`btn-siguiente ${!formularioCompleto() ? 'desactivado' : ''}`}
              disabled={!formularioCompleto()}
              onClick={finalizar}
            >
              Guardar solicitud
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}