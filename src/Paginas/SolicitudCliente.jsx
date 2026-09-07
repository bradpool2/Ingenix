import React, { useEffect, useState, useRef } from "react";
import "../CSS/Global.css";
import NavBar from "../components/NavBar";
 
function getToken() {
  return localStorage.getItem("token");
}
 

function IconoMantenimiento() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l2.1-2.1a5 5 0 0 1-6.4 6.4L8 19a2 2 0 1 1-3-3l5.6-5.4a5 5 0 0 1 6.4-6.4l-2.1 2.1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
 
function IconoVenta() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20.6 12.3 12.7 4.4a1.5 1.5 0 0 0-1.06-.44H5.5A1.5 1.5 0 0 0 4 5.5v6.14a1.5 1.5 0 0 0 .44 1.06l7.9 7.9a1.5 1.5 0 0 0 2.12 0l6.14-6.14a1.5 1.5 0 0 0 0-2.12Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.25" />
    </svg>
  );
}
 
function IconoImagen() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 15.5 16.5 11 7 19" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
 
// -----------------------------------------------------------------------
// Subida de imagen opcional (dropzone + preview)
// -----------------------------------------------------------------------
function CampoImagen({ archivo, onChange }) {
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
 
  function manejarArchivo(file) {
    if (!file) return;
    const tiposValidos = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!tiposValidos.includes(file.type)) {
      alert("Solo se permiten imágenes JPG, PNG o WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no debe superar 5 MB.");
      return;
    }
    onChange(file);
  }
 
  return (
    
    <div className="grupo-campo">

      <label>Foto del artículo (opcional)</label>
      
      <p className="texto-ayuda-campo">
        Una foto ayuda a entender mejor tu solicitud, pero no es obligatoria.
      </p>
 
      {!archivo ? (
        <div
          className={`dropzone-imagen ${arrastrando ? "arrastrando" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            manejarArchivo(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="dropzone-imagen-icono">
            <IconoImagen />
          </div>
          <p>
            Arrastra una imagen aquí o <span className="enlace-explorar">explora tus archivos</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => manejarArchivo(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="previsualizacion-imagen">
          <img src={URL.createObjectURL(archivo)} alt="Vista previa del artículo" />
          <button
            type="button"
            className="btn-quitar-imagen"
            onClick={() => onChange(null)}
            aria-label="Quitar imagen"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
 
// -----------------------------------------------------------------------
// Paso 1: selector de tipo de solicitud
// -----------------------------------------------------------------------
function SelectorTipo({ tipo, onSeleccionar }) {
  return (
    <div className="selector-tipo-solicitud">
      <div
        className={`tarjeta-tipo ${tipo === "mantenimiento" ? "seleccionada" : ""}`}
        onClick={() => onSeleccionar("mantenimiento")}
        role="button"
        tabIndex={0}
      >
        <div className="tarjeta-tipo-icono">
          <IconoMantenimiento />
        </div>
        <h3>Mantenimiento</h3>
        <p>Reporta un artículo dañado o que necesita reparación.</p>
      </div>
 
      <div
        className={`tarjeta-tipo ${tipo === "venta" ? "seleccionada" : ""}`}
        onClick={() => onSeleccionar("venta")}
        role="button"
        tabIndex={0}
      >
        <div className="tarjeta-tipo-icono">
          <IconoVenta />
        </div>
        <h3>Venta</h3>
        <p>Ofrece una joya o reloj que quieras vender.</p>
      </div>
    </div>
  );
}
 
// -----------------------------------------------------------------------
// Paso 2a: formulario de Mantenimiento
// -----------------------------------------------------------------------
function FormularioMantenimiento({ datos, setDatos, errores }) {
  const opcionesUrgencia = ["Baja", "Media", "Alta"];
 
  return (
    <>
      <div className="grupo-campo">
        <label htmlFor="nombreArticulo">¿Qué artículo necesita mantenimiento?</label>
        <p className="texto-ayuda-campo">Ejemplo: Reloj Casio dorado, anillo de plata con piedra.</p>
        <input
          id="nombreArticulo"
          type="text"
          className={`input-detalle ${errores.nombreArticulo ? "input-error" : ""}`}
          placeholder="Nombre del artículo"
          value={datos.nombreArticulo}
          onChange={(e) => setDatos({ ...datos, nombreArticulo: e.target.value })}
        />
        {errores.nombreArticulo && (
          <span className="error-detalle-solicitud">{errores.nombreArticulo}</span>
        )}
      </div>
 
      <div className="grupo-campo">
        <label htmlFor="descripcion">Cuéntanos qué le pasa</label>
        <p className="texto-ayuda-campo">
          Describe el daño o lo que necesitas que revisemos. Mientras más detalle, mejor.
        </p>
        <textarea
          id="descripcion"
          className={`input-detalle ${errores.descripcion ? "input-error" : ""}`}
          placeholder="Ej: Se le cayó la correa y la pila ya no funciona."
          value={datos.descripcion}
          onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
        />
        {errores.descripcion && (
          <span className="error-detalle-solicitud">{errores.descripcion}</span>
        )}
      </div>
 
      <div className="grupo-campo">
        <label>¿Qué tan urgente es?</label>
        <div className="chips-grupo">
          {opcionesUrgencia.map((opcion) => (
            <button
              type="button"
              key={opcion}
              className={`chip-opcion ${opcion === "Alta" ? "chip-alta" : ""} ${
                datos.urgencia === opcion ? "activo" : ""
              }`}
              onClick={() => setDatos({ ...datos, urgencia: opcion })}
            >
              {opcion}
            </button>
          ))}
        </div>
      </div>
 
      <CampoImagen
        archivo={datos.imagen}
        onChange={(archivo) => setDatos({ ...datos, imagen: archivo })}
      />
    </>
  );
}
 
// -----------------------------------------------------------------------
// Paso 2b: formulario de Venta
// -----------------------------------------------------------------------
function FormularioVenta({ datos, setDatos, errores }) {
  const opcionesEstado = ["Excelente", "Bueno", "Regular", "Malo"];
 
  return (
    <>
      <div className="grupo-campo">
        <label htmlFor="nombreArticulo">¿Qué producto quieres vender?</label>
        <p className="texto-ayuda-campo">Ejemplo: Cadena de oro 18k, reloj Citizen automático.</p>
        <input
          id="nombreArticulo"
          type="text"
          className={`input-detalle ${errores.nombreArticulo ? "input-error" : ""}`}
          placeholder="Nombre del producto"
          value={datos.nombreArticulo}
          onChange={(e) => setDatos({ ...datos, nombreArticulo: e.target.value })}
        />
        {errores.nombreArticulo && (
          <span className="error-detalle-solicitud">{errores.nombreArticulo}</span>
        )}
      </div>
 
      <div className="grupo-campo">
        <label htmlFor="descripcion">Describe el producto</label>
        <p className="texto-ayuda-campo">
          Material, peso aproximado, marca, año, o cualquier detalle relevante.
        </p>
        <textarea
          id="descripcion"
          className={`input-detalle ${errores.descripcion ? "input-error" : ""}`}
          placeholder="Ej: Reloj Citizen automático, correa de acero, funciona bien."
          value={datos.descripcion}
          onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
        />
        {errores.descripcion && (
          <span className="error-detalle-solicitud">{errores.descripcion}</span>
        )}
      </div>
 
      <div className="grupo-campo">
        <label>¿Cómo está el artículo?</label>
        <div className="chips-grupo">
          {opcionesEstado.map((opcion) => (
            <button
              type="button"
              key={opcion}
              className={`chip-opcion ${datos.estadoArticulo === opcion ? "activo" : ""}`}
              onClick={() => setDatos({ ...datos, estadoArticulo: opcion })}
            >
              {opcion}
            </button>
          ))}
        </div>
      </div>
 
      <div className="grupo-campo">
        <label htmlFor="precioEstimado">Precio que esperas recibir (opcional)</label>
        <p className="texto-ayuda-campo">
          Es solo una referencia, nuestro equipo te confirmará el valor final.
        </p>
        <input
          id="precioEstimado"
          type="number"
          min="0"
          step="0.01"
          className="input-detalle"
          placeholder="Ej: 150000"
          value={datos.precioEstimado}
          onChange={(e) => setDatos({ ...datos, precioEstimado: e.target.value })}
        />
      </div>
 
      <CampoImagen
        archivo={datos.imagen}
        onChange={(archivo) => setDatos({ ...datos, imagen: archivo })}
      />
    </>
  );
}
 
// -----------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------
const DATOS_INICIALES = {
  nombreArticulo: "",
  descripcion: "",
  urgencia: "Media",
  estadoArticulo: "",
  precioEstimado: "",
  imagen: null,
};
 
export default function SolicitudCliente() {
  const [tipo, setTipo] = useState(null); 
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [exito, setExito] = useState(null); 
  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/solicitudes/mis-solicitudes", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.ok ? res.json() : [])
      .then((solicitudes) => setMisSolicitudes(Array.isArray(solicitudes) ? solicitudes : []))
      .catch((error) => console.error("No se pudieron cargar tus solicitudes:", error))
      .finally(() => setCargandoSolicitudes(false));
  }, [exito]);
 
  function seleccionarTipo(nuevoTipo) {
    setTipo(nuevoTipo);
    setDatos(DATOS_INICIALES);
    setErrores({});
    setErrorGeneral("");
  }
 
  function volverASeleccion() {
    setTipo(null);
    setErrorGeneral("");
  }
 
  function validar() {
    const nuevosErrores = {};
    if (!datos.nombreArticulo.trim()) {
      nuevosErrores.nombreArticulo =
        tipo === "mantenimiento"
          ? "Indica qué artículo necesita mantenimiento."
          : "Indica qué producto quieres vender.";
    }
    if (!datos.descripcion.trim()) {
      nuevosErrores.descripcion = "Este campo es obligatorio.";
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }
 
  async function manejarEnvio(e) {
    e.preventDefault();
    setErrorGeneral("");
 
    if (!validar()) return;
 
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("tipo", tipo);
      formData.append("nombreArticulo", datos.nombreArticulo.trim());
      formData.append("descripcion", datos.descripcion.trim());
 
      if (tipo === "mantenimiento") {
        formData.append("urgencia", datos.urgencia);
      } else {
        if (datos.estadoArticulo) formData.append("estadoArticulo", datos.estadoArticulo);
        if (datos.precioEstimado) formData.append("precioEstimado", datos.precioEstimado);
      }
 
      if (datos.imagen) formData.append("imagen", datos.imagen);
 
      const res = await fetch("http://localhost:3000/api/venta",  {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
 
      const resultado = await res.json();
 
      if (!res.ok) {
        if (resultado.errores) {
          setErrorGeneral(resultado.errores.join(" "));
        } else {
          setErrorGeneral(resultado.error || "No se pudo enviar la solicitud.");
        }
        return;
      }
 
      setExito({ numeroOrden: resultado.numeroOrden });
      setTipo(null);
      setDatos(DATOS_INICIALES);
    } catch (error) {
      console.error(error);
      setErrorGeneral("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }
 
  return (
    <div className="seccion-solicitud">
                <NavBar />

      <div className="solicitud-intro">
        <h1>Nueva solicitud</h1>
        <p>Cuéntanos qué necesitas y te contactaremos lo antes posible.</p>
      </div>
 
      <div className="needs-validation">
        {exito && (
          <div className="alerta-exito-solicitud">
            <strong>¡Solicitud enviada!</strong>
            Tu número de orden es {exito.numeroOrden}. Te avisaremos cuando haya novedades.
          </div>
        )}
 
        {!tipo && <SelectorTipo tipo={tipo} onSeleccionar={seleccionarTipo} />}
 
        {tipo && (
          <form className="formulario-solicitud formulario" onSubmit={manejarEnvio}>
            {errorGeneral && <div className="alerta-error-general">{errorGeneral}</div>}
 
            {tipo === "mantenimiento" ? (
              <FormularioMantenimiento datos={datos} setDatos={setDatos} errores={errores} />
            ) : (
              <FormularioVenta datos={datos} setDatos={setDatos} errores={errores} />
            )}
 
            <div className="acciones-formulario-solicitud">
              <button type="button" className="btn-volver-tipo" onClick={volverASeleccion}>
                Volver
              </button>
              <button type="submit" className="btn-enviar-solicitud" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </form>
        )}
      </div>
      <section className="seccion-actividad-reciente" style={{ maxWidth: 980, margin: '32px auto' }}>
        <h2>Mis solicitudes</h2>
        {cargandoSolicitudes ? <p>Cargando...</p> : misSolicitudes.length === 0 ? (
          <p>Aún no tienes solicitudes registradas.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla-dashboard">
              <thead><tr><th>Orden</th><th>Artículo / detalle</th><th>Estado</th><th>Fecha</th><th>Total</th></tr></thead>
              <tbody>{misSolicitudes.map((solicitud) => (
                <tr key={solicitud.idSolicitud}>
                  <td>#{solicitud.numeroOrden || solicitud.idSolicitud}</td>
                  <td>{solicitud.servicios || '—'}</td>
                  <td>{solicitud.estado}</td>
                  <td>{solicitud.fechaRegistro ? new Date(solicitud.fechaRegistro).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '—'}</td>
                  <td>${Number(solicitud.totalEstimado || 0).toLocaleString('es-CO')} COP</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}