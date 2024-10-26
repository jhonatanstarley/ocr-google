import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import multer from 'multer';
import { readFileSync } from 'fs';
import axios from 'axios';
import path from 'path';
import net from 'net';
import { GoogleAuth } from 'google-auth-library';
import morgan from 'morgan';
import debug from 'debug';

// Carrega as variáveis de ambiente
dotenv.config();

const log = debug('app');
const app = express();

// Define o caminho absoluto para a pasta uploads na raiz do projeto
const uploadDir = path.resolve(__dirname, '..', 'uploads');
const upload = multer({ dest: uploadDir });
const PORT = parseInt(process.env.PORT || '3000', 10);

// Configura morgan para logar todas as requisições HTTP
app.use(morgan('combined'));

// Verifica as variáveis de ambiente obrigatórias
if (!process.env.PROJECT_ID || !process.env.LOCATION || !process.env.PROCESSOR_ID) {
  log("Variáveis de ambiente faltando. Certifique-se de que PROJECT_ID, LOCATION e PROCESSOR_ID estão no arquivo .env.");
  process.exit(1);
} else {
  log("Variáveis de ambiente carregadas com sucesso.");
}

// Configuração do caminho das credenciais
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS!);
log(`Caminho do arquivo de credenciais: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

// Função para processar documentos usando a API REST do Document AI
const processDocumentREST = async (fileBuffer: Buffer, mimeType: string) => {
  const endpoint = `https://${process.env.LOCATION}-documentai.googleapis.com/v1/projects/${process.env.PROJECT_ID}/locations/${process.env.LOCATION}/processors/${process.env.PROCESSOR_ID}:process`;

  log(`Endpoint de processamento de documento: ${endpoint}`);

  const token = await getAccessToken();

  const requestBody = {
    skipHumanReview: true,
    rawDocument: {
      content: fileBuffer.toString('base64'),
      mimeType: mimeType,
    }
  };

  log('Enviando requisição para o Document AI API com o payload:', requestBody);

  try {
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    log('Resposta recebida do Document AI API:', response.data);
    return response.data;
  } catch (error: any) {
    log('Erro ao processar o documento:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    throw new Error('Falha ao processar o documento.');
  }
};

// Função para obter o token de acesso usando a chave JSON diretamente
const getAccessToken = async (): Promise<string> => {
  const auth = new GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS!,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  log('Obtendo token de acesso para o Google Cloud API.');

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) throw new Error('Token de acesso não obtido.');
  log(`Token de acesso obtido: ${tokenResponse.token}`);
  
  return tokenResponse.token;
};

// Rota para servir o index.html
app.get('/', (req: Request, res: Response) => {
  log('Servindo a página index.html');
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Endpoint para receber logs do front-end
app.post('/log', express.json(), (req: Request, res: Response) => {
  const logMessage = req.body.message;
  log('Log do front-end:', logMessage);
  res.status(200).send({ status: 'Log received' });
});

// Rota para upload e processamento
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) throw new Error("Arquivo não enviado.");
    log('Recebendo arquivo para processamento:', req.file);

    const filePath = path.join(uploadDir, req.file.filename);
    const fileBuffer = readFileSync(filePath);
    const mimeType = req.file.mimetype;

    log(`Arquivo recebido: ${filePath}, Tipo MIME: ${mimeType}`);

    const document = await processDocumentREST(fileBuffer, mimeType);
    res.json(document);
  } catch (err: any) {
    log('Erro ao processar a solicitação:', err);
    res.status(500).json({ error: err.message });
  }
});

// Função para verificar se uma porta está em uso
const checkPort = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        log(`Porta ${port} está em uso.`);
        resolve(false); // Porta em uso
      })
      .once('listening', () => {
        server.close(() => {
          log(`Porta ${port} está livre.`);
          resolve(true); // Porta livre
        });
      })
      .listen(port);
  });
};

// Função para encontrar uma porta livre e iniciar o servidor
const findFreePortAndStartServer = async (port: number): Promise<void> => {
  const isPortFree = await checkPort(port);
  if (isPortFree) {
    app.listen(port, () => {
      log(`Servidor rodando na porta ${port}`);
    });
  } else {
    log(`Tentando próxima porta: ${port + 1}`);
    findFreePortAndStartServer(port + 1);
  }
};

// Inicia o servidor na primeira porta livre
findFreePortAndStartServer(PORT);
