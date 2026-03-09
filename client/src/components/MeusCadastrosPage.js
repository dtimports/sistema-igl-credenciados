import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MeusCadastrosPage.css';
import './BuscaCertificadoPage.css';
import Footer from './Footer';

// Product warranty catalog (in months)
const PRODUCT_WARRANTY = {
  'Ecocoat Kenzo': 60,
  'Ecocoat Arcane': 48,
  'Ecocoat Elixir': 36,
  'Ecocoat Quartz': 24,
  'Ecocoat Ez': 12,
  'Ecocoat Wheel': 12,
  'Ecocoat Window': 12,
  'Ecocoat Leather': 12,
  'Ecocoat Trim': 24,
  'Ecocoat Premier': 6,
  'Premier': 6,
  'Ecocoat Eclipse': 12
};

function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(parseInt(br[3]), parseInt(br[2]) - 1, parseInt(br[1]));
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function getWarrantyMonths(productName) {
  const name = productName.trim().toLowerCase();
  for (const [key, months] of Object.entries(PRODUCT_WARRANTY)) {
    if (name === key.toLowerCase() || name.includes(key.toLowerCase()) || key.toLowerCase().includes(name)) {
      return months;
    }
  }
  return 12;
}

function formatWarrantyDuration(months) {
  if (months >= 12) {
    const years = months / 12;
    return years === 1 ? '1 ano' : `${years} anos`;
  }
  return `${months} meses`;
}

