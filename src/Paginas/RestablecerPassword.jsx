import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function RestablecerPassword() {

    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [mensaje, setMensaje] = useState("");

    const cambiarPassword = async (e) => {

        e.preventDefault();

        if(password !== confirmar){
            setMensaje("Las contraseñas no coinciden.");
            return;
        }

        try{

            const res = await fetch("http://localhost:3000/restablecer-password",{

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({
                    token,
                    password
                })

            });

            const data = await res.json();

            setMensaje(data.message);

            if(res.ok){

                setTimeout(()=>{
                    navigate("/");
                },2500);

            }

        }catch{

            setMensaje("Error al actualizar la contraseña.");

        }

    }

    return(

        <div className="contenedor-padre">

            <div className="tarjeta-login">

                <h2>Nueva contraseña</h2>

                <form
                className="formulario"
                onSubmit={cambiarPassword}>

                    <label>Nueva contraseña</label>

                    <input
                    type="password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    required
                    />

                    <label>Confirmar contraseña</label>

                    <input
                    type="password"
                    value={confirmar}
                    onChange={(e)=>setConfirmar(e.target.value)}
                    required
                    />

                    <button>
                        Cambiar contraseña
                    </button>

                </form>

                {mensaje &&

                    <p
                    style={{
                        textAlign:"center",
                        marginTop:20,
                        color:"Black"
                    }}>
                        {mensaje}
                    </p>

                }

            </div>

        </div>

    );

}