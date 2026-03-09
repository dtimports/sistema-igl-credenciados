const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint (before all other routes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'igl_coatings_secret_key_2024';

// Configure Google APIs (Sheets + Drive)
// Support credentials from env var (Railway) or file (local)
const googleScopes = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
];

let authConfig;
if (process.env.GOOGLE_CREDENTIALS) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  authConfig = { credentials, scopes: googleScopes };
} else {
  authConfig = { keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json', scopes: googleScopes };
}

const auth = new GoogleAuth(authConfig);

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// Spreadsheet ID
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'YOUR_SPREADSHEET_ID';
// Google Drive folder ID for storing car photos
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '';

// State mappings for sheet names
const STATE_SHEETS = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
  'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
  'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
  'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
};

// Headers for the spreadsheet
const SHEET_HEADERS = [
  'Certificado ID', 'Data Cadastro', 'Nome Cliente', 'CPF', 'Data Nascimento',
  'Telefone', 'Email', 'Endereço', 'Modelo Carro', 'Cor', 'Placa',
  'Produtos Aplicados', 'Serial Number', 'Data Aplicação', 'Local Aplicado',
  'Estado', 'Foto Carro', 'Aplicador', 'Aplicador Telefone'
];

// Get sheet name by state code
function getSheetNameByState(stateCode) {
  return STATE_SHEETS[stateCode?.toUpperCase()] || 'Geral';
}

// Create all state sheets with headers on startup
async function initializeSheets() {
  try {
    console.log('Inicializando abas do Google Sheets...');
    
    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    
    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log('Abas existentes:', existingSheets.join(', '));
    
    // All sheet names we need (27 states + Geral)
    const allSheetNames = [...Object.values(STATE_SHEETS), 'Geral'];
    const sheetsToCreate = allSheetNames.filter(name => !existingSheets.includes(name));
    
    if (sheetsToCreate.length > 0) {
      console.log(`Criando ${sheetsToCreate.length} abas...`);
      
      // Create missing sheets in batch
      const requests = sheetsToCreate.map(title => ({
        addSheet: {
          properties: { title }
        }
      }));
      
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests }
      });
      
      console.log('Abas criadas:', sheetsToCreate.join(', '));
    }
    
    // Add headers to all sheets that need them
    for (const sheetName of allSheetNames) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetName}'!A1:S1`
        });
        
        const firstRow = response.data.values;
        if (!firstRow || firstRow.length === 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A1:S1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [SHEET_HEADERS] }
          });
          console.log(`Cabeçalhos adicionados: ${sheetName}`);
        }
      } catch (err) {
        console.error(`Erro ao adicionar cabeçalhos em ${sheetName}:`, err.message);
      }
    }
    
    // Delete default "Sheet1" if it exists and is not needed
    const sheet1 = spreadsheet.data.sheets.find(s => s.properties.title === 'Sheet1' || s.properties.title === 'Página1');
    if (sheet1 && spreadsheet.data.sheets.length > 1) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{
              deleteSheet: { sheetId: sheet1.properties.sheetId }
            }]
          }
        });
        console.log('Aba padrão removida');
      } catch (err) {
        // Ignore if can't delete
      }
    }
    
    console.log('✅ Google Sheets inicializado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar Google Sheets:', error.message);
    return false;
  }
}

// Ensure Google Drive folder exists for storing photos
async function ensureDriveFolder() {
  try {
    if (DRIVE_FOLDER_ID) return DRIVE_FOLDER_ID;
    
    // Search for existing folder
    const searchResponse = await drive.files.list({
      q: "name='IGL Certificados Fotos' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)'
    });
    
    if (searchResponse.data.files.length > 0) {
      const folderId = searchResponse.data.files[0].id;
      console.log('📁 Pasta do Drive encontrada:', folderId);
      return folderId;
    }
    
    // Create new folder
    const folderMetadata = {
      name: 'IGL Certificados Fotos',
      mimeType: 'application/vnd.google-apps.folder'
    };
    
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    });
    
    const folderId = folder.data.id;
    
    // Make folder publicly accessible (view only)
    await drive.permissions.create({
      fileId: folderId,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    console.log('📁 Pasta do Drive criada:', folderId);
    return folderId;
  } catch (error) {
    console.error('Erro ao criar pasta no Drive:', error.message);
    return null;
  }
}

