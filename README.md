# Sistema IGL Credenciados

Sistema web para cadastro e visualização de certificados de garantia IGL Coatings Brasil.

## 🚀 Funcionalidades

- **Cadastro de Aplicações**: Formulário completo para aplicadores registrarem dados de clientes e aplicações
- **Consulta de Certificados**: Clientes podem buscar todos os seus certificados usando CPF e data de nascimento
- **Design Moderno**: Interface inspirada no estilo Linktree, responsiva e intuitiva
- **Integração Google Sheets**: Dados organizados automaticamente por estado

## 📋 Estrutura do Projeto

```
sistema-igl-credenciados/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── App.js         # App principal com rotas
│   │   └── App.css        # Estilos globais
│   └── package.json
├── server.js              # Backend Node.js
├── package.json           # Dependências do projeto
├── .env                   # Variáveis de ambiente
└── README.md
```

## 🛠️ Tecnologias

### Frontend
- React 18
- React Router DOM
- Axios (para requisições HTTP)
- CSS3 (design responsivo)

### Backend
- Node.js
- Express.js
- Google Sheets API
- CORS
- UUID (geração de IDs)

## 📱 Páginas

### 1. Página Inicial (`/`)
- Botão "Sou Aplicador" → Página de cadastro
- Botão "Ver Certificado" → Página de busca

### 2. Página de Cadastro (`/cadastro`)
**Dados do Cliente:**
- Nome completo, telefone, email, CPF
- Data de nascimento, endereço, estado

**Dados do Veículo:**
- Modelo, cor, placa

**Dados da Aplicação:**
- Produtos aplicados, data da aplicação, local

### 3. Página de Busca (`/buscar-certificado`)
- Campos CPF e data de nascimento
- Lista todos os certificados encontrados
- Exibe informações detalhadas de cada certificado

## 🔧 Configuração

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Google Sheets API
1. Crie um projeto no Google Cloud Console
2. Habilite Google Sheets API
3. Gere uma API Key
4. Crie uma planilha com abas para cada estado
5. Atualize o arquivo `.env`:
```
GOOGLE_SHEETS_API_KEY=sua_api_key
GOOGLE_SHEETS_SPREADSHEET_ID=id_da_sua_planilha
PORT=5000
```

### 3. Estrutura da Planilha Google Sheets
Crie uma aba para cada estado brasileiro com as seguintes colunas:
- ID Certificado
- Data Cadastro
- Nome Cliente
- CPF
- Data Nascimento
- Telefone
- Email
- Endereço
- Modelo Carro
- Cor
- Placa
- Produtos Aplicados
- Data Aplicação
- Local Aplicado
- Estado

## 🚀 Executar o Projeto

### Modo Desenvolvimento
```bash
npm run dev
```
Isso inicia:
- Backend na porta 5000
- Frontend na porta 3000

### Produção
```bash
npm run build
npm start
```

## 📱 Design Responsivo

O sistema é totalmente responsivo e funciona em:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (até 767px)

## 🔒 Segurança

- Validação de dados no frontend
- Sanitização de inputs
- Configuração CORS segura
- Sem armazenamento de dados sensíveis no código

## 🚀 Deploy

O projeto está pronto para deploy em:
- Vercel (frontend)
- Heroku (backend)
- Netlify (frontend)
- Railway (backend)

## 📞 Suporte

Para dúvidas ou suporte técnico, entre em contato com a equipe IGL Coatings Brasil.

---

© 2024 IGL Coatings Brasil - Todos os direitos reservados
