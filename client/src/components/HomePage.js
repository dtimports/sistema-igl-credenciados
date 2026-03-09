import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import Footer from './Footer';

const HomePage = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <div className="logo-section">
          <div className="logo-wrapper">
            <div className="logo-circle">
              <img src="/logo.png" alt="IGL Coatings Logo" />
            </div>
          </div>
          <h1 className="logo-text">IGL Coatings</h1>
          <p className="subtitle">Sistema de Certificados de Garantia</p>
        </div>
        
        <div className="buttons-section">
          <Link to="/login" className="btn btn-primary">
            <div className="btn-content">
              <span className="btn-text">Sou Aplicador</span>
            </div>
          </Link>
          
          <Link to="/buscar-certificado" className="btn btn-secondary">
            <div className="btn-content">
              <span className="btn-text">Ver Certificado</span>
            </div>
          </Link>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default HomePage;
