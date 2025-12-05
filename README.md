# 🚀  OCR - Backend API

API RESTful desenvolvida com NestJS para processamento de documentos com OCR e interação via IA.

## 📋 Índice

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Executando Localmente](#executando-localmente)
- [Endpoints da API](#endpoints-da-api)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Deploy](#deploy)

---

## 🛠 Tecnologias

### Core
- **[NestJS](https://nestjs.com/)** (v10) - Framework Node.js progressivo
- **[TypeScript](https://www.typescriptlang.org/)** - Superset tipado do JavaScript
- **[Prisma ORM](https://www.prisma.io/)** - ORM moderno para banco de dados
- **[PostgreSQL](https://www.postgresql.org/)** - Banco de dados relacional

### Autenticação & Segurança
- **[Passport JWT](https://www.passportjs.org/)** - Autenticação baseada em tokens
- **[bcrypt](https://www.npmjs.com/package/bcrypt)** - Hash de senhas

### Storage & Arquivos
- **[Oracle Cloud Object Storage](https://www.oracle.com/cloud/storage/)** - Armazenamento em nuvem (S3-compatible)
- **[Multer](https://www.npmjs.com/package/multer)** - Middleware para upload de arquivos

### OCR & IA
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** - Engine OCR (reconhecimento óptico de caracteres)
- **[OpenAI API](https://platform.openai.com/)** - GPT-4o-mini para análise de documentos

### Geração de Documentos
- **[PDFKit](https://pdfkit.org/)** - Geração de PDFs

---

## 🏗 Arquitetura

### Padrão de Camadas

```
┌─────────────────────────────────────────────┐
│           Cliente (Frontend)                │
└──────────────────┬──────────────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────────────┐
│            Controllers                      │
│  (Rotas e validação de entrada)            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│             Services                        │
│  (Lógica de negócio)                       │
└──────┬─────────┬──────────┬─────────────────┘
       │         │          │
   ┌───▼───┐ ┌──▼────┐ ┌───▼──────┐
   │Prisma │ │Storage│ │OCR/LLM   │
   │  ORM  │ │Service│ │Services  │
   └───┬───┘ └──┬────┘ └───┬──────┘
       │        │           │
   ┌───▼────┐ ┌─▼────────┐ │
   │PostgeSQL│ │Oracle    │ │
   │         │ │Cloud     │ │
   └─────────┘ └──────────┘ │
                             │
                    ┌────────▼────────┐
                    │ OpenAI API      │
                    │ Tesseract OCR   │
                    └─────────────────┘
```

### Módulos Principais

1. **Auth Module** - Autenticação JWT
2. **Users Module** - Gerenciamento de usuários
3. **Documents Module** - Upload e gerenciamento de documentos
4. **OCR Module** - Processamento de texto em imagens
5. **LLM Module** - Interação com IA (perguntas e respostas)
6. **Storage Module** - Armazenamento de arquivos (local ou Oracle Cloud)

---

## ✨ Funcionalidades

### Autenticação
- [x] Registro de usuários com hash bcrypt
- [x] Login com JWT (token expira em 7 dias)
- [x] Proteção de rotas com Guards

### Documentos
- [x] Upload de imagens (JPG, PNG) e PDFs
- [x] Validação de tipo e tamanho (max 10MB)
- [x] Storage configurável (local ou Oracle Cloud)
- [x] Listagem de documentos por usuário
- [x] Visualização de documento individual
- [x] Exclusão com cleanup de arquivos

### OCR (Reconhecimento de Texto)
- [x] Processamento assíncrono com Tesseract
- [x] Suporte a português e inglês
- [x] Status de processamento (PROCESSING, COMPLETED, FAILED)
- [x] Extração de texto de notas fiscais

### IA (Large Language Model)
- [x] Perguntas sobre documentos processados
- [x] Histórico de conversas persistido
- [x] Resumo automático de documentos
- [x] Contexto mantido entre perguntas

### Download
- [x] Exportação em PDF (documento + texto + conversas)
- [x] Exportação em JSON estruturado
- [x] Formatação profissional

---

## 📦 Pré-requisitos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 14.x (ou Docker)
- **Conta Oracle Cloud** (para storage em produção)
- **Chave API OpenAI** (para funcionalidades de IA)

---

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/-ocr-api.git
cd -ocr-api
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o PostgreSQL

**Opção A: Docker (Recomendado)**

```bash
docker run --name -postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=_ocr \
  -p 5432:5432 \
  -d postgres:15
```

**Opção B: PostgreSQL Local**

Crie um banco de dados chamado `_ocr` no seu PostgreSQL local.

### 4. Configure variáveis de ambiente

Copie o arquivo de exemplo e edite com suas credenciais:

```bash
cp .env.example .env
```

### 5. Execute as migrações do Prisma

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## ⚙️ Configuração

### Arquivo `.env`

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ocr?schema=public"

# JWT
JWT_SECRET="sua-chave-secreta-super-segura-aqui"
JWT_EXPIRES_IN="7d"

# Storage (escolha: "local" ou "oracle")
STORAGE_TYPE="local"
UPLOAD_PATH="./uploads"

# Oracle Cloud (apenas se STORAGE_TYPE=oracle)
ORACLE_REGION="sa-saopaulo-1"
ORACLE_NAMESPACE="seu-namespace"
ORACLE_BUCKET_NAME="ocr-uploads"
ORACLE_ACCESS_KEY="sua-access-key"
ORACLE_SECRET_KEY="sua-secret-key"

# OpenAI
GEMINI_API_KEY="sk-proj-sua-chave-aqui"
GEMINI_MODEL="gpt-4o-mini"

# App
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

### Gerar JWT Secret Seguro

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Obter Credenciais Oracle Cloud

1. Acesse [Oracle Cloud Console](https://cloud.oracle.com)
2. Vá em **Storage** → **Buckets** → **Create Bucket**
3. Nome: `ocr-uploads`, Visibility: **Public**
4. Em **Identity & Security** → **Users** → seu usuário
5. Crie **Customer Secret Key**
6. Copie: **Namespace**, **Region**, **Access Key**, **Secret Key**

### Obter Chave Gemini 

1. Acesse a plataforma de API do gemini e siga os passos.
2. Utilize o modelo gratuito gemini-2.0-flash

---

## 🚀 Executando Localmente

## Inicializar o docker 

docker compose up -d 

### Modo Desenvolvimento (com hot-reload)

```bash
npm run start:dev
```

A API estará disponível em: **http://localhost:3001/api**

### Modo Produção

```bash
npm run build
npm run start:prod
```

### Verificar Status

```bash
curl http://localhost:3001/api/auth/me
# Deve retornar 401 (não autenticado) - significa que está funcionando
```

---

## 📡 Endpoints da API

### Autenticação

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/auth/register` | Registrar novo usuário | Não |
| POST | `/api/auth/login` | Login (retorna JWT) | Não |
| GET | `/api/auth/me` | Dados do usuário autenticado | Sim |

### Documentos

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/documents/upload` | Upload de documento | Sim |
| GET | `/api/documents` | Listar documentos do usuário | Sim |
| GET | `/api/documents/:id` | Ver documento específico | Sim |
| GET | `/api/documents/:id/status` | Status do processamento OCR | Sim |
| GET | `/api/documents/:id/download` | Download em PDF/JSON | Sim |
| DELETE | `/api/documents/:id` | Excluir documento | Sim |

### IA (LLM)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/llm/ask` | Fazer pergunta sobre documento | Sim |
| GET | `/api/llm/conversations/:documentId` | Histórico de conversas | Sim |
| POST | `/api/llm/summarize/:documentId` | Gerar resumo do documento | Sim |

### Exemplos de Uso

**Registrar usuário:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@email.com",
    "password": "senha123",
    "name": "Nome do Usuário"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@email.com",
    "password": "senha123"
  }'
```

**Upload de documento:**
```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -F "file=@/caminho/para/nota_fiscal.jpg"
```

**Fazer pergunta:**
```bash
curl -X POST http://localhost:3001/api/llm/ask \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "uuid-do-documento",
    "question": "Qual o valor total desta nota fiscal?"
  }'
```

---

## 📁 Estrutura do Projeto

```
src/
├── main.ts                  # Entry point
├── app.module.ts            # Módulo raiz
│
├── auth/                    # Autenticação
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   └── dto/
│       ├── register.dto.ts
│       └── login.dto.ts
│
├── users/                   # Gerenciamento de usuários
│   ├── users.module.ts
│   └── users.service.ts
│
├── documents/               # Documentos
│   ├── documents.module.ts
│   ├── documents.controller.ts
│   ├── documents.service.ts
│   ├── download.service.ts
│   └── dto/
│       └── upload-document.dto.ts
│
├── ocr/                     # OCR (Tesseract)
│   ├── ocr.module.ts
│   └── ocr.service.ts
│
├── llm/                     # IA (OpenAI)
│   ├── llm.module.ts
│   ├── llm.controller.ts
│   ├── llm.service.ts
│   └── dto/
│       └── ask-question.dto.ts
│
├── storage/                 # Armazenamento
│   ├── storage.module.ts
│   └── storage.service.ts
│
└── prisma/                  # Database
    ├── prisma.module.ts
    ├── prisma.service.ts
    └── schema.prisma
```

---

## 🔍 Prisma Schema

```prisma
model User {
  id        String     @id @default(uuid())
  email     String     @unique
  password  String
  name      String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  documents Document[]
}

model Document {
  id              String         @id @default(uuid())
  userId          String
  originalName    String
  storageUrl      String
  mimeType        String
  fileSize        Int
  status          DocumentStatus @default(PROCESSING)
  extractedText   String?        @db.Text
  processingError String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversations Conversation[]
}

enum DocumentStatus {
  PROCESSING
  COMPLETED
  FAILED
}

model Conversation {
  id         String   @id @default(uuid())
  documentId String
  messages   Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}
```


---

## 🐛 Troubleshooting

### Erro: "Can't reach database server"

```bash
# Verificar se PostgreSQL está rodando
docker ps

# Reiniciar container
docker restart -postgres

# Verificar logs
docker logs -postgres
```

### Erro: "Tesseract worker not initialized"

```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Erro: "OCR muito lento"

- Use imagens menores (max 2MB recomendado)
- Considere Google Cloud Vision API para OCR mais rápido
- Em produção, use filas (Bull/BullMQ) para processar em background

### Erro: "OpenAI rate limit"

- Verifique se tem créditos na conta
- Adicione retry logic com backoff exponencial
- Use cache para respostas repetidas

---

## 📄 Licença

MIT

---


---

## 🔗 Links Úteis

- [Documentação NestJS](https://docs.nestjs.com)
- [Documentação Prisma](https://www.prisma.io/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Tesseract.js](https://github.com/naptha/tesseract.js)
- [Oracle Cloud Storage](https://docs.oracle.com/en-us/iaas/Content/Object/home.html)

ENV 
# Storage - LOCAL 
STORAGE_TYPE="local"
UPLOAD_PATH="./uploads"

# Storage - WEB
STORAGE_TYPE="oracle"

# Oracle Cloud Object Storage
ORACLE_REGION="region"           
ORACLE_NAMESPACE="namespace"    
ORACLE_BUCKET_NAME="bucketname"   
ORACLE_ACCESS_KEY="access-key"      
ORACLE_SECRET_KEY="secret-key"       



-------------------------

### Deprecated README Below 

docker exec -it postgres psql -U postgres -d bd


### Configuração

**Local (desenvolvimento):**

docker env

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bd"

```env
STORAGE_TYPE=local

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""  # vazio se não tiver senha
```

**Produção:**
```env
STORAGE_TYPE=oracle
ORACLE_REGION=sa-saopaulo-1
ORACLE_NAMESPACE=...
ORACLE_BUCKET_NAME=-ocr-uploads

```

# install Redis Local 

docker run --name -redis -p 6379:6379 -d redis:7-alpine

