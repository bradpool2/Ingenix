  import '../CSS/Global.css'
  import React from 'react';
  import { useNavigate } from 'react-router-dom';
  import NavBar from '../components/NavBar';
  import { IoIosClock } from "react-icons/io";
  import { GiDiamondRing } from "react-icons/gi";
  import { RiJewelryLine } from "react-icons/ri";







  function Home_invited({cambiarVista}) {
    const navigate = useNavigate();
    const cerrarSesion = () => {
    localStorage.removeItem('user'); 
    navigate('/');
  };

    return (
      <div className="App">
        
        <NavBar cerrarSesion={cerrarSesion}/>
        <section className="contenido-tarjetas">
        
        <div className="card" >
        <h2>Relojes clasicos</h2>
          <IoIosClock size={100}/>

          <div className="card-body">
          <h5 className="card-title">Relojes</h5>
          <p className="card-text">
          Consulta relojes clásicos <br />
          [PP, Rolex, Cartier, Vancheron]
          </p>    
          <button type="button" className="btn btn-outline-dark" onClick={() => cambiarVista('Relojes')}>Consultar</button>
          </div>
        </div>
        <div className="card" >
        <h2>Joyeria de oro</h2>

        <GiDiamondRing size={100} color='#FFD700'/>

          

          <div className="card-body">
            <h5 className="card-title">Joyeria</h5>

            <p className="card-text">
              Apartado de joyeria de oro <br />
              100% de oro
            </p>

          <button type="button" className="btn btn-outline-dark">Consultar</button>
          </div>
        </div>
        <div className="card" >
        <h2>Exhibicion</h2>

        <RiJewelryLine size={100}/>


          <div className="card-body">
            <h5 className="card-title">Exhibidor</h5>

            <p className="card-text">
              Exhibidor de vitrinas, <br />
              actualizado al momento
            </p>

          <button type="button" className="btn btn-outline-dark">Consultar</button>
          </div>
        </div>
      </section>
        </div>

    ) 



  }
  export default Home_invited;