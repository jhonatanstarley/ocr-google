require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { readFileSync } = require('fs');
const axios = require('axios');
const path = require('path');
const net = require('net');
const { GoogleAuth } = require('google-auth-library');
const morgan = require('morgan');
const debug = require('debug')('app');

const app = express();
const upload = multer({ dest: 'uploads/' });
let PORT = parseInt(process.env.PORT) || 3000;

// Configurando morgan para logar todas as requisições HTTP
app.use(morgan('combined'));

// Verifique se as variáveis de ambiente estão definidas
if (!process.env.PROJECT_ID || !process.env.LOCATION || !process.env.PROCESSOR_ID) {
  debug("Variáveis de ambiente faltando. Certifique-se de que PROJECT_ID, LOCATION e PROCESSOR_ID estão no arquivo .env.");
  process.exit(1);
} else {
  debug("Variáveis de ambiente carregadas com sucesso.");
}

// Configuração do caminho das credenciais
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
debug(`Caminho do arquivo de credenciais: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

// Função para processar documentos usando a API REST do Document AI
const processDocumentREST = async (fileBuffer, mimeType) => {
  const endpoint = `https://${process.env.LOCATION}-documentai.googleapis.com/v1/projects/${process.env.PROJECT_ID}/locations/${process.env.LOCATION}/processors/${process.env.PROCESSOR_ID}:process`;
  
  debug(`Endpoint de processamento de documento: ${endpoint}`);

  const token = await getAccessToken();

  const requestBody = {
    rawDocument: {
      content: fileBuffer.toString('base64'),
      mimeType: mimeType, // Certifique-se de que está correto
    },
    processOptions: {
      ocrConfig: {
        enableImageQualityScores: false, // Avaliação de qualidade da imagem
        enableNativePdfParsing: false, // Habilita parsing de PDF (caso aplique)
        enableSymbol: false, // Habilita reconhecimento de símbolos
        hints: {
          languageHints: ["pt-BR"], // Insira o código da língua para melhorar o OCR
        },
        premiumFeatures: {
          enableSelectionMarkDetection: false, // Detecção de caixas de seleção
          computeStyleInfo: false, // Informações de estilo (fontes, cores, etc.)
        },
        advancedOcrOptions: ["legacy_layout"], // Layout heurístico, se necessário
      },
      individualPageSelector: {
        pages: [1] // Página específica a ser processada
      },
      entityTypes: ["Name", "Date", "Address"] // Entidades para extração
    }
  };  

  debug('Enviando requisição para o Document AI API com o payload:', requestBody);

  try {
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    debug('Resposta recebida do Document AI API:', response.data);
    return response.data;
  } catch (error) {
    debug('Erro ao processar o documento:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    throw new Error('Falha ao processar o documento.');
  }
};

// Função para obter o token de acesso usando a chave JSON diretamente
const getAccessToken = async () => {
  const auth = new GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  debug('Obtendo token de acesso para o Google Cloud API.');

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  
  debug(`Token de acesso obtido: ${tokenResponse.token}`);
  
  return tokenResponse.token;
};

// Rota para servir o index.html
app.get('/', (req, res) => {
  debug('Servindo a página index.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para receber logs do front-end
app.post('/log', express.json(), (req, res) => {
  const logMessage = req.body.message;
  debug('Log do front-end:', logMessage);
  res.status(200).send({ status: 'Log received' });
});

// Rota para upload e processamento
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    debug('Recebendo arquivo para processamento:', req.file);

    const filePath = path.join(__dirname, req.file.path);
    const fileBuffer = readFileSync(filePath);
    const mimeType = req.file.mimetype;

    debug(`Arquivo recebido: ${filePath}, Tipo MIME: ${mimeType}`);

    const document = await processDocumentREST(fileBuffer, mimeType);

    res.json(document);
  } catch (err) {
    debug('Erro ao processar a solicitação:', err);
    res.status(500).json({ error: err.message });
  }
});

// Função para verificar se uma porta está em uso
const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        debug(`Porta ${port} está em uso.`);
        resolve(false); // Porta em uso
      })
      .once('listening', () => {
        server.close(() => {
          debug(`Porta ${port} está livre.`);
          resolve(true); // Porta livre
        });
      })
      .listen(port);
  });
};

// Função para encontrar uma porta livre e iniciar o servidor
const findFreePortAndStartServer = async (port) => {
  const isPortFree = await checkPort(port);
  if (isPortFree) {
    app.listen(port, () => {
      debug(`Servidor rodando na porta ${port}`);
    });
  } else {
    debug(`Tentando próxima porta: ${port + 1}`);
    findFreePortAndStartServer(port + 1); // Tenta a próxima porta
  }
};

// Inicia o servidor na primeira porta livre
findFreePortAndStartServer(PORT);
