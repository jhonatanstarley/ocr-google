//app.ts
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import multer from 'multer';
import { readFileSync, writeFileSync, unlink } from 'fs';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import path from 'path';
import net from 'net';
import morgan from 'morgan';
import log from 'loglevel';
import { v4 as uuidv4 } from 'uuid';

// Carrega as variáveis de ambiente
dotenv.config();

// Configuração de logs
const logLevels: log.LogLevelDesc[] = ['trace', 'debug', 'info', 'warn', 'error', 'silent'];
const logLevel: log.LogLevelDesc = logLevels.includes(process.env.LOG_LEVEL as log.LogLevelDesc)
  ? (process.env.LOG_LEVEL as log.LogLevelDesc)
  : 'info';
log.setLevel(logLevel);

const app = express();
const uploadDir = path.resolve(__dirname, '../uploads');
const ocrJsonDir = path.resolve(__dirname, '../ocr-json');
const modelsDir = path.resolve(__dirname, '../models');
const upload = multer({ 
  dest: uploadDir, 
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});
const PORT = parseInt(process.env.PORT || '3000', 10);

// Verificação e carregamento das variáveis de ambiente obrigatórias
if (!process.env.PROJECT_ID || !process.env.LOCATION || !process.env.PROCESSOR_ID) {
  log.error("Variáveis de ambiente faltando. Certifique-se de que PROJECT_ID, LOCATION e PROCESSOR_ID estão no arquivo .env.");
  process.exit(1);
} else {
  log.info("Variáveis de ambiente carregadas com sucesso.");
}

// Configuração do caminho das credenciais
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS!);
log.info(`Caminho do arquivo de credenciais: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

// Configuração do cliente Document AI
const client = new DocumentProcessorServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Middleware para servir arquivos estáticos e logar requisições
app.use(express.static(path.join(__dirname, '../public')));
app.use(morgan('combined'));

// Rota para página inicial (index.html)
app.get('/', (req: Request, res: Response) => {
  log.info('Servindo a página index.html');
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Rota para receber logs do front-end
app.post('/log', express.json(), (req: Request, res: Response) => {
  const logMessage = req.body.message || "Nenhum log definido";
  log.info('Log do front-end:', logMessage);
  res.status(200).send({ status: 'Log received' });
});

// Função para processar o documento com Document AI
const processDocument = async (fileBuffer: Buffer, mimeType: string) => {
  const name = `projects/${process.env.PROJECT_ID}/locations/${process.env.LOCATION}/processors/${process.env.PROCESSOR_ID}`;
  const request = {
    name,
    rawDocument: {
      content: fileBuffer.toString('base64'),
      mimeType,
    },
  };

  log.debug('Enviando requisição para o Document AI API com o payload:', request);
  log.info('Iniciando o processamento do documento com Document AI...');
  log.debug(`Tipo de conteúdo: ${mimeType}`);
  
  try {
    const [result] = await client.processDocument(request);
    const { document } = result;

    if (!document || !document.text) {
      log.warn('Processamento concluído, mas o documento não contém texto extraído.');
      throw new Error('Documento processado sem texto extraído.');
    }

    log.info('Processamento concluído com sucesso. Texto extraído.');
    return document.text;
  } catch (error) {
    log.error('Erro ao processar documento com Document AI:', error);
    throw new Error('Falha no processamento OCR');
  }
};

// Função para aplicar o modelo de sanitização
const sanitizeData = (text: string, model: any) => {
  const lines = text.split('\n');
  const structuredData = model.fields.map((field: any) => {
    const value = Array.isArray(field.index)
      ? field.index.map((idx: number) => lines[idx]).join(' ')
      : lines[field.index];
    return {
      field: field.name,
      input: field.split ? value.split(' ')[field.part] : value,
    };
  });
  return { data: structuredData };
};

// Rota de upload e processamento com sanitização
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  let filePath = ''; // Defina filePath no escopo da função para estar acessível no bloco catch
  try {
    if (!req.file || !req.body.documentType) throw new Error("Arquivo ou tipo de documento não enviado. Ou o arquivo excede o tamanho permitido.");
    const documentType = req.body.documentType;
    log.info(`Processando o documento tipo: ${documentType}`);

    const modelPath = path.join(modelsDir, `${documentType}.json`);
    const model = JSON.parse(readFileSync(modelPath, 'utf8'));

    const filePath = path.join(uploadDir, req.file.filename);
    const fileBuffer = readFileSync(filePath);
    const mimeType = req.file.mimetype;

    log.debug(`Arquivo lido do caminho: ${filePath}, Tipo MIME: ${mimeType}`);

    const text = await processDocument(fileBuffer, mimeType);
    const structuredData = sanitizeData(text, model);

    const jsonFileName = `${uuidv4()}.json`;
    const jsonFilePath = path.join(ocrJsonDir, jsonFileName);
    writeFileSync(jsonFilePath, JSON.stringify(structuredData, null, 2));

    // Retorna o texto original e o structuredData
    res.json({ originalText: text, structuredData, jsonFile: jsonFileName });

    // Se tudo der certo, chame deleteFile para limpar o arquivo
    deleteFile(filePath);
  } catch (err: any) {
    log.error('Erro ao processar a solicitação:', err.message);
    deleteFile(filePath); // Chama deleteFile em caso de erro também
    res.status(500).json({ error: err.message });
  }
});

// Função para excluir o arquivo com log de sucesso ou erro
function deleteFile(filePath: string): void {
  unlink(filePath, (err) => {
    if (err) {
      log.error(`Erro ao excluir o arquivo: ${filePath}`, err.message);
    } else {
      log.info(`Arquivo excluído com sucesso: ${filePath}`);
    }
  });
}

// Função para verificar se uma porta está em uso
const checkPort = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        log.warn(`Porta ${port} está em uso.`);
        resolve(false); 
      })
      .once('listening', () => {
        server.close(() => {
          log.info(`Porta ${port} está livre.`);
          resolve(true);
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
      log.info(`Servidor rodando na porta ${port}`);
    });
  } else {
    log.warn(`Tentando próxima porta: ${port + 1}`);
    findFreePortAndStartServer(port + 1);
  }
};

// Inicia o servidor na primeira porta livre
findFreePortAndStartServer(PORT);
