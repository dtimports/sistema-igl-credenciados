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
    telefone: '',
    cnpj: '',
    instagram: ''
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

  const formatCNPJ = (value) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, telefone: formatted });
  };

  const handleCNPJChange = (e) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData({ ...formData, cnpj: formatted });
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
        telefone: formData.telefone,
        cnpj: formData.cnpj,
        instagram: formData.instagram
      });

      if (response.data.success) {
        setSuccess(true);
        setMessage('Cadastro enviado com sucesso! Seu acesso será liberado em até 24 horas após a aprovação.');
        setFormData({
          nome: '',
          email: '',
          senha: '',
          confirmarSenha: '',
          telefone: '',
          cnpj: '',
          instagram: ''
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
            <label>CNPJ *</label>
            <input
              type="text"
              name="cnpj"
              value={formData.cnpj}
              onChange={handleCNPJChange}
              placeholder="00.000.000/0000-00"
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
            <label>Instagram</label>
            <div className="instagram-wrapper">
              <span className="instagram-prefix">@</span>
              <input
                type="text"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                placeholder="seu.perfil"
              />
            </div>
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

          <div className="approval-notice">
            <span className="notice-icon">⏳</span>
            <p>Após o cadastro, seu acesso será analisado e aprovado em até <strong>24 horas</strong>.</p>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Enviar Cadastro'}
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
