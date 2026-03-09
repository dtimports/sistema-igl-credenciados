import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css';
import Footer from './Footer';

const LoginPage = () => {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({
    email: '',
    senha: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/login', loginData);
      
      if (response.data.success) {
        // Save token and user info to localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.aplicador));
        
        setMessage('✅ Login realizado com sucesso!');
        
        // Redirect to cadastro page after short delay
        setTimeout(() => {
          navigate('/cadastro');
        }, 1000);
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage('❌ ' + error.response.data.message);
      } else {
        setMessage('❌ Erro ao realizar login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <button onClick={() => navigate('/')} className="back-btn">← Voltar</button>
        <div className="logo-wrapper-small">
          <div className="logo-circle-small">
            <img src="/logo.png" alt="IGL Coatings Logo" />
          </div>
        </div>
        <h1>Área do Aplicador</h1>
        <p>Faça login para acessar o sistema de cadastro</p>
      </div>

      <div className="login-content">
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={loginData.email}
              onChange={handleChange}
              placeholder="Digite seu email"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Senha *</label>
            <input
              type="password"
              name="senha"
              value={loginData.senha}
              onChange={handleChange}
              placeholder="Digite sua senha"
              required
            />
          </div>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        </form>

        <div className="login-footer">
          <p>Ainda não tem uma conta?</p>
          <button 
            type="button" 
            className="register-link-btn" 
            onClick={() => navigate('/cadastro-aplicador')}
          >
            Cadastrar novo aplicador
          </button>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default LoginPage;