// Upload image to Google Drive and return public URL
async function uploadImageToDrive(filePath, fileName, certificadoId) {
  try {
    const folderId = await ensureDriveFolder();
    if (!folderId) {
      console.error('Pasta do Drive não disponível');
      return null;
    }
    
    const fileMetadata = {
      name: `${certificadoId}_${fileName}`,
      parents: [folderId]
    };
    
    const media = {
      mimeType: 'image/jpeg',
      body: fs.createReadStream(filePath)
    };
    
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink'
    });
    
    // Make file publicly accessible
    await drive.permissions.create({
      fileId: file.data.id,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    // Get direct image URL (thumbnail format works reliably in img tags)
    const imageUrl = `https://drive.google.com/thumbnail?id=${file.data.id}&sz=w800`;
    
    console.log(`📸 Imagem enviada ao Drive: ${imageUrl}`);
    
    // Delete local file after upload
    fs.unlink(filePath, (err) => {
      if (err) console.error('Erro ao deletar arquivo local:', err.message);
    });
    
    return imageUrl;
  } catch (error) {
    console.error('Erro ao enviar imagem ao Drive:', error.message);
    return null;
  }
}

// Function to append data to a state sheet
async function appendToSheet(stateCode, rowData) {
  try {
    const sheetName = getSheetNameByState(stateCode);
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A:S`,
      valueInputOption: 'RAW',
      resource: {
        values: [rowData]
      }
    });
    
    console.log(`Dados adicionados na aba "${sheetName}":`, response.data.updates.updatedRange);
    return true;
  } catch (error) {
    console.error('Erro ao adicionar dados ao Google Sheets:', error.message);
    return false;
  }
}

// Field mapping from sheet headers to JS field names
const FIELD_MAP = {
  'Certificado ID': 'certificadoId',
  'Data Cadastro': 'dataCadastro',
  'Nome Cliente': 'nomeCliente',
  'CPF': 'cpf',
  'Data Nascimento': 'dataNascimento',
  'Telefone': 'telefone',
  'Email': 'email',
  'Endereço': 'endereco',
  'Modelo Carro': 'modeloCarro',
  'Cor': 'cor',
  'Placa': 'placa',
  'Produtos Aplicados': 'produtosAplicados',
  'Serial Number': 'serialNumber',
  'Data Aplicação': 'dataAplicacao',
  'Local Aplicado': 'localAplicado',
  'Estado': 'estado',
  'Foto Carro': 'fotoCarro',
  'Aplicador': 'aplicador',
  'Aplicador Telefone': 'aplicadorTelefone'
};

// Normalize CPF to digits only
function normalizeCPF(cpf) {
  return (cpf || '').replace(/[^0-9]/g, '');
}

// Normalize date - extract digits and always return YYYYMMDD for comparison
function normalizeDate(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  
  // Handle Google Sheets serial date number (days since 1899-12-30)
  if (/^\d{4,5}$/.test(str) && !str.includes('-') && !str.includes('/')) {
    const serial = parseInt(str);
    const baseDate = new Date(1899, 11, 30);
    const date = new Date(baseDate.getTime() + serial * 86400000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  
  // YYYY-MM-DD (HTML date input)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}${isoMatch[2]}${isoMatch[3]}`;
  
  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}${brMatch[2].padStart(2, '0')}${brMatch[1].padStart(2, '0')}`;
  }
  
  // MM/DD/YYYY (US format Google Sheets might use)
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    // Ambiguous - try both interpretations, we'll handle in search
    return `${usMatch[3]}${usMatch[1].padStart(2, '0')}${usMatch[2].padStart(2, '0')}`;
  }
  
  // Fallback: just digits
  return str.replace(/[^0-9]/g, '');
}

// Function to search certificates across all state sheets
async function searchCertificados(cpf, dataNascimento) {
  try {
    const allSheetNames = [...Object.values(STATE_SHEETS), 'Geral'];
    const allCertificates = [];
    const searchCPF = normalizeCPF(cpf);
    const searchDate = normalizeDate(dataNascimento);
    // Also create reversed DD/MM version for ambiguous dates
    const isoMatch = dataNascimento.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const searchDateAlt = isoMatch ? `${isoMatch[1]}${isoMatch[3]}${isoMatch[2]}` : '';
    
    console.log('\n=== BUSCA DE CERTIFICADO ===');
    console.log(`CPF buscado: ${cpf} -> ${searchCPF}`);
    console.log(`Data buscada: ${dataNascimento} -> ${searchDate} (alt: ${searchDateAlt})`);
    
    for (const sheetName of allSheetNames) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetName}'!A:S`
        });
        
        const rows = response.data.values || [];
        if (rows.length <= 1) continue;
        
        const headers = rows[0];
        const cpfIndex = headers.findIndex(h => h.toLowerCase().includes('cpf'));
        const dataNascIndex = headers.findIndex(h => h.toLowerCase().includes('nascimento'));
        
        if (cpfIndex === -1 || dataNascIndex === -1) {
          console.log(`Aba "${sheetName}": colunas CPF/Data não encontradas`);
          continue;
        }
        
        const dataRows = rows.slice(1);
        if (dataRows.length > 0) {
          console.log(`Aba "${sheetName}": ${dataRows.length} registros. Exemplo CPF: "${dataRows[0][cpfIndex]}", Data: "${dataRows[0][dataNascIndex]}"`);
        }
        
        const matchingRows = dataRows.filter(row => {
          const rowCPF = normalizeCPF(row[cpfIndex]);
          const rowDate = normalizeDate(row[dataNascIndex] || '');
          
          const cpfMatch = rowCPF === searchCPF;
          // Try both date interpretations for ambiguous formats
          const dateMatch = rowDate === searchDate || rowDate === searchDateAlt || 
                           row[dataNascIndex] === dataNascimento;
          
          if (cpfMatch) {
            console.log(`  -> CPF MATCH! Data planilha: "${row[dataNascIndex]}" (norm: ${rowDate}) vs buscada: ${searchDate} -> ${dateMatch ? 'ENCONTRADO!' : 'data não bate'}`);
          }
          
          return cpfMatch && dateMatch;
        });
        
        matchingRows.forEach(row => {
          const obj = {};
          headers.forEach((header, index) => {
            const fieldName = FIELD_MAP[header] || header;
            obj[fieldName] = row[index] || '';
          });
          allCertificates.push(obj);
        });
        
      } catch (err) {
        continue;
      }
    }
    
    console.log(`\nRESULTADO: ${allCertificates.length} certificado(s) encontrado(s)`);
    console.log(`=========================\n`);
    return allCertificates;
    
  } catch (error) {
    console.error('Erro ao buscar certificados:', error.message);
    return [];
  }
}

