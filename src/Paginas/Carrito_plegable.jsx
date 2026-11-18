import { useEffect, useState } from "react";
import { FaShoppingCart } from "react-icons/fa";
import { Link } from "react-router-dom";
import "../CSS/Global.css";

const leerCarrito = () => {
  const productos = JSON.parse(localStorage.getItem("carrito") || "[]");
  return Array.isArray(productos) ? productos : [];
};

function CarritoPlegable() {
  const [abierto, setAbierto] = useState(false);
  const [carrito, setCarrito] = useState([]);

  useEffect(() => {
    const cargarCarrito = () => {
      setCarrito(leerCarrito());
    };

    cargarCarrito();
    window.addEventListener("carritoActualizado", cargarCarrito);
    window.addEventListener("storage", cargarCarrito);

    return () => {
      window.removeEventListener("carritoActualizado", cargarCarrito);
      window.removeEventListener("storage", cargarCarrito);
    };
  }, []);

  const total = carrito.reduce(
    (acc, item) =>
      acc + item.precio * item.cantidad,
    0
  );

  return (
    <div className="carrito-container">
      <button
        className="btn-carrito"
        onClick={() => {
          setCarrito(leerCarrito());
          setAbierto((actual) => !actual);
        }}
        aria-label="Abrir carrito"
        aria-expanded={abierto}
      >
        <FaShoppingCart />
        <span className="badge">
          {carrito.reduce(
            (acc, item) => acc + item.cantidad,
            0
          )}
        </span>
      </button>

      {abierto && (
        <div className="dropdown-carrito">
          <h3>Mi Carrito</h3>

          {carrito.length === 0 ? (
            <p>Tu carrito está vacío</p>
          ) : (
            <>
              {carrito.map((item, index) => (
                <div
                  key={item.idProducto ?? item.idproducto ?? item.id ?? `${item.nombre}-${index}`}
                  className="item-carrito"
                >
                  <div>
                    <strong>
                      {item.nombre}
                    </strong>

                    <p>
                      Cantidad:
                      {" "}
                      {item.cantidad}
                    </p>
                  </div>

                  <span>
                    $
                    {(
                      item.precio *
                      item.cantidad
                    ).toLocaleString()}
                  </span>
                </div>
              ))}

              <div className="total-carrito">
                Total: $
                {total.toLocaleString()}
              </div>

              <Link to="/Carrito_compra"
                className="btn-ver-carrito"
                onClick={() =>
                  setAbierto(false)
                }
              >
                Ver carrito
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default CarritoPlegable;