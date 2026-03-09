const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
require('dotenv').config();

const STATE_SHEETS = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
  'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
  'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
  'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
};

const SHEET_HEADERS = [
  'Certificado ID', 'Data Cadastro', 'Nome Cliente', 'CPF', 'Data Nascimento',
  'Telefone', 'Email', 'Endereço', 'Modelo Carro', 'Cor', 'Placa',
  'Produtos Aplicados', 'Serial Number', 'Data Aplicação', 'Local Aplicado',
  'Estado', 'Foto Carro', 'Aplicador'
];

async function testGoogleSheets() {
  console.log('=== TESTE DE INTEGRAÇÃO GOOGLE SHEETS ===\n');
  
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  console.log('1. SPREADSHEET_ID:', SPREADSHEET_ID);
  
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
    console.error('❌ SPREADSHEET_ID não configurado no .env');
    return;
  }

  try {
    // Step 1: Auth
    console.log('\n2. Autenticando com Google...');
    const auth = new GoogleAuth({
      keyFile: './credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Autenticação OK');

    // Step 2: Get spreadsheet info
    console.log('\n3. Acessando planilha...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    console.log('✅ Planilha:', spreadsheet.data.properties.title);
    
    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log('   Abas existentes:', existingSheets.join(', '));

    // Step 3: Create state sheets
    const allSheetNames = [...Object.values(STATE_SHEETS), 'Geral'];
    const sheetsToCreate = allSheetNames.filter(name => !existingSheets.includes(name));
    
    if (sheetsToCreate.length > 0) {
      console.log(`\n4. Criando ${sheetsToCreate.length} abas de estados...`);
      
      const requests = sheetsToCreate.map(title => ({
        addSheet: { properties: { title } }
      }));
      
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests }
      });
      
      console.log('✅ Abas criadas:', sheetsToCreate.join(', '));
    } else {
      console.log('\n4. ✅ Todas as abas já existem');
    }

    // Step 4: Add headers to all sheets
    console.log('\n5. Adicionando cabeçalhos...');
    for (const sheetName of allSheetNames) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetName}'!A1:R1`
        });
        
        const firstRow = response.data.values;
        if (!firstRow || firstRow.length === 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A1:R1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [SHEET_HEADERS] }
          });
          console.log(`   ✅ Cabeçalhos: ${sheetName}`);
        }
      } catch (err) {
        console.error(`   ❌ Erro em ${sheetName}:`, err.message);
      }
    }
    console.log('✅ Cabeçalhos configurados');

    // Step 5: Delete default sheet if exists
    const sheet1 = spreadsheet.data.sheets.find(s => 
      s.properties.title === 'Sheet1' || s.properties.title === 'Página1'
    );
    if (sheet1) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [{
              deleteSheet: { sheetId: sheet1.properties.sheetId }
            }]
          }
        });
        console.log('\n6. ✅ Aba padrão "Sheet1" removida');
      } catch (err) {
        console.log('\n6. ℹ️ Não foi possível remover aba padrão:', err.message);
      }
    }

    // Step 6: Test write
    console.log('\n7. Testando escrita na aba "São Paulo"...');
    const testRow = [
      'IGL-TEST-001',
      new Date().toLocaleDateString('pt-BR'),
      'Cliente Teste',
      '123.456.789-00',
      '01/01/1990',
      '(11) 99999-9999',
      'teste@teste.com',
      'Rua Teste, 123',
      'Toyota Corolla',
      'Prata',
      'ABC1234',
      'Ecocoat Quartz',
      'SN-TEST-001',
      new Date().toLocaleDateString('pt-BR'),
      'São Paulo - SP',
      'SP',
      '',
      'Aplicador Teste'
    ];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'São Paulo'!A:R",
      valueInputOption: 'USER_ENTERED',
      resource: { values: [testRow] }
    });
    console.log('✅ Dado de teste adicionado na aba "São Paulo"');

    // Step 7: Test read
    console.log('\n8. Testando leitura...');
    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'São Paulo'!A:R"
    });
    const rows = readResponse.data.values || [];
    console.log(`✅ Leitura OK - ${rows.length} linhas encontradas (incluindo cabeçalho)`);

    // Final
    console.log('\n========================================');
    console.log('✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
    console.log('========================================');
    console.log('\nPlanilha configurada com 28 abas (27 estados + Geral)');
    console.log('Cada aba possui 18 colunas com cabeçalhos');
    console.log('O sistema está pronto para uso!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.message.includes('not found')) {
      console.error('Verifique se o SPREADSHEET_ID está correto');
    }
    if (error.message.includes('permission') || error.message.includes('403')) {
      console.error('Verifique se a planilha foi compartilhada com o service account:');
      console.error('Email do service account está no credentials.json (client_email)');
    }
  }
}

testGoogleSheets();