// Load aplicadores data
let aplicadores = [];
try {
  const aplicadoresData = fs.readFileSync('./aplicadores.json', 'utf8');
  aplicadores = JSON.parse(aplicadoresData);
} catch (error) {
  console.log('Arquivo aplicadores.json não encontrado, usando array vazio');
}

// FIPE API Integration
async function buscarVeiculoPorPlaca(placa) {
  try {
    // Limpar a placa (remover espaços e caracteres especiais)
    const placaLimpa = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // FIPE API - Usando uma API pública gratuita
    // Nota: Esta é uma implementação simulada, pois a FIPE API oficial requer credenciais
    const fipeUrl = `https://parallelum.com.br/fipe/api/v1/carros/marcas`;
    
    // Primeiro, obter marcas disponíveis
    const marcasResponse = await axios.get(fipeUrl);
    const marcas = marcasResponse.data;
    
    // Buscar por uma marca comum (simulação)
    const marca = marcas.find(m => m.nome.toLowerCase().includes('volkswagen')) || marcas[0];
    
    // Obter modelos da marca
    const modelosUrl = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${marca.codigo}/modelos`;
    const modelosResponse = await axios.get(modelosUrl);
    const modelos = modelosResponse.data.modelos;
    
    // Selecionar um modelo comum (simulação)
    const modelo = modelos.find(m => m.nome.toLowerCase().includes('gol')) || modelos[0];
    
    // Obter anos do modelo
    const anosUrl = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${marca.codigo}/modelos/${modelo.codigo}/anos`;
    const anosResponse = await axios.get(anosUrl);
    const anos = anosResponse.data;
    
    // Obter valor de um ano específico
    const valorUrl = `https://parallelum.com.br/fipe/api/v1/carros/marcas/${marca.codigo}/modelos/${modelo.codigo}/anos/${anos[0].codigo}`;
    const valorResponse = await axios.get(valorUrl);
    
    return {
      sucesso: true,
      marca: marca.nome,
      modelo: modelo.nome,
      ano: anos[0].nome,
      cor: 'Não informado', // FIPE API não fornece cor
      valor: valorResponse.data.Valor,
      combustivel: valorResponse.data.Combustivel,
      codigoFipe: valorResponse.data.CodigoFipe
    };
    
  } catch (error) {
    console.error('Erro ao buscar veículo:', error);
    return {
      sucesso: false,
      erro: 'Não foi possível consultar a placa. Tente novamente.'
    };
  }
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de autenticação necessário' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'car-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
    cb(null, true);
  }
});

