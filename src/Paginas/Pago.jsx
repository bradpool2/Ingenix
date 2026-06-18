import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import "../CSS/Global.css";
import nequiLogo from "../assets/nequi.svg";
import daviplataLogo from "../assets/daviplata.png";
import pseLogo from "../assets/pse.png";
import creditoLogo from "../assets/TC.png";
import debitoLogo from "../assets/debito.png";
import efectivoLogo from "../assets/dinero.png";

// Métodos con su campo extra requerido
const METODOS = [
  {
    id: "Nequi",
    logo: nequiLogo,
    campo: "telefono",
    placeholder: "Número de teléfono Nequi (ej: 3001234567)",
  },
  {
    id: "Daviplata",
    logo: daviplataLogo,
    campo: "telefono",
    placeholder: "Número de teléfono Daviplata",
  },
  {
    id: "PSE",
    logo: pseLogo,
    campo: "cuenta",
    placeholder: "Número de cuenta bancaria",
  },
  {
    id: "Tarjeta crédito",
    logo: creditoLogo,
    campo: "tarjeta",
    placeholder: "Número de tarjeta (ej: **** **** **** 1234)",
  },
  {
    id: "Tarjeta débito",
    logo: debitoLogo,
    campo: "tarjeta",
    placeholder: "Número de tarjeta (ej: **** **** **** 1234)",
  },
  {
    id: "Efectivo",
    logo: efectivoLogo,
    campo: null,
    placeholder: null,
  },
];

