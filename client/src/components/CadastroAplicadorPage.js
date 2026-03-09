import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CadastroAplicadorPage.css';
import Footer from './Footer';

const CadastroAplicadorPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const formatPhone = (value) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, telefone: formatted });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSuccess(false);

    if (formData.senha !== formData.confirmarSenha) {
      setMessage('As senhas não coincidem.');
      return;
    }

    if (formData.senha.length < 4) {
      setMessage('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/cadastro-aplicador', {
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        telefone: formData.telefone
      });

      if (response.data.success) {
        setSuccess(true);
        setMessage('Aplicador cadastrado com sucesso! Agora você pode fazer login.');
        setFormData({
          nome: '',
          email: '',
          senha: '',
          confirmarSenha: '',
          telefone: ''
        });
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Erro ao cadastrar aplicador. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cadastro-aplicador-container">
      <div className="cadastro-aplicador-header">
        <button onClick={() => navigate('/login')} className="back-btn">← Voltar ao Login</button>
        <div className="logo-wrapper-small">
          <div className="logo-circle-small">
            <img src="/logo.png" alt="IGL Coatings Logo" />
          </div>
        </div>
        <h1>Cadastro de Aplicador</h1>
        <p>Preencha os dados para criar uma nova conta de aplicador</p>
      </div>

      <div className="cadastro-aplicador-content">
        <form onSubmit={handleSubmit} className="aplicador-form">
          
          <div className="form-group">
            <label>Nome Completo *</label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Digite o email"
              required
            />
          </div>

          <div className="form-group">
            <label>Telefone (com DDD)</label>
            <input
              type="tel"
              name="telefone"
              value={formData.telefone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="form-group">
            <label>Senha *</label>
            <div className="senha-wrapper">
              <input
                type={showSenha ? 'text' : 'password'}
                name="senha"
                value={formData.senha}
                onChange={handleChange}
                placeholder="Crie uma senha"
                required
                minLength={4}
              />
              <button
                type="button"
                className="toggle-senha-btn"
                onClick={() => setShowSenha(!showSenha)}
              >
                {showSenha ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar Senha *</label>
            <input
              type={showSenha ? 'text' : 'password'}
              name="confirmarSenha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              placeholder="Confirme a senha"
              required
              minLength={4}
            />
          </div>

          {message && (
            <div className={`form-message ${success ? 'form-message-success' : 'form-message-error'}`}>
              {message}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar Aplicador'}
          </button>

          {success && (
            <button type="button" className="go-login-btn" onClick={() => navigate('/login')}>
              Ir para o Login
            </button>
          )}
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default CadastroAplicadorPage;