// Routes

// Endpoint para buscar cliente por CPF (preencher cadastro existente)
app.post('/api/buscar-cliente-cpf', authenticateToken, async (req, res) => {
  try {
    const { cpf } = req.body;
    if (!cpf) {
      return res.status(400).json({ success: false, message: 'CPF é obrigatório' });
    }

    const searchCPF = cpf.replace(/[^0-9]/g, '');
    const allSheetNames = [...Object.values(STATE_SHEETS), 'Geral'];
    const registros = [];

    for (const sheetName of allSheetNames) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetName}'!A:S`
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) continue;

        const headers = rows[0];
        const cpfIndex = headers.findIndex(h => h.toLowerCase().includes('cpf'));
        if (cpfIndex === -1) continue;

        rows.slice(1).forEach(row => {
          const rowCPF = (row[cpfIndex] || '').replace(/[^0-9]/g, '');
          if (rowCPF === searchCPF) {
            const obj = {};
            headers.forEach((header, index) => {
              const fieldName = FIELD_MAP[header] || header;
              obj[fieldName] = row[index] || '';
            });
            registros.push(obj);
          }
        });
      } catch (err) {
        continue;
      }
    }

    if (registros.length === 0) {
      return res.json({ success: true, found: false, message: 'Cliente não encontrado' });
    }

    // Extract personal data from the first record
    const primeiro = registros[0];
    const dadosPessoais = {
      nomeCliente: primeiro.nomeCliente || '',
      cpf: primeiro.cpf || '',
      dataNascimento: primeiro.dataNascimento || '',
      telefone: primeiro.telefone || '',
      email: primeiro.email || '',
      endereco: primeiro.endereco || '',
      estado: primeiro.estado || ''
    };

    // Extract all vehicles (unique by placa)
    const veiculosMap = new Map();
    registros.forEach(reg => {
      const placa = (reg.placa || '').toUpperCase();
      if (placa && !veiculosMap.has(placa)) {
        veiculosMap.set(placa, {
          modeloCarro: reg.modeloCarro || '',
          cor: reg.cor || '',
          placa: placa,
          certificadoId: reg.certificadoId || '',
          produtosAplicados: reg.produtosAplicados || '',
          serialNumber: reg.serialNumber || '',
          dataAplicacao: reg.dataAplicacao || '',
          localAplicado: reg.localAplicado || ''
        });
      }
    });

    console.log(`Cliente encontrado: ${dadosPessoais.nomeCliente} - ${registros.length} certificado(s), ${veiculosMap.size} veículo(s)`);

    res.json({
      success: true,
      found: true,
      dadosPessoais,
      veiculos: Array.from(veiculosMap.values()),
      totalCertificados: registros.length
    });

  } catch (error) {
    console.error('Erro ao buscar cliente por CPF:', error.message);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Endpoint para buscar veículo pela placa
app.post('/api/buscar-veiculo-por-placa', authenticateToken, async (req, res) => {
  try {
    const { placa } = req.body;
    
    if (!placa) {
      return res.status(400).json({ 
        success: false, 
        message: 'Placa é obrigatória' 
      });
    }
    
    // Validar formato da placa (simples validação)
    const placaValida = /^[A-Za-z]{3}[0-9][A-Za-z0-9][0-9]{2}$/.test(placa.replace(/[^a-zA-Z0-9]/g, ''));
    
    if (!placaValida) {
      return res.status(400).json({ 
        success: false, 
        message: 'Formato de placa inválido. Use o formato ABC1234 ou ABC1D23' 
      });
    }
    
    const resultado = await buscarVeiculoPorPlaca(placa);
    
    if (resultado.sucesso) {
      res.json({
        success: true,
        data: {
          modeloCarro: `${resultado.marca} ${resultado.modelo}`,
          cor: resultado.cor,
          ano: resultado.ano,
          valor: resultado.valor,
          combustivel: resultado.combustivel,
          codigoFipe: resultado.codigoFipe
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: resultado.erro
      });
    }
    
  } catch (error) {
    console.error('Erro no endpoint de busca por placa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao consultar veículo'
    });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Find aplicador by email
    const aplicador = aplicadores.find(app => app.email === email && app.ativo);

    if (!aplicador) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Simple password comparison (in production, use bcrypt)
    if (aplicador.senha !== senha) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: aplicador.id, 
        nome: aplicador.nome, 
        email: aplicador.email,
        telefone: aplicador.telefone || ''
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso!',
      token: token,
      aplicador: {
        id: aplicador.id,
        nome: aplicador.nome,
        email: aplicador.email,
        telefone: aplicador.telefone || ''
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar login'
    });
  }
});