function calcWarrantyInfo(productName, applicationDate) {
  const appDate = parseDate(applicationDate);
  if (!appDate) return { status: 'unknown', label: 'Data indisponivel' };
  const warrantyMonths = getWarrantyMonths(productName);
  const expiryDate = new Date(appDate);
  expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const totalDays = Math.ceil((expiryDate.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
  const percent = Math.max(0, Math.min(100, ((totalDays - Math.max(0, diffDays)) / totalDays) * 100));
  if (diffDays <= 0) {
    return { status: 'expired', label: 'Garantia expirada', expiryDate, daysLeft: 0, percent: 100, warrantyMonths };
  }
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  let remaining = '';
  if (months > 0) remaining += `${months} ${months === 1 ? 'mes' : 'meses'}`;
  if (days > 0) remaining += `${remaining ? ' e ' : ''}${days} dias`;
  return { status: diffDays <= 90 ? 'warning' : 'active', label: remaining, expiryDate, daysLeft: diffDays, percent, warrantyMonths };
}

function calcMaintenanceSchedule(applicationDate) {
  const appDate = parseDate(applicationDate);
  if (!appDate) return { next: null, overdue: false, history: [] };
  const now = new Date();
  const schedule = [];
  let nextMaintenance = null;
  let overdue = false;
  for (let i = 1; i <= 10; i++) {
    const maintDate = new Date(appDate);
    maintDate.setMonth(maintDate.getMonth() + (i * 6));
    const isPast = maintDate < now;
    schedule.push({ date: maintDate, number: i, isPast });
    if (!nextMaintenance && maintDate >= now) {
      nextMaintenance = maintDate;
    }
  }
  const pastMaintenances = schedule.filter(s => s.isPast);
  if (pastMaintenances.length > 0 && nextMaintenance) {
    const daysUntilNext = Math.ceil((nextMaintenance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilNext <= 60) overdue = true;
  }
  return { next: nextMaintenance, overdue, history: schedule };
}

const parseProducts = (produtosStr) => {
  if (!produtosStr) return [];
  return produtosStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
};

const MeusCadastrosPage = () => {
  const navigate = useNavigate();
  const [cadastros, setCadastros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aplicadorNome, setAplicadorNome] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCadastro, setSelectedCadastro] = useState(null);

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
                  <div key={index} className="cadastro-card cadastro-card-clickable" onClick={() => setSelectedCadastro(cadastro)}>
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
                    <div className="card-tap-hint">Toque para ver certificado completo</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de certificado completo */}
      {selectedCadastro && (() => {
        const certificado = selectedCadastro;
        const produtos = parseProducts(certificado.produtosAplicados);
        const maintenance = calcMaintenanceSchedule(certificado.dataAplicacao);

        return (
          <div className="certificado-modal-overlay" onClick={() => setSelectedCadastro(null)}>
            <div className="certificado-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setSelectedCadastro(null)}>✕</button>
              
              <div className="certificate-card">
                <div className="certificate-header">
                  <div className="certificate-id">
                    <span className="id-label">ID do Certificado:</span>
                    <span className="id-value">{certificado.certificadoId}</span>
                  </div>
                  <div className="certificate-date">
                    <span className="date-label">Data de Aplicacao:</span>
                    <span className="date-value">{formatDateBR(certificado.dataAplicacao)}</span>
                  </div>
                </div>
                
                <div className="certificate-content">
                  <div className="vehicle-info">
                    <h3>Dados do Veiculo</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Modelo:</span>
                        <span className="info-value">{certificado.modeloCarro}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Cor:</span>
                        <span className="info-value">{certificado.cor}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Placa:</span>
                        <span className="info-value">{certificado.placa}</span>
                      </div>
                      {certificado.serialNumber && (
                        <div className="info-item">
                          <span className="info-label">Serial Number:</span>
                          <span className="info-value">{certificado.serialNumber}</span>
                        </div>
                      )}
                      <div className="info-item">
                        <span className="info-label">Cliente:</span>
                        <span className="info-value">{certificado.nomeCliente || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">CPF:</span>
                        <span className="info-value">{certificado.cpf || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Aplicador:</span>
                        <span className="info-value">{certificado.aplicador || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Local:</span>
                        <span className="info-value">{certificado.localAplicado}</span>
                      </div>
                    </div>
                  </div>

                  {certificado.fotoCarro && (
                    <div className="vehicle-photo">
                      <h3>Foto do Veiculo</h3>
                      <div className="photo-display">
                        <img 
                          src={certificado.fotoCarro} 
                          alt={`Veiculo ${certificado.modeloCarro}`} 
                          className="certificate-photo"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="warranty-section">
                    <h3>Garantia por Produto</h3>
                    <div className="warranty-products-grid">
                      {produtos.map((produto, pIndex) => {
                        const warranty = calcWarrantyInfo(produto, certificado.dataAplicacao);
                        const warrantyLabel = formatWarrantyDuration(warranty.warrantyMonths || getWarrantyMonths(produto));
                        
                        return (
                          <div key={pIndex} className={`warranty-product-card warranty-${warranty.status}`}>
                            <div className="warranty-product-name">{produto}</div>
                            <div className="warranty-duration">Garantia: {warrantyLabel}</div>
                            
                            {warranty.expiryDate && (
                              <div className="warranty-expiry">
                                Valido ate: {warranty.expiryDate.toLocaleDateString('pt-BR')}
                              </div>
                            )}
                            
                            <div className="warranty-progress-bar">
                              <div 
                                className={`warranty-progress-fill progress-${warranty.status}`}
                                style={{ width: `${warranty.percent || 0}%` }}
                              ></div>
                            </div>
                            
                            <div className={`warranty-status-badge status-${warranty.status}`}>
                              {warranty.status === 'active' && <span>Ativa - Restam {warranty.label}</span>}
                              {warranty.status === 'warning' && <span>Atencao - Restam {warranty.label}</span>}
                              {warranty.status === 'expired' && <span>Garantia Expirada</span>}
                              {warranty.status === 'unknown' && <span>{warranty.label}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="maintenance-section">
                    <h3>Manutencao Recomendada</h3>
                    <div className="maintenance-info-text">
                      Recomendamos a manutencao do revestimento a cada <strong>6 meses</strong> a partir da data de aplicacao para manter a protecao e o brilho do veiculo.
                    </div>
                    
                    {maintenance.next && (
                      <div className={`maintenance-next-card ${maintenance.overdue ? 'maintenance-urgent' : 'maintenance-ok'}`}>
                        <div className="maintenance-next-icon">
                          {maintenance.overdue ? '!' : 'i'}
                        </div>
                        <div className="maintenance-next-content">
                          <div className="maintenance-next-title">
                            {maintenance.overdue ? 'Manutencao Proxima!' : 'Proxima Manutencao'}
                          </div>
                          <div className="maintenance-next-date">
                            {maintenance.next.toLocaleDateString('pt-BR')}
                          </div>
                          <div className="maintenance-next-days">
                            {(() => {
                              const days = Math.ceil((maintenance.next.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                              if (days <= 0) return 'Hoje ou em atraso';
                              if (days === 1) return 'Amanha';
                              return `Em ${days} dias`;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                </div>
                
                <div className="certificate-footer">
                  <div className="warranty-info">
                    {(() => {
                      const allExpired = produtos.every(p => calcWarrantyInfo(p, certificado.dataAplicacao).status === 'expired');
                      const anyWarning = produtos.some(p => calcWarrantyInfo(p, certificado.dataAplicacao).status === 'warning');
                      if (allExpired) return <span className="warranty-badge badge-expired">GARANTIAS EXPIRADAS</span>;
                      if (anyWarning) return <span className="warranty-badge badge-warning">CERTIFICADO DE GARANTIA - ATENCAO</span>;
                      return <span className="warranty-badge badge-active">CERTIFICADO DE GARANTIA VALIDO</span>;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <Footer />
    </div>
  );
};

export default MeusCadastrosPage;