function Pago() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const carrito = JSON.parse(localStorage.getItem("carrito")) || [];

  const total = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0,
  );

  const [metodoSeleccionado, setMetodoSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState("");
  const [errorDetalle, setErrorDetalle] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [paso, setPaso] = useState(1);
  const [referenciaPago, setReferenciaPago] = useState("");

  if (!user) {
    navigate("/login");
    return null;
  }

  if (carrito.length === 0) {
    navigate("/carrito");
    return null;
  }

  const metodoInfo = METODOS.find((m) => m.id === metodoSeleccionado);

  // VALIDACIÓN NUEVA
  const validarFormato = () => {
    const numero = detalle.trim();

    if (metodoInfo?.campo === "telefono") {
      if (numero.length !== 10) {
        return "El número de teléfono debe tener 10 dígitos";
      }
    }

    if (metodoInfo?.campo === "tarjeta") {
      if (numero.length < 13 || numero.length > 19) {
        return "El número de tarjeta debe tener entre 13 y 19 dígitos";
      }
    }

    if (metodoInfo?.campo === "cuenta") {
      if (numero.length < 10 || numero.length > 16) {
        return "El número de cuenta debe tener entre 10 y 16 dígitos";
      }
    }

    return "";
  };

  const validarYConfirmar = () => {
    if (!metodoSeleccionado) {
      setErrorDetalle("Selecciona un método de pago");

      return;
    }

    if (metodoInfo?.campo && !detalle.trim()) {
      setErrorDetalle("Este campo es obligatorio");

      return;
    }

    const errorFormato = validarFormato();

    if (errorFormato) {
      setErrorDetalle(errorFormato);

      return;
    }

    setErrorDetalle("");

    confirmarPago();
  };

  const confirmarPago = async () => {
    setProcesando(true);

    try {
      const res = await fetch("http://localhost:3000/venta", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          idUsuario: user.idUsuario,

          total,

          metodoPago: metodoSeleccionado,

          detallePago: detalle || null,

          productos: carrito.map((item) => ({
            idProducto: item.idProducto,

            cantidad: item.cantidad,

            precioUnitario: item.precio,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setReferenciaPago(data.referencia);

        const listaProductos = carrito
          .map(
            (item) =>
              `• ${item.nombre} x${item.cantidad} — $${(item.precio * item.cantidad).toLocaleString("es-CO")}`,
          )
          .join("\n");

        alert(
          `✅ ¡Has comprado exitosamente!\n\nProductos:\n${listaProductos}\n\nTotal: $${total.toLocaleString("es-CO")}\nReferencia: ${data.referencia}`,
        );

        localStorage.removeItem("carrito");

        window.dispatchEvent(new Event("carritoActualizado"));

        setPaso(3);
      } else {
        alert(
          "Error al procesar el pago: " + (data.message || "intenta de nuevo"),
        );
      }
    } catch (err) {
      console.error(err);

      alert("No se pudo conectar al servidor");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <NavBar />

      <div
        className="contenedor-padre"
        style={{
          alignItems: "flex-start",
          paddingTop: "100px",
        }}
      >
        <div className="tarjeta-login tarjeta-pago">
          {paso === 1 && (
            <>
              <h2 className="titulo-pago">Resumen del pedido</h2>

              <div className="lista-productos-pago">
                {carrito.map((item) => (
                  <div key={item.idProducto} className="item-pago">
                    <div>
                      <strong>{item.nombre}</strong>

                      <p className="subtexto-pago">x{item.cantidad} unidades</p>
                    </div>

                    <span className="precio-pago">
                      ${(item.precio * item.cantidad).toLocaleString("es-CO")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="fila-total">
                <span>Total</span>

                <span>${total.toLocaleString("es-CO")}</span>
              </div>

              <button className="btn-pago-principal" onClick={() => setPaso(2)}>
                Continuar al pago
              </button>

              <button
                className="btn-pago-secundario"
                onClick={() => navigate("/carrito")}
              >
                Volver al carrito
              </button>
            </>
          )}

          {paso === 2 && (
            <>
              <h2 className="titulo-pago">Método de pago</h2>

              <div className="lista-metodos">
                {METODOS.map((m) => (
                  <div
                    key={m.id}
                    className={`metodo-item ${
                      metodoSeleccionado === m.id ? "metodo-activo" : ""
                    }`}
                    onClick={() => {
                      setMetodoSeleccionado(m.id);

                      setDetalle("");

                      setErrorDetalle("");
                    }}
                  >
                    <div
                      className={`radio-circulo ${
                        metodoSeleccionado === m.id ? "radio-activo" : ""
                      }`}
                    />

                    <div className="metodo-info">
                      <img src={m.logo} alt={m.id} className="logo-metodo" />

                      <span>{m.id}</span>
                    </div>
                  </div>
                ))}
              </div>

              {metodoInfo?.campo && (
                <div className="campo-detalle-pago">
                  <label className="label-detalle">
                    {metodoInfo.campo === "telefono" && "Número de teléfono"}

                    {metodoInfo.campo === "cuenta" && "Número de cuenta"}

                    {metodoInfo.campo === "tarjeta" && "Número de tarjeta"}
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    className={`input-detalle ${
                      errorDetalle ? "input-error" : ""
                    }`}
                    placeholder={metodoInfo.placeholder}
                    value={detalle}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, "");

                      setDetalle(valor);

                      setErrorDetalle("");
                    }}
                    maxLength={
                      metodoInfo.campo === "tarjeta"
                        ? 16
                        : metodoInfo.campo === "telefono"
                          ? 10
                          : 20
                    }
                  />

                  {errorDetalle && (
                    <span className="error-detalle">{errorDetalle}</span>
                  )}
                </div>
              )}

              <div className="resumen-total">
                <strong>Total a pagar:</strong>${total.toLocaleString("es-CO")}
              </div>

              <button
                className="btn-pago-principal"
                onClick={validarYConfirmar}
                disabled={procesando}
              >
                {procesando ? "Procesando..." : "Confirmar pago"}
              </button>

              <button
                className="btn-pago-secundario"
                onClick={() => setPaso(1)}
              >
                Volver
              </button>
            </>
          )}

          {paso === 3 && (
            <div className="confirmacion-pago">
              <div className="icono-exito"></div>

              <h2>¡Pago exitoso!</h2>

              <p>Tu pedido fue registrado correctamente.</p>

              <p>
                Método:
                <strong>{metodoSeleccionado}</strong>
              </p>

              {referenciaPago && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#777",
                  }}
                >
                  Referencia:
                  <strong>{referenciaPago}</strong>
                </p>
              )}

              <button
                className="btn-pago-principal"
                onClick={() => navigate("/home")}
              >
                Volver al inicio
              </button>

              <button
                className="btn-pago-secundario"
                onClick={() => navigate("/catalogo")}
              >
                Seguir comprando
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Pago;