// Protected cadastro endpoint
app.post('/api/cadastro', authenticateToken, upload.single('fotoCarro'), async (req, res) => {
  try {
    const {
      nomeCliente,
      telefone,
      email,
      cpf,
      dataNascimento,
      endereco,
      modeloCarro,
      cor,
      placa,
      produtosAplicados,
      serialNumber,
      dataAplicacao,
      localAplicado,
      estado
    } = req.body;

    // Generate unique certificate ID
    const certificadoId = `IGL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Handle produtosAplicados array
    let produtosAplicadosList = req.body.produtosAplicados;
    if (typeof produtosAplicadosList === 'string') {
      try {
        produtosAplicadosList = JSON.parse(produtosAplicadosList);
      } catch (e) {
        produtosAplicadosList = [produtosAplicadosList];
      }
    }

    // Handle serial numbers (JSON object: product -> serial)
    let serialNumberStr = serialNumber;
    try {
      const serialObj = typeof serialNumber === 'string' ? JSON.parse(serialNumber) : serialNumber;
      if (typeof serialObj === 'object' && serialObj !== null) {
        serialNumberStr = Object.entries(serialObj).map(([prod, sn]) => `${prod}: ${sn}`).join(', ');
      }
    } catch (e) {
      // Keep as-is if not valid JSON
    }

    // Handle file upload - upload to Google Drive
    let fotoCarroUrl = '';
    if (req.file) {
      const localPath = path.join(__dirname, req.file.path);
      const driveUrl = await uploadImageToDrive(localPath, req.file.originalname, certificadoId);
      fotoCarroUrl = driveUrl || '';
    }

    // Prepare data for Google Sheets
    const rowData = [
      certificadoId,
      new Date().toLocaleDateString('pt-BR'),
      nomeCliente,
      cpf,
      dataNascimento,
      telefone,
      email,
      endereco,
      modeloCarro,
      cor,
      placa,
      Array.isArray(produtosAplicadosList) ? produtosAplicadosList.join(', ') : produtosAplicadosList,
      serialNumberStr,
      dataAplicacao,
      localAplicado,
      estado,
      fotoCarroUrl,
      req.user ? req.user.nome : '',
      req.user ? req.user.telefone : ''
    ];

    // Add data to Google Sheets
    const success = await appendToSheet(estado, rowData);

    if (success) {
      res.json({
        success: true,
        message: 'Cadastro realizado com sucesso',
        certificadoId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao salvar dados no Google Sheets'
      });
    }

  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

app.post('/api/buscar-certificados', async (req, res) => {
  try {
    const { cpf, dataNascimento } = req.body;

    if (!cpf || !dataNascimento) {
      return res.status(400).json({
        success: false,
        message: 'CPF e data de nascimento são obrigatórios'
      });
    }

    // Search in single sheet
    const certificados = await searchCertificados(cpf, dataNascimento);

    res.json({
      success: true,
      certificados,
      message: certificados.length === 0 ? 'Nenhum certificado encontrado' : undefined
    });

  } catch (error) {
    console.error('Erro na busca de certificados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Serve static files from React app
const buildPath = path.join(__dirname, 'client/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.warn('⚠️  client/build não encontrado. Execute: npm run build');
  app.get('*', (req, res) => {
    res.status(503).json({ error: 'App em construção. Tente novamente em alguns minutos.' });
  });
}

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  
  // Initialize Google Sheets on startup
  try {
    await initializeSheets();
  } catch (error) {
    console.error('Erro ao inicializar Google Sheets:', error.message);
  }
});
