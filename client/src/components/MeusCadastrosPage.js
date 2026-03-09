import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MeusCadastrosPage.css';
import Footer from './Footer';

const MeusCadastrosPage = () => {
  const navigate = useNavigate();
  const [cadastros, setCadastros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aplicadorNome, setAplicadorNome] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const aplicador = JSON.parse(localStorage.getItem('user') || '{}');
    setAplicadorNome(aplicador.nome || '');

    fetchCadastros(token);
  }, [navigate]);

  const fetchCadastros = async (token) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/meus-cadastros', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setCadastros(response.data.cadastros);
      }
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        localStorage.removeItem('aplicador');
        navigate('/login');
        return;
      }
      setError('Erro ao carregar cadastros. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCadastros = cadastros.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.nomeCliente || '').toLowerCase().includes(term) ||
      (c.placa || '').toLowerCase().includes(term) ||
      (c.modeloCarro || '').toLowerCase().includes(term) ||
      (c.cpf || '').includes(term)
    );
  });

  const formatDateBR = (dateStr) => {
    if (!dateStr) return 'N/A';
    const str = String(dateStr).trim();
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    if (str.includes('/')) return str;
    return str;
  };

  return (
    <div className="meus-cadastros-container">
      <div className="meus-cadastros-header">
        <button onClick={() => navigate('/cadastro')} className="back-btn">← Voltar ao Cadastro</button>
        <div className="logo-wrapper-small">
          <div className="logo-circle-small">
            <img src="/logo.png" alt="IGL Coatings Logo" />
          </div>
        </div>
        <h1>Meus Cadastros</h1>
        <p>Veiculos registrados por {aplicadorNome || 'voce'}</p>
      </div>

      <div className="meus-cadastros-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Carregando cadastros...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => fetchCadastros(localStorage.getItem('token'))} className="retry-btn">
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            <div className="cadastros-summary">
              <div className="summary-card">
                <span className="summary-number">{cadastros.length}</span>
                <span className="summary-label">Total de Cadastros</span>
              </div>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Buscar por nome, placa, modelo ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {filteredCadastros.length === 0 ? (
              <div className="empty-state">
                <p>{searchTerm ? 'Nenhum resultado encontrado para a busca.' : 'Voce ainda nao possui cadastros registrados.'}</p>
              </div>
            ) : (
              <div className="cadastros-grid">
                {filteredCadastros.map((cadastro, index) => (
                  <div key={index} className="cadastro-card">
                    <div className="cadastro-card-header">
                      <div className="card-vehicle">
                        <span className="card-modelo">{cadastro.modeloCarro || 'Modelo N/A'}</span>
                        <span className="card-placa">{cadastro.placa || 'N/A'}</span>
                      </div>
                      <span className="card-date">{formatDateBR(cadastro.dataCadastro || cadastro.dataAplicacao)}</span>
                    </div>
                    <div className="cadastro-card-body">
                      <div className="card-info-row">
                        <span className="card-label">Cliente</span>
                        <span className="card-value">{cadastro.nomeCliente || 'N/A'}</span>
                      </div>
                      <div className="card-info-row">
                        <span className="card-label">CPF</span>
                        <span className="card-value">{cadastro.cpf || 'N/A'}</span>
                      </div>
                      <div className="card-info-row">
                        <span className="card-label">Cor</span>
                        <span className="card-value">{cadastro.cor || 'N/A'}</span>
                      </div>
                      <div className="card-info-row">
                        <span className="card-label">Produtos</span>
                        <span className="card-value card-products">{cadastro.produtosAplicados || 'N/A'}</span>
                      </div>
                      <div className="card-info-row">
                        <span className="card-label">Serial</span>
                        <span className="card-value">{cadastro.serialNumber || 'N/A'}</span>
                      </div>
                      <div className="card-info-row">
                        <span className="card-label">Local</span>
                        <span className="card-value">{cadastro.localAplicado || 'N/A'}</span>
                      </div>
                      {cadastro.certificadoId && (
                        <div className="card-info-row">
                          <span className="card-label">Certificado</span>
                          <span className="card-value card-cert-id">{cadastro.certificadoId}</span>
                        </div>
                      )}
                    </div>
                    {cadastro.fotoCarro && (
                      <div className="card-photo">
                        <img 
                          src={cadastro.fotoCarro} 
                          alt={`Veiculo ${cadastro.modeloCarro}`}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MeusCadastrosPage;
