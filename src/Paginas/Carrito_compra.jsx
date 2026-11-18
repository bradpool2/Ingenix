import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import '../CSS/Global.css'
import { useNavigate } from 'react-router-dom'; 

function Carrito_compra() {
    const navigate = useNavigate();
  const [carrito, setCarrito] = useState([]);

  useEffect(() => {
    const productos =
      JSON.parse(localStorage.getItem("carrito")) ||
      [];

    setCarrito(productos);
  }, []);

  const total = carrito.reduce(
    (acc, item) =>
      acc + item.precio * item.cantidad,
    0
  );

  function actualizarCarrito(nuevoCarrito) {
    setCarrito(nuevoCarrito);

    localStorage.setItem(
      "carrito",
      JSON.stringify(nuevoCarrito)
    );

    window.dispatchEvent(
      new Event("carritoActualizado")
    );
  }

  function eliminarProducto(idProducto) {
    const nuevoCarrito = carrito.filter(
      (item) =>
        item.idProducto !== idProducto
    );

    actualizarCarrito(nuevoCarrito);
  }

  function aumentarCantidad(idProducto) {
    const nuevoCarrito = carrito.map((item) => {
      if (String(item.idProducto) !== String(idProducto)) return item;
      const stock = item.stock == null || item.stock === "" ? null : Number(item.stock);
      if (stock !== null && Number.isFinite(stock) && Number(item.cantidad) >= stock) {
        return item;
      }
      return { ...item, cantidad: (Number(item.cantidad) || 0) + 1 };
    });

    actualizarCarrito(nuevoCarrito);
  }

  function disminuirCantidad(idProducto) {
    const nuevoCarrito = carrito.map((item) =>
      item.idProducto === idProducto
        ? {
            ...item,
            cantidad: Math.max(
              1,
              item.cantidad - 1
            ),
          }
        : item
    );

    actualizarCarrito(nuevoCarrito);
  }

  return (
    <>
      <NavBar />

      <div className="contenedor-carrito">
        <div className="carrito-card">
          <h2>Carrito de Compras</h2>

          {carrito.length === 0 ? (
            <p>No hay productos en el carrito.</p>
          ) : (
            <>
              {carrito.map((item) => (
                <div key={item.idProducto} className="producto-carrito">
                  <div>
                    <h4>{item.nombre}</h4>

                    <p>
                      Precio: $
                      {item.precio.toLocaleString()}
                    </p>
                  </div>

                  <div className="acciones-carrito">
                    <div className="cantidad-control">
                      <button
                        onClick={() =>
                          disminuirCantidad(
                            item.idProducto
                          )
                        }
                      >
                        -
                      </button>

                      <span>
                        {item.cantidad}
                      </span>

                      <button
                        onClick={() =>
                          aumentarCantidad(
                            item.idProducto
                          )
                        }
                        disabled={
                          item.stock != null
                          && item.stock !== ""
                          && Number.isFinite(Number(item.stock))
                          && Number(item.cantidad) >= Number(item.stock)
                        }
                        aria-label={`Aumentar cantidad de ${item.nombre}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="btn-eliminar"
                      onClick={() =>
                        eliminarProducto(
                          item.idProducto
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <h3 className="total-final">
                Total: $
                {total.toLocaleString()}
              </h3>

              <button onClick={() => navigate('/pago')}>Proceder al pago</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Carrito_compra;