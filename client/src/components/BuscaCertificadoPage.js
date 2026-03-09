import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

// Parse a date string that could be YYYY-MM-DD, DD/MM/YYYY, or other formats
function parseDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));

  // DD/MM/YYYY
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(parseInt(br[3]), parseInt(br[2]) - 1, parseInt(br[1]));

  // Try native parse as fallback
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Get warranty months for a product name (fuzzy match)
function getWarrantyMonths(productName) {
  const name = productName.trim().toLowerCase();
  for (const [key, months] of Object.entries(PRODUCT_WARRANTY)) {
    if (name === key.toLowerCase() || name.includes(key.toLowerCase()) || key.toLowerCase().includes(name)) {
      return months;
    }
  }
  return 12; // default 1 year
}

// Format warranty duration as human-readable text
function formatWarrantyDuration(months) {
  if (months >= 12) {
    const years = months / 12;
    return years === 1 ? '1 ano' : `${years} anos`;
  }
  return `${months} meses`;
}

// Calculate warranty info for a product
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
  const elapsedDays = Math.ceil((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
  const percent = Math.max(0, Math.min(100, ((totalDays - Math.max(0, diffDays)) / totalDays) * 100));

  if (diffDays <= 0) {
    return {
      status: 'expired',
      label: 'Garantia expirada',
      expiryDate,
      daysLeft: 0,
      percent: 100,
      warrantyMonths
    };
  }

  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  let remaining = '';
  if (months > 0) remaining += `${months} ${months === 1 ? 'mes' : 'meses'}`;
  if (days > 0) remaining += `${remaining ? ' e ' : ''}${days} dias`;

  return {
    status: diffDays <= 90 ? 'warning' : 'active',
    label: remaining,
    expiryDate,
    daysLeft: diffDays,
    percent,
    warrantyMonths
  };
}

// Calculate maintenance schedule (every 6 months from application date)
function calcMaintenanceSchedule(applicationDate) {
  const appDate = parseDate(applicationDate);
  if (!appDate) return { next: null, overdue: false, history: [] };

  const now = new Date();
  const schedule = [];
  let nextMaintenance = null;
  let overdue = false;

  // Generate maintenance dates for the next 5 years
  for (let i = 1; i <= 10; i++) {
    const maintDate = new Date(appDate);
    maintDate.setMonth(maintDate.getMonth() + (i * 6));

    const isPast = maintDate < now;
    schedule.push({
      date: maintDate,
      number: i,
      isPast
    });

    if (!nextMaintenance && maintDate >= now) {
      nextMaintenance = maintDate;
      // Check if it's within 30 days
      const daysUntil = Math.ceil((maintDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30) {
        overdue = false; // upcoming soon
      }
    }
  }

  // Check if last past maintenance is overdue (passed but next one hasn't been set)
  const pastMaintenances = schedule.filter(s => s.isPast);
  if (pastMaintenances.length > 0) {
    const lastPast = pastMaintenances[pastMaintenances.length - 1];
    const daysSinceLast = Math.ceil((now.getTime() - lastPast.date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLast > 0 && nextMaintenance) {
      const daysUntilNext = Math.ceil((nextMaintenance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilNext <= 60) {
        overdue = true;
      }
    }
  }

  return { next: nextMaintenance, overdue, history: schedule };
}

const BuscaCertificadoPage = () => {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    cpf: '',
    dataNascimento: ''
  });
  const [loading, setLoading] = useState(false);
  const [certificados, setCertificados] = useState([]);
  const [message, setMessage] = useState('');
  const [searched, setSearched] = useState(false);

  const handleChange = (e) => {
    setSearchData({
      ...searchData,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setCertificados([]);
    setSearched(false);

    try {
      const response = await axios.post('/api/buscar-certificados', searchData, {});
      
      if (response.data.success) {
        setCertificados(response.data.certificados);
        setSearched(true);
        
        if (response.data.certificados.length === 0) {
          setMessage('Nenhum certificado encontrado para os dados informados.');
        }
      }
    } catch (error) {
      setMessage('Erro ao buscar certificados. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateBR = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return dateStr || 'N/A';
    return d.toLocaleDateString('pt-BR');
  };

  // Parse products string into array
  const parseProducts = (produtosStr) => {
    if (!produtosStr) return [];
    return produtosStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
  };

  return (
    <div className="busca-container">
      <div className="busca-header">
        <button onClick={() => navigate('/')} className="back-btn">← Voltar</button>
        <div className="logo-wrapper-small">
          <div className="logo-circle-small">
            <img src="/logo.png" alt="IGL Coatings Logo" />
          </div>
        </div>
        <h1>Consultar Certificados</h1>
        <p>Informe seus dados para visualizar seus certificados de garantia</p>
      </div>

      <div className="busca-content">
        <form onSubmit={handleSearch} className="search-form">
          <div className="form-row">
            <div className="form-group">
              <label>CPF *</label>
              <input
                type="text"
                name="cpf"
                value={searchData.cpf}
                onChange={handleChange}
                placeholder="Digite seu CPF"
                required
              />
            </div>
            <div className="form-group">
              <label>Data de Nascimento *</label>
              <input
                type="date"
                name="dataNascimento"
                value={searchData.dataNascimento}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar Certificados'}
          </button>
        </form>

        {message && searched && (
          <div className="message">
            {message}
          </div>
        )}

        {certificados.length > 0 && (
          <div className="certificates-list">
            <h2>Certificados Encontrados ({certificados.length})</h2>
            
            {certificados.map((certificado, index) => {
              const produtos = parseProducts(certificado.produtosAplicados);
              const maintenance = calcMaintenanceSchedule(certificado.dataAplicacao);
              const appDate = parseDate(certificado.dataAplicacao);

              return (
                <div key={index} className="certificate-card">
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
                          <span className="info-label">Aplicador:</span>
                          <span className="info-value">{certificado.aplicador || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Local:</span>
                          <span className="info-value">{certificado.localAplicado}</span>
                        </div>
                      </div>
                    </div>

                    {/* WARRANTY PER PRODUCT */}
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
                                {warranty.status === 'active' && (
                                  <span>Ativa - Restam {warranty.label}</span>
                                )}
                                {warranty.status === 'warning' && (
                                  <span>Atencao - Restam {warranty.label}</span>
                                )}
                                {warranty.status === 'expired' && (
                                  <span>Garantia Expirada</span>
                                )}
                                {warranty.status === 'unknown' && (
                                  <span>{warranty.label}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* MAINTENANCE SECTION */}
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
                              {maintenance.overdue 
                                ? 'Manutencao Proxima!' 
                                : 'Proxima Manutencao'}
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

                      {/* WhatsApp button to schedule maintenance */}
                      {certificado.aplicadorTelefone && (
                        <a
                          href={`https://wa.me/${certificado.aplicadorTelefone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Ola ${certificado.aplicador || ''}! Gostaria de agendar uma manutencao para meu veiculo:\n\n` +
                            `Certificado: ${certificado.certificadoId}\n` +
                            `Veiculo: ${certificado.modeloCarro} - ${certificado.placa}\n` +
                            `Produtos: ${certificado.produtosAplicados}\n\n` +
                            `Podemos agendar?`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whatsapp-maintenance-btn"
                        >
                          <span className="whatsapp-icon">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </span>
                          Agendar Manutencao com {certificado.aplicador || 'Aplicador'}
                        </a>
                      )}

                      {!certificado.aplicadorTelefone && certificado.aplicador && (
                        <div className="maintenance-no-phone">
                          Aplicador: <strong>{certificado.aplicador}</strong> — Entre em contato para agendar a manutencao.
                        </div>
                      )}
                    </div>
                    
                    {certificado.fotoCarro && (
                      <div className="vehicle-photo">
                        <h3>Foto do Veiculo</h3>
                        <div className="photo-display">
                          <img 
                            src={certificado.fotoCarro.startsWith('http') ? certificado.fotoCarro : `${certificado.fotoCarro}`} 
                            alt={`Veiculo ${certificado.modeloCarro}`} 
                            className="certificate-photo"
                          />
                        </div>
                      </div>
                    )}
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
              );
            })}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default BuscaCertificadoPage;
