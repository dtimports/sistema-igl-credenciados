# Configuração do Google Sheets API

## Passo 1: Criar Projeto Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google Sheets API**:
   - Vá para "APIs & Services" > "Library"
   - Busque por "Google Sheets API"
   - Clique em "Enable"

## Passo 2: Criar Service Account

1. Vá para "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "Service Account"
3. Preencha os dados:
   - Name: "IGL Certificados Service"
   - Description: "Service account para IGL Certificados"
4. Clique em "Create and Continue"
5. Pule a etapa de permissões por enquanto
6. Clique em "Done"

## Passo 3: Gerar Chave JSON

1. Na lista de Service Accounts, clique no criado
2. Vá para "KEYS" tab
3. Clique em "Add Key" > "Create new key"
4. Selecione "JSON" e clique em "Create"
5. O arquivo JSON será baixado automaticamente
6. Renomeie o arquivo para `credentials.json` e coloque na raiz do projeto

## Passo 4: Compartilhar Google Sheets

1. Crie uma nova planilha no Google Sheets
2. Copie o ID da planilha da URL:
   - URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - ID é a parte entre `/d/` e `/edit`
3. Compartilhe a planilha com o email do Service Account:
   - Clique em "Share"
   - Adicione o email do service account (ex: service-account@project.iam.gserviceaccount.com)
   - Dê permissão "Editor"

## Passo 5: Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` com suas informações:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
   SPREADSHEET_ID=SEU_SPREADSHEET_ID_AQUI
   JWT_SECRET=sua_chave_secreta_aqui
   PORT=5003
   ```

## Passo 6: Estrutura da Planilha

Crie abas (sheets) para cada estado com os seguintes cabeçalhos:

| Certificado ID | Data Cadastro | Nome Cliente | CPF | Data Nascimento | Telefone | Email | Endereço | Modelo Carro | Cor | Placa | Produtos Aplicados | Serial Number | Data Aplicação | Local Aplicado | Estado | Foto Carro |
|---------------|---------------|--------------|-----|-----------------|----------|-------|----------|--------------|-----|-------|-------------------|---------------|----------------|---------------|--------|------------|

**Nomes das abas (sheets):**
- Acre, Alagoas, Amapá, Amazonas, Bahia, Ceará, Distrito Federal, Espírito Santo, Goiás, Maranhão, Mato Grosso, Mato Grosso do Sul, Minas Gerais, Pará, Paraíba, Paraná, Pernambuco, Piauí, Rio de Janeiro, Rio Grande do Norte, Rio Grande do Sul, Rondônia, Roraima, Santa Catarina, São Paulo, Sergipe, Tocantins

## Passo 7: Testar a Integração

1. Inicie o servidor:
   ```bash
   npm run server
   ```

2. Faça um cadastro de teste através da aplicação
3. Verifique se os dados aparecem na planilha correta (baseada no estado)

## Troubleshooting

### Erro: "Insufficient Permission"
- Verifique se o service account tem permissão de Editor na planilha
- Verifique se o SPREADSHEET_ID está correto

### Erro: "Authentication failed"
- Verifique se o arquivo credentials.json está no local correto
- Verifique se as variáveis de ambiente estão configuradas

### Erro: "Sheet not found"
- Verifique se os nomes das abas correspondem exatamente aos estados
- Verifique se a planilha existe e está compartilhada

## Segurança

- Nunca compartilhe o arquivo `credentials.json`
- Adicione `credentials.json` ao `.gitignore`
- Use variáveis de ambiente para dados sensíveis
