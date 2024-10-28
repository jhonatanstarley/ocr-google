# OCR-Google

Este projeto implementa um sistema de OCR (Reconhecimento Óptico de Caracteres) utilizando a API do Google Document AI. É capaz de processar documentos de imagem, realizar OCR e extrair texto em português (pt-BR), com funcionalidades de configuração avançadas para adaptação ao tipo de documento. Sugestão: Siga a primeira e segunda etapa que não tem como dar errado, elas estão em referências.

## Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Instalação](#instalação)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Contribuição](#contribuição)
- [Licença](#licença)
- [Referências](#referências)
---

## Sobre o Projeto

Este sistema de OCR foi desenvolvido para processar documentos em imagem, utilizando a API do Google Document AI para reconhecimento e extração de texto. O projeto pode ser configurado para diferentes idiomas e tipos de documento, além de suportar configurações avançadas de OCR.

---

## Tecnologias Utilizadas

- **Node.js** - Ambiente de execução para JavaScript no servidor
- **Express.js** - Framework web para Node.js
- **Google Document AI** - API para reconhecimento óptico de caracteres (OCR)
- **dotenv** - Para gerenciamento de variáveis de ambiente

---

## Pré-requisitos

Antes de iniciar, certifique-se de ter os seguintes requisitos:

- **Node.js** e **npm** instalados
- **Conta no Google Cloud** com acesso à API Document AI
- **Credenciais de serviço** configuradas para autenticação no Google Cloud

---

## Configuração

1. Clone o repositório para o seu ambiente local:
   ```git clone https://github.com/seu-usuario/ocr-google.git```

2. Crie o arquivo .env na raiz do projeto e configure as variáveis de ambiente:

```# Porta na qual a aplicação será executada
PORT=3000

# ID do projeto no Google Cloud
PROJECT_ID=xxxxxxxxxxxx

# Localização do processador de Document AI
LOCATION=us

# ID do processador de Document AI
PROCESSOR_ID=yyyyyyyyyyy

# Caminho para o arquivo de credenciais do Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=./config/chave.json
```

3. Certifique-se de adicionar o arquivo chave.json (credenciais de serviço do Google Cloud) na pasta config/. Este arquivo não deve ser commitado no repositório, então certifique-se de que ele esteja incluído no .gitignore.

## Instalação
Para instalar as dependências do projeto, navegue até a pasta do projeto e execute:

```npm install```

Para iniciar o servidor, execute o comando:
```npm start```
O servidor rodará na porta configurada no .env (padrão: 3000). Para acessar, abra um navegador e vá para http://localhost:3000.

Para iniciar o servidor com log detalhados, execute o comando:
```DEBUG=app npm start```

## Endpoints

### POST `/upload`

Este endpoint permite o envio de um documento para processamento OCR com sanitização de dados.

#### Parâmetros

- **file** (requerido): O arquivo de imagem ou PDF a ser processado. Deve ter no máximo 20MB.
- **documentType** (requerido): Tipo do documento a ser processado. Valores permitidos incluem:
  - `"cin"`
  - `"cnh-antiga"`
  - `"cnh-nova"`
  - `"rg-antigo"`
  - `"rg-novo"`

#### Exemplo de uso com `curl`

```curl -X POST \
     -F "file=@/caminho/para/imagem.jpg" \
     -F "documentType=cnh-nova" \
     http://localhost:3000/upload
```
## Exemplo de uso com Postman:
 - Configure a requisição como POST e use o URL http://localhost:3000/upload.
 - Na aba Body, selecione form-data.
#### Adicione os seguintes campos:
 - file: Escolha o arquivo desejado.
 - documentType: Selecione o tipo de documento, como cnh-nova ou rg-antigo


## Estrutura do Projeto

```ocr-google/
├── config/             # Contém o arquivo de credenciais para o Google Cloud
├── uploads/            # Diretório temporário para uploads de arquivos
├── .env                # Variáveis de ambiente
├── .gitignore          # Arquivos e pastas ignorados pelo Git
├── app.js              # Arquivo principal do servidor
├── package.json        # Configurações do npm e scripts
└── README.md           # Documentação do projeto
```

## Contribuição
Contribuições são bem-vindas! Siga as etapas abaixo para contribuir com o projeto:

- Faça um fork do repositório.
- Crie uma nova branch com sua feature ou correção (```git checkout -b minha-feature```).
- Commit suas mudanças (```git commit -m 'Adiciona nova feature'```).
- Faça o push da branch (```git push origin minha-feature```).
- Abra um Pull Request.

## Licença
Distribuído sob a licença MIT. Consulte LICENSE para mais informações.

## Referências
Para obter mais informações sobre o Google Document AI OCR, consulte a documentação oficial:


- [Documentação do Document AI](https://cloud.google.com/document-ai/docs/setup)
- [1ª Etapa Document AI](https://cloud.google.com/document-ai/docs/create-processor)
- [2ª Etapa Document AI](https://cloud.google.com/document-ai/docs/process-documents-client-libraries)
- [Visão geral do Document AI](https://cloud.google.com/document-ai?hl=pt-BR)

## Contato
Jhonatan Starley Coelho - jhonatanstarley@gmail.com
