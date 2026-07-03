import { useState } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";
import "../CSS/Global.css";

export default function RecuperarPassword() {

    const [correo, setCorreo] = useState("");
    const [mensaje, setMensaje] = useState("");

    const recuperar = async (e) => {
        e.preventDefault();

        try {

            const res = await fetch("http://localhost:3000/recuperar-password",{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    correo
                })
            });

            const data = await res.json();

            setMensaje(data.message);

        } catch{

            setMensaje("Error al intentar recuperar la contraseña.");

        }

    }

    return(

        <div className="contenedor-padre">

            <div className="tarjeta-login">

                <h2>Recuperar contraseña</h2>

                <p
                style={{
                    textAlign:"center",
                    color:"var(--color-texto-secundario)",
                    marginBottom:"25px"
                }}>
                    Escribe tu correo electrónico para recuperar el acceso.
                </p>

                <form
                className="formulario"
                onSubmit={recuperar}>

                    <label>Correo electrónico</label>

                    <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={correo}
                    onChange={(e)=>setCorreo(e.target.value)}
                    required
                    />

                    <button>

                        <FaEnvelope style={{marginRight:8}}/>

                        Recuperar contraseña

                    </button>

                </form>

                {mensaje && (

                    <p
                    style={{
                        marginTop:20,
                        textAlign:"center",
                        color:"var(--color-principal)"
                    }}>

                        {mensaje}

                    </p>

                )}

                <div
                style={{
                    marginTop:25,
                    textAlign:"center"
                }}>

                    <Link to="/login">

                        <FaArrowLeft/>

                        {" "}Volver al login

                    </Link>

                </div>

            </div>

        </div>

    );

}