import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import CadastroPage from './components/CadastroPage';
import BuscaCertificadoPage from './components/BuscaCertificadoPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="/buscar-certificado" element={<BuscaCertificadoPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
