import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CadastroPage.css';
import Footer from './Footer';

const CadastroPage = () => {
  const navigate = useNavigate();
  
  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.product-search-container')) {
        setShowProductSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [formData, setFormData] = useState({
    nomeCliente: '',
    telefone: '',
    email: '',
    cpf: '',
    dataNascimento: '',
    endereco: '',
    modeloCarro: '',
    cor: '',
    placa: '',
    produtosAplicados: [],
    serialNumber: '',
    dataAplicacao: '',
    localAplicado: '',
    estado: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [placaSearch, setPlacaSearch] = useState('');
  const [searchingPlaca, setSearchingPlaca] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // CPF search state
  const [searchingCPF, setSearchingCPF] = useState(false);
  const [clienteExistente, setClienteExistente] = useState(false);
  const [veiculosExistentes, setVeiculosExistentes] = useState([]);
  const [dadosBloqueados, setDadosBloqueados] = useState(false);

  // Search client by CPF
  const handleCPFSearch = async (cpfValue) => {
    const cpf = cpfValue || formData.cpf;
    if (!cpf || cpf.replace(/[^0-9]/g, '').length < 11) return;

    setSearchingCPF(true);
    setMessage('');

    try {
      const response = await axios.post('/api/buscar-cliente-cpf',
        { cpf },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success && response.data.found) {
        const { dadosPessoais, veiculos, totalCertificados } = response.data;
        
        setFormData(prev => ({
          ...prev,
          nomeCliente: dadosPessoais.nomeCliente,
          cpf: dadosPessoais.cpf,
          dataNascimento: dadosPessoais.dataNascimento,
          telefone: dadosPessoais.telefone,
          email: dadosPessoais.email,
          endereco: dadosPessoais.endereco,
          estado: dadosPessoais.estado,
          // Vehicle fields stay empty for new vehicle
          modeloCarro: '',
          cor: '',
          placa: '',
          produtosAplicados: [],
          serialNumber: '',
          dataAplicacao: '',
          localAplicado: ''
        }));

        setClienteExistente(true);
        setVeiculosExistentes(veiculos);
        setDadosBloqueados(true);
        setMessage(`Cliente encontrado! ${totalCertificados} certificado(s) e ${veiculos.length} veiculo(s) registrado(s). Dados pessoais preenchidos. Preencha os dados do novo veiculo.`);
      } else {
        setClienteExistente(false);
        setVeiculosExistentes([]);
        setDadosBloqueados(false);
      }
    } catch (error) {
      console.error('Erro ao buscar CPF:', error);
    } finally {
      setSearchingCPF(false);
    }
  };

  // Reset client data to allow editing
  const handleNovoCliente = () => {
    setClienteExistente(false);
    setVeiculosExistentes([]);
    setDadosBloqueados(false);
    setFormData({
      nomeCliente: '', telefone: '', email: '', cpf: '',
      dataNascimento: '', endereco: '', modeloCarro: '', cor: '',
      placa: '', produtosAplicados: [], serialNumber: '',
      dataAplicacao: '', localAplicado: '', estado: ''
    });
    setMessage('');
  };

  // Fill form with existing vehicle data
  const handleSelectVeiculo = (veiculo) => {
    setFormData(prev => ({
      ...prev,
      modeloCarro: veiculo.modeloCarro,
      cor: veiculo.cor,
      placa: veiculo.placa
    }));
    setPlacaSearch(veiculo.placa);
    setMessage('Dados do veiculo preenchidos. Atualize os dados da aplicacao.');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('❌ O arquivo deve ter no máximo 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.match('image.*')) {
        setMessage('❌ Apenas arquivos de imagem são permitidos');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleProductToggle = (product) => {
    setFormData(prev => ({
      ...prev,
      produtosAplicados: prev.produtosAplicados.includes(product)
        ? prev.produtosAplicados.filter(p => p !== product)
        : [...prev.produtosAplicados, product]
    }));
  };

  const availableProducts = [
    'Ecocoat Kenzo',
    'Ecocoat Arcane', 
    'Ecocoat Elixir',
    'Ecocoat Quartz',
    'Ecocoat Ez',
    'Ecocoat Window',
    'Ecocoat Wheel',
    'Ecocoat Leather',
    'Ecocoat Trim',
    'Ecocoat Eclipse',
    'Ecocoat Premier'
  ];

  const filteredProducts = availableProducts.filter(product => 
    product.toLowerCase().includes(productSearch.toLowerCase()) &&
    !formData.produtosAplicados.includes(product)
  );

  const handleProductSearch = (e) => {
    const value = e.target.value;
    setProductSearch(value);
    setShowProductSuggestions(value.length > 0);
  };

  const handleProductSelect = (product) => {
    setFormData(prev => ({
      ...prev,
      produtosAplicados: [...prev.produtosAplicados, product]
    }));
    setProductSearch('');
    setShowProductSuggestions(false);
  };

  const handleRemoveProduct = (product) => {
    setFormData(prev => ({
      ...prev,
      produtosAplicados: prev.produtosAplicados.filter(p => p !== product)
    }));
  };

  const handlePlacaSearch = async () => {
    if (!placaSearch.trim()) {
      setMessage('⚠️ Digite uma placa para buscar');
      return;
    }

    setSearchingPlaca(true);
    setMessage('');

    try {
      const response = await axios.post('/api/buscar-veiculo-por-placa', 
        { placa: placaSearch },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        const veiculoData = response.data.data;
        setFormData(prev => ({
          ...prev,
          modeloCarro: veiculoData.modeloCarro,
          cor: veiculoData.cor || prev.cor,
          placa: placaSearch.toUpperCase()
        }));
        setMessage('✅ Veículo encontrado e dados preenchidos automaticamente!');
      } else {
        setMessage(`❌ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Erro ao buscar veículo:', error);
      setMessage('❌ Erro ao consultar veículo. Tente novamente.');
    } finally {
      setSearchingPlaca(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formDataToSend = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'produtosAplicados') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Validate products selection
      if (formData.produtosAplicados.length === 0) {
        setMessage('❌ Selecione pelo menos um produto aplicado');
        setLoading(false);
        return;
      }
      
      // Add photo if selected
      if (selectedFile) {
        formDataToSend.append('fotoCarro', selectedFile);
      }

      const response = await axios.post('/api/cadastro', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setMessage('✅ Cadastro realizado com sucesso! ID do Certificado: ' + response.data.certificadoId);
        setFormData({
          nomeCliente: '',
          telefone: '',
          email: '',
          cpf: '',
          dataNascimento: '',
          endereco: '',
          modeloCarro: '',
          cor: '',
          placa: '',
          produtosAplicados: [],
          serialNumber: '',
          dataAplicacao: '',
          localAplicado: '',
          estado: ''
        });
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    } catch (error) {
      setMessage('❌ Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cadastro-container">
      <div className="cadastro-header">
        <button onClick={() => navigate('/')} className="back-btn">← Voltar</button>
        <div className="logo-wrapper-small">
          <div className="logo-circle-small">
            <img src="/logo.png" alt="IGL Coatings Logo" />
          </div>
        </div>
        <h1>Cadastro de Aplicação</h1>
        <p>Preencha todos os dados do cliente e da aplicação</p>
        <div className="user-info">
          <span>Aplicador: {JSON.parse(localStorage.getItem('user') || '{}')?.nome || 'Carregando...'}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="cadastro-form">
        <div className="form-section">
          <h2>Dados do Cliente</h2>
          
          {/* CPF Search - First field */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>CPF * (digite e clique em buscar para verificar cliente existente)</label>
              <div className="cpf-search-container">
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={(e) => {
                    handleChange(e);
                    // Reset existing client if CPF changes
                    if (clienteExistente) {
                      setClienteExistente(false);
                      setVeiculosExistentes([]);
                      setDadosBloqueados(false);
                    }
                  }}
                  placeholder="Digite o CPF do cliente"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleCPFSearch()}
                  disabled={searchingCPF || formData.cpf.replace(/[^0-9]/g, '').length < 11}
                  className="search-cpf-btn"
                >
                  {searchingCPF ? 'Buscando...' : 'Buscar CPF'}
                </button>
              </div>
            </div>
          </div>

          {/* Existing client banner */}
          {clienteExistente && (
            <div className="cliente-existente-banner">
              <div className="banner-content">
                <div className="banner-icon">!</div>
                <div className="banner-text">
                  <strong>Cliente ja cadastrado!</strong>
                  <span>Dados pessoais preenchidos automaticamente. {veiculosExistentes.length} veiculo(s) registrado(s).</span>
                </div>
                <button type="button" onClick={handleNovoCliente} className="banner-reset-btn">
                  Novo Cliente
                </button>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Nome Completo *</label>
              <input
                type="text"
                name="nomeCliente"
                value={formData.nomeCliente}
                onChange={handleChange}
                readOnly={dadosBloqueados}
                className={dadosBloqueados ? 'input-locked' : ''}
                required
              />
            </div>
            <div className="form-group">
              <label>Telefone *</label>
              <input
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                readOnly={dadosBloqueados}
                className={dadosBloqueados ? 'input-locked' : ''}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                readOnly={dadosBloqueados}
                className={dadosBloqueados ? 'input-locked' : ''}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Data de Nascimento *</label>
              <input
                type="date"
                name="dataNascimento"
                value={formData.dataNascimento}
                onChange={handleChange}
                readOnly={dadosBloqueados}
                className={dadosBloqueados ? 'input-locked' : ''}
                required
              />
            </div>
            <div className="form-group">
              <label>Estado *</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                disabled={dadosBloqueados}
                className={dadosBloqueados ? 'input-locked' : ''}
                required
              >
                <option value="">Selecione...</option>
                <option value="AC">Acre</option>
                <option value="AL">Alagoas</option>
                <option value="AP">Amapá</option>
                <option value="AM">Amazonas</option>
                <option value="BA">Bahia</option>
                <option value="CE">Ceará</option>
                <option value="DF">Distrito Federal</option>
                <option value="ES">Espírito Santo</option>
                <option value="GO">Goiás</option>
                <option value="MA">Maranhão</option>
                <option value="MT">Mato Grosso</option>
                <option value="MS">Mato Grosso do Sul</option>
                <option value="MG">Minas Gerais</option>
                <option value="PA">Pará</option>
                <option value="PB">Paraíba</option>
                <option value="PR">Paraná</option>
                <option value="PE">Pernambuco</option>
                <option value="PI">Piauí</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="RN">Rio Grande do Norte</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="RO">Rondônia</option>
                <option value="RR">Roraima</option>
                <option value="SC">Santa Catarina</option>
                <option value="SP">São Paulo</option>
                <option value="SE">Sergipe</option>
                <option value="TO">Tocantins</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group full-width">
              <label>Endereco Completo *</label>
              <input
                type="text"
                name="endereco"
                value={formData.endereco}
                onChange={handleChange}
                readOnly={dadosBloqueados}
                className={dadosBloqueados ? 'input-locked' : ''}
                required
              />
            </div>
          </div>
        </div>

        {/* EXISTING VEHICLES SECTION */}
        {clienteExistente && veiculosExistentes.length > 0 && (
          <div className="form-section veiculos-existentes-section">
            <h2>Veiculos Cadastrados</h2>
            <p className="section-subtitle">Veiculos ja registrados para este cliente. Selecione um para nova aplicacao ou cadastre um novo abaixo.</p>
            <div className="veiculos-grid">
              {veiculosExistentes.map((veiculo, index) => (
                <div key={index} className="veiculo-card">
                  <div className="veiculo-card-header">
                    <span className="veiculo-modelo">{veiculo.modeloCarro}</span>
                    <span className="veiculo-placa">{veiculo.placa}</span>
                  </div>
                  <div className="veiculo-card-body">
                    <div className="veiculo-detail">
                      <span className="veiculo-label">Cor:</span>
                      <span>{veiculo.cor}</span>
                    </div>
                    <div className="veiculo-detail">
                      <span className="veiculo-label">Produtos:</span>
                      <span>{veiculo.produtosAplicados}</span>
                    </div>
                    <div className="veiculo-detail">
                      <span className="veiculo-label">Aplicacao:</span>
                      <span>{veiculo.dataAplicacao}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="veiculo-select-btn"
                    onClick={() => handleSelectVeiculo(veiculo)}
                  >
                    Selecionar este veiculo
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-section">
          <h2>{clienteExistente ? 'Novo Veiculo / Nova Aplicacao' : 'Dados do Veiculo'}</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Modelo do Carro *</label>
              <input
                type="text"
                name="modeloCarro"
                value={formData.modeloCarro}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Placa *</label>
              <div className="placa-search-container">
                <input
                  type="text"
                  name="placa"
                  value={formData.placa}
                  onChange={(e) => {
                    handleChange(e);
                    setPlacaSearch(e.target.value);
                  }}
                  placeholder="Ex: ABC1234"
                  required
                />
                <button 
                  type="button" 
                  onClick={handlePlacaSearch}
                  disabled={searchingPlaca}
                  className="search-placa-btn"
                >
                  {searchingPlaca ? 'Buscando...' : '🔍 Buscar'}
                </button>
              </div>
              <small className="placa-hint">Digite a placa e clique em buscar para preencher dados automaticamente</small>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Cor *</label>
              <input
                type="text"
                name="cor"
                value={formData.cor}
                onChange={handleChange}
                placeholder="Ex: Prata, Preto, Branco"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>🔧 Dados da Aplicação</h2>
          <div className="form-row">
            <div className="form-group full-width">
              <label>Serial Number *</label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="Digite o serial number do produto"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group full-width">
              <label>Produtos Aplicados *</label>
              <div className="products-selection">
                <div className="selected-products">
                  {formData.produtosAplicados.length === 0 ? (
                    <p className="no-products">Nenhum produto selecionado</p>
                  ) : (
                    <div className="products-tags">
                      {formData.produtosAplicados.map(product => (
                        <div key={product} className="product-tag">
                          <span>{product}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveProduct(product)}
                            className="remove-tag"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="product-search-container">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={handleProductSearch}
                    onFocus={() => setShowProductSuggestions(true)}
                    placeholder="Digite para buscar produtos..."
                    className="product-search-input"
                  />
                  
                  {showProductSuggestions && filteredProducts.length > 0 && (
                    <div className="product-suggestions">
                      {filteredProducts.map(product => (
                        <div
                          key={product}
                          onClick={() => handleProductSelect(product)}
                          className="suggestion-item"
                        >
                          {product}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {formData.produtosAplicados.length === 0 && (
                  <p className="products-warning">Selecione pelo menos um produto</p>
                )}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Data da Aplicação *</label>
              <input
                type="date"
                name="dataAplicacao"
                value={formData.dataAplicacao}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Local Aplicado *</label>
              <input
                type="text"
                name="localAplicado"
                value={formData.localAplicado}
                onChange={handleChange}
                placeholder="Ex: São Paulo - SP"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>📸 Foto do Veículo</h2>
          <div className="photo-upload-section">
            {!previewUrl ? (
              <div className="photo-upload-area">
                <input
                  type="file"
                  id="fotoCarro"
                  name="fotoCarro"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="fotoCarro" className="photo-upload-label">
                  <div className="upload-icon">Câmera</div>
                  <div className="upload-text">
                    <p>Clique para adicionar foto do veículo</p>
                    <span>Formatos: JPG, PNG, GIF (máx. 5MB)</span>
                  </div>
                </label>
              </div>
            ) : (
              <div className="photo-preview">
                <img src={previewUrl} alt="Preview do veículo" className="preview-image" />
                <button type="button" onClick={handleRemovePhoto} className="remove-photo-btn">
                  Remover foto
                </button>
              </div>
            )}
          </div>
        </div>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar Aplicação'}
        </button>
      </form>
      
      <Footer />
    </div>
  );
};

export default CadastroPage;
