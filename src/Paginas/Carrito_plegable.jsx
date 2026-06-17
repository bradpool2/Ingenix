import { useEffect, useState } from "react";
import { FaShoppingCart } from "react-icons/fa";
import { Link } from "react-router-dom";
import "../CSS/Global.css";

function CarritoPlegable() {
  const [abierto, setAbierto] = useState(false);
  const [carrito, setCarrito] = useState([]);

  useEffect(() => {
    const cargarCarrito = () => {
      const productos =
        JSON.parse(localStorage.getItem("carrito")) ||
        [];

      setCarrito(productos);
    };

    cargarCarrito();

    window.addEventListener(
      "carritoActualizado",
      cargarCarrito
    );

    return () => {
      window.removeEventListener(
        "carritoActualizado",
        cargarCarrito
      );
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
        onClick={() => setAbierto(!abierto)}
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
              {carrito.map((item) => (
                <div
                  key={item.idProducto}
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

              <Link
                to="/carrito"
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