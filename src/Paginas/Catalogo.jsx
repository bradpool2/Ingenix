import React, { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import "../CSS/Global.css";
import { authFetch } from '../components/api.js';

function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch("http://localhost:3000/productos/con-categorias").then((res) => res.json()),
      authFetch("http://localhost:3000/categorias").then((res) => res.json())
    ])
      .then(([dataProductos, dataCategorias]) => {
        setProductos(dataProductos);
        setCategorias(dataCategorias);
        setCargando(false);
      })
      .catch((err) => {
        console.error("Error al cargar catálogo:", err);
        setCargando(false);
      });
  }, []);

  function formatoMoneda(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor);
  }

  function agregarAlCarrito(producto) {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const existe = carrito.find((item) => item.idProducto === producto.idProducto);

    if (existe) {
      existe.cantidad += 1;
    } else {
      carrito.push({ ...producto, cantidad: 1 });
    }

    localStorage.setItem("carrito", JSON.stringify(carrito));
    window.dispatchEvent(new Event("carritoActualizado"));
  }

  // Cuenta cuántos productos tiene cada categoría
  const contarProductosPorCategoria = (nombreCategoria) => {
    return productos.filter((p) =>
      p.categorias?.split(', ').includes(nombreCategoria)
    ).length;
  };

  // Filtra productos según categoría activa y/o búsqueda
  const productosFiltrados = productos.filter((p) => {
    const coincideCategoria = categoriaActiva
      ? p.categorias?.split(', ').includes(categoriaActiva)
      : true;
    const coincideBusqueda = busqueda.trim()
      ? p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.categorias?.toLowerCase().includes(busqueda.toLowerCase())
      : true;
    return coincideCategoria && coincideBusqueda;
  });

  return (
    <div>
      <NavBar />

      <div style={{ padding: "100px 40px 40px", maxWidth: "1100px", margin: "0 auto" }}>

        <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
          Catálogo de Productos
        </h2>

        {/* Buscador pequeño */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
          <input
            type="text"
            placeholder="Buscar producto o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input-catalogo-buscador"
          />
        </div>

        {cargando && <p style={{ textAlign: "center" }}>Cargando catálogo...</p>}

        {!cargando && (
          <>
            {/* CATEGORÍAS */}
            {!busqueda.trim() && (
              <div className="grid-categorias-catalogo">
                <div
                  className={`tarjeta-categoria ${categoriaActiva === null ? 'activa' : ''}`}
                  onClick={() => setCategoriaActiva(null)}
                >
                  <span className="categoria-nombre">Todos</span>
                  <span className="categoria-cantidad">{productos.length} productos</span>
                </div>

                {categorias.map((c) => (
                  <div
                    key={c.idCategoria}
                    className={`tarjeta-categoria ${categoriaActiva === c.nombre ? 'activa' : ''}`}
                    onClick={() => setCategoriaActiva(c.nombre)}
                  >
                    <span className="categoria-nombre">{c.nombre}</span>
                    <span className="categoria-cantidad">{contarProductosPorCategoria(c.nombre)} productos</span>
                  </div>
                ))}
              </div>
            )}

            {/* Indicador de filtro activo */}
            {(categoriaActiva || busqueda.trim()) && (
              <div className="filtro-activo-info">
                <span>
                  {busqueda.trim()
                    ? `Resultados para "${busqueda}"`
                    : `Mostrando categoría: ${categoriaActiva}`}
                </span>
                <button
                  className="btn-quitar-filtro"
                  onClick={() => { setCategoriaActiva(null); setBusqueda(''); }}
                >
                  Ver todas las categorías
                </button>
              </div>
            )}

            {/* PRODUCTOS */}
            {productosFiltrados.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", marginTop: "20px" }}>
                No se encontraron productos.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "30px", justifyContent: "center", marginTop: "20px" }}>
                {productosFiltrados.map((p) => (
                  <div key={p.idProducto} className="card" style={{ width: "260px", padding: "20px" }}>
                    <h5>{p.nombre}</h5>
                    <p className="card-text">{p.descripcion || "Sin descripción"}</p>
                    {p.categorias && (
                      <p style={{ fontSize: "12px", color: "#999", textAlign: "center" }}>
                        {p.categorias}
                      </p>
                    )}
                    <p style={{ fontWeight: "bold", textAlign: "center" }}>
                      {formatoMoneda(p.precio)}
                    </p>
                    <p style={{ textAlign: "center", color: "#777" }}>
                      Stock: {p.stock ?? 0}
                    </p>
                    <button onClick={() => agregarAlCarrito(p)}>
                      Agregar al carrito
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Catalogo;