# AI-Driven Knowledge Management & Assessment Platform
## Build System & Deployment — Technical Reference Document

**Version:** 1.0  
**Date:** 2026-05-13  
**Repository:** KNOWLEDGE_MNG_HACKATHON  
**Audience:** Japanese Technical Managers / Internal AI Competition Reviewers  
**Language:** English  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Build System](#4-build-system)
5. [Deployment](#5-deployment)
6. [Repository Structure](#6-repository-structure)
7. [Main Features](#7-main-features)
8. [Challenges and Improvements](#8-challenges-and-improvements)
9. [Conclusion](#9-conclusion)

---

## 1. Project Overview

### 1.1 Purpose of the System

The **AI-Driven Knowledge Management & Assessment Platform** is a web application that transforms internal company documents into AI-generated, shareable multiple-choice quizzes. Knowledge managers upload documentation, and the system automatically produces a randomized quiz accessible through a public URL — no authentication required for participants.

The platform is designed for internal training, compliance verification, and onboarding assessments.

### 1.2 Main Business Value

| Value | Description |
|---|---|
| **Automated quiz creation** | Eliminates manual question-writing effort |
| **Lightweight deployment** | Self-contained Docker stack — no external SaaS dependency |
| **Frictionless participation** | Public links; no login required for quiz takers |
| **Anti-cheating randomization** | Each participant receives a unique question subset and option order |
| **Measurable outcomes** | Analytics dashboard tracks scores, accuracy per question, and pass rates |
| **Low AI cost** | ~$0.005 per quiz generation on primary model; ~$0.05 worst case |

### 1.3 AI-Related Features

- **Automatic question generation** from PDF, DOCX, Markdown, plain text, CSV, and HTML files
- **Dual-model strategy**: fast/low-cost primary model with automatic fallback to a higher-capability model on validation failure
- **Source-grounded prompting**: questions anchored strictly to uploaded document content
- **Token-aware text chunking**: accurate token boundary management via `tiktoken`
- **Zod-validated AI output**: every AI response is structurally validated before persistence
- **Seeded deterministic randomization**: reproducible question/option ordering per session

---

## 2. System Architecture

### 2.1 High-Level Architecture

```mermaid
graph TB
    subgraph Client["Browser (Client)"]
        UI[Next.js React UI\nTailwind CSS + shadcn/ui]
    end

    subgraph Server["Docker Container — quiz-app (Node 22)"]
        APP[Next.js 16 App Router\nRSC + Route Handlers]
        SVC[Service Layer\nlib/services/]
        AI[AI Module\nlib/ai/]
        PARSER[Document Parsers\nlib/parsers/]
        RNG[Randomization Engine\nlib/randomization/]
    end

    subgraph Data["Docker Container — quiz-postgres"]
        DB[(PostgreSQL 16\nPrisma ORM)]
    end

    subgraph External["External Services"]
        LLM[Anthropic Claude API\nHaiku-4-5 / Sonnet-4-6]
        SUP[Supabase Storage\nOptional]
        DISK[Local Disk\n.uploads/ Fallback]
    end

    UI -->|HTTP/HTTPS| APP
    APP --> SVC
    SVC --> AI
    SVC --> PARSER
    SVC --> RNG
    SVC -->|Prisma| DB
    AI -->|API Call| LLM
    PARSER -->|Upload| SUP
    PARSER -->|Fallback| DISK
```

### 2.2 Component Responsibilities

| Layer | Module | Responsibility |
|---|---|---|
| **UI** | `app/**/page.tsx`, `components/` | Routing, RSC data fetching, client forms, toasts |
| **API** | `app/api/**/route.ts` | Parse request, validate via Zod, dispatch to service, map errors |
| **Service** | `lib/services/*` | Orchestration: parse → AI → persist; randomize; grade |
| **AI** | `lib/ai/*` | LLM client, chunking, prompts, JSON validation, retry logic |
| **Parsers** | `lib/parsers/*` | Format-specific text extraction (PDF, DOCX, MD, CSV, HTML) |
| **Randomization** | `lib/randomization/*` | Seeded question selection + option shuffle |
| **Data** | `lib/db/*` + `prisma/*` | Prisma client singleton, repository pattern |
| **Validation** | `lib/schemas/*` | Zod schemas shared by API and AI output |
| **Config** | `lib/config/env.ts` | Type-safe env var validation at boot |

### 2.3 Request Flow — Manager Creates a Quiz

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js Route Handler
    participant Service as Service Layer
    participant AI as Anthropic Claude
    participant DB as PostgreSQL
    participant Storage as File Storage

    Browser->>NextJS: POST /api/documents (multipart)
    NextJS->>Service: validateAndUpload()
    Service->>Storage: Upload file buffer
    Storage-->>Service: storagePath
    Service->>Service: Extract text (pdf-parse / mammoth / utf-8)
    Service->>DB: INSERT documents row
    DB-->>Browser: 201 { documentId, charCount }

    Browser->>NextJS: POST /api/quizzes { documentIds[], questionCount }
    NextJS->>Service: generateQuiz()
    Service->>Service: Chunk text (~12,000 chars/chunk, max 8 chunks)
    Service->>AI: Promise.all — Haiku-4-5 per chunk (temp=0.4)
    AI-->>Service: JSON questions array
    Service->>Service: Zod validate; retry with Sonnet-4-6 on failure
    Service->>DB: INSERT quiz + questions + options (transaction)
    DB-->>Browser: 201 { publicToken, resultsToken }
```

### 2.4 Request Flow — Participant Takes a Quiz

```mermaid
sequenceDiagram
    participant Participant
    participant NextJS as Next.js Server
    participant DB as PostgreSQL

    Participant->>NextJS: GET /q/{publicToken}
    NextJS->>DB: Load quiz + question bank
    NextJS->>NextJS: Create session (seeded shuffle)\nSelect N from bank, shuffle options
    NextJS-->>Participant: Quiz page (NO isCorrect in payload)

    Participant->>NextJS: POST /api/attempts\n{ sessionToken, identifier, answers[] }
    NextJS->>DB: Validate questionIds belong to quiz
    NextJS->>DB: Join selectedOptionId → isCorrect → score
    NextJS->>DB: INSERT attempt + attempt_answers (transaction)
    DB-->>Participant: 201 { score, total, identifier }
```

### 2.5 Database Entity Relationship

```mermaid
erDiagram
    documents {
        int id PK
        string filename
        string mimeType
        string storagePath
        text textContent
        int charCount
        datetime createdAt
    }
    quizzes {
        int id PK
        int documentId FK
        string publicToken UK
        string resultsToken UK
        int questionCount
        int[] sourceDocumentIds
        datetime createdAt
    }
    questions {
        int id PK
        int quizId FK
        text text
        text explanation
        string difficulty
        int orderIndex
    }
    options {
        int id PK
        int questionId FK
        text text
        bool isCorrect
        int orderIndex
    }
    attempts {
        int id PK
        int quizId FK
        string identifier
        int score
        int totalQuestions
        datetime submittedAt
    }
    attempt_answers {
        int id PK
        int attemptId FK
        int questionId FK
        int selectedOptionId FK
        bool isCorrect
    }
    quiz_sessions {
        string id PK
        int quizId FK
        string sessionToken UK
        json payload
        datetime expiresAt
        datetime completedAt
    }

    documents ||--o{ quizzes : "generates"
    quizzes ||--o{ questions : "contains"
    questions ||--o{ options : "has"
    quizzes ||--o{ attempts : "receives"
    attempts ||--o{ attempt_answers : "records"
    quizzes ||--o{ quiz_sessions : "sessions"
```

### 2.6 Deployment Structure

```mermaid
graph LR
    subgraph VPS["VPS / Local Server"]
        subgraph Docker["Docker Compose Network: quiz-network"]
            APP["quiz-app\nNext.js 16\nPort: 3000\nNode 22 Alpine"]
            PG["quiz-postgres\nPostgreSQL 16\nPort: 5432\n(internal only)"]
            VOL1[("postgres_data\nvolume")]
            VOL2[("app_uploads\nvolume")]
        end
        RP["Nginx Reverse Proxy\n(optional)\nPort 80/443"]
    end

    subgraph External["External"]
        CLAUDE["Anthropic Claude API\nHaiku-4-5 / Sonnet-4-6"]
        SUPABASE["Supabase Storage\n(optional)"]
    end

    Internet --> RP --> APP
    APP --> PG
    PG --> VOL1
    APP --> VOL2
    APP -->|ANTHROPIC_API_KEY| CLAUDE
    APP -.->|Optional| SUPABASE
```

---

## 3. Technology Stack

### 3.1 Summary Table

| Category | Technology | Version | Role |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 16.x | Full-stack — UI + API in single codebase |
| **Runtime** | Node.js | 22 (Alpine) | Server runtime inside Docker |
| **Language** | TypeScript | 5.x | End-to-end type safety |
| **UI Library** | React | 19.x | Component model |
| **Styling** | TailwindCSS v4 + shadcn/ui | 4.x | Utility-first CSS + accessible primitives |
| **ORM** | Prisma | 7.x | Type-safe database client + migrations |
| **Database** | PostgreSQL | 16 | Relational storage |
| **AI Provider** | Anthropic Claude | SDK 0.95.1 | Question generation |
| **AI Models** | claude-haiku-4-5 (primary)\nclaude-sonnet-4-6 (fallback) | — | Fast/cost-efficient → high-capability fallback |
| **PDF Parsing** | pdf-parse | ^2.4.5 | Text extraction from PDF |
| **DOCX Parsing** | mammoth | ^1.12.0 | Text extraction from Word documents |
| **Tokenization** | tiktoken | ^1.0.22 | Accurate token counting for LLM chunking |
| **Validation** | Zod | — | Runtime validation for API + AI output |
| **Forms** | react-hook-form | — | Client-side form management |
| **Notifications** | sonner | ^2.0.7 | Toast notifications |
| **Public IDs** | @paralleldrive/cuid2 | — | URL-safe tokens (~144-bit entropy) |
| **Env Validation** | @t3-oss/env-nextjs | — | Build-time env var validation |
| **Package Manager** | pnpm | — | Fast, disk-efficient package management |
| **Containerization** | Docker + Docker Compose | v20.10+ / v2.0+ | Self-contained deployment |
| **File Storage** | Local disk (primary)\nSupabase Storage (optional) | — | Uploaded document storage |

### 3.2 AI Technology Detail

```mermaid
flowchart LR
    DOC[Document Text] --> CHUNK[Text Chunker\ntiktoken ~12,000 chars/chunk\nmax 8 chunks]
    CHUNK --> PARALLEL["Promise.all\n(parallel API calls)"]
    PARALLEL --> HAIKU["claude-haiku-4-5\ntemp=0.4, max_tokens=4096\nJSON mode"]
    HAIKU --> ZOD{Zod\nValidation}
    ZOD -- Valid --> SAVE[Persist to DB]
    ZOD -- Invalid --> SONNET["claude-sonnet-4-6\n(fallback, one retry)"]
    SONNET --> ZOD2{Zod\nValidation}
    ZOD2 -- Valid --> SAVE
    ZOD2 -- Invalid --> ERR["502 AI_GEN_FAILED"]
```

---

## 4. Build System

### 4.1 Required Environment

| Requirement | Minimum Version | Purpose |
|---|---|---|
| Docker | v20.10+ | Container runtime |
| Docker Compose | v2.0+ | Multi-container orchestration |
| Linux OS (recommended) | Ubuntu 20.04 LTS / CentOS 8+ | Production server OS |
| Anthropic API Key | — | AI question generation |
| Node.js + pnpm | Node 22 / pnpm latest | Local development only |

### 4.2 Prerequisites

**For Docker-based deployment (recommended):**
```bash
# Install Docker (Ubuntu)
sudo apt-get install -y docker.io
sudo systemctl enable docker && sudo systemctl start docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group (no sudo required)
sudo usermod -aG docker $USER && newgrp docker
```

**For local development:**
```bash
# Node.js 22 (via nvm recommended)
nvm install 22 && nvm use 22

# pnpm
npm install -g pnpm
```

### 4.3 Installation Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd QUIZ_KNOWLEDGE_SDD_HACKATHON/quiz-knowledge

# 2. Copy environment file
cp .env.docker .env.local

# 3. Edit .env.local — fill in required secrets (see section 4.4)
nano .env.local

# 4. (Optional) Create local upload directory
mkdir -p .uploads
```

### 4.4 Environment Variables

#### Required Variables

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_USER` | Yes | PostgreSQL username (e.g., `quizuser`) |
| `POSTGRES_PASSWORD` | Yes | Strong password for production |
| `POSTGRES_DB` | Yes | Database name (e.g., `quiz_db`) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key |
| `NODE_ENV` | Yes | `production` or `development` |

#### Auto-Composed Variables (Docker)

| Variable | Value in Docker | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@postgres:5432/db?pgbouncer=true&connection_limit=1` | Auto-composed from `POSTGRES_*` |
| `DIRECT_URL` | `postgresql://user:pass@postgres:5432/db` | Used by Prisma migrations |

#### Optional Variables

| Variable | Default | Description |
|---|---|---|
| `SUPABASE_URL` | — | Enable Supabase Storage (leave empty for local disk) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Required when `SUPABASE_URL` is set |
| `SUPABASE_STORAGE_BUCKET` | `quiz-assets` | Storage bucket name |
| `LOCAL_STORAGE_DIR` | `.uploads` | Local file storage fallback path |
| `QUESTION_BANK_MULTIPLIER` | `2` | Generates N×multiplier questions; randomizes selection |
| `PORT` | `3000` | Application listening port |

#### Example `.env.local` for Docker deployment

```env
# PostgreSQL
POSTGRES_USER=quizuser
POSTGRES_PASSWORD=ChangeMe_StrongPassword123!
POSTGRES_DB=quiz_db

# AI
ANTHROPIC_API_KEY=sk-ant-...your-key-here...

# Application
NODE_ENV=production

# Storage (optional — remove these lines to use local disk)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4.5 Build Commands

#### Docker Build (Production)

```bash
# Build Docker image (inside quiz-knowledge/ directory)
docker-compose build

# Build output (~5-10 minutes on first run):
# [+] Building 157.3s (18/18) FINISHED
#  => [app] exporting to image
#  => naming to docker.io/library/quiz-knowledge-app:latest
```

#### Local Development Build

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev

# Type-check
pnpm tsc --noEmit

# Lint
pnpm lint
```

### 4.6 Run Commands

#### Docker (Production)

```bash
# Start all services in background
docker-compose up -d

# Combined build + start
docker-compose up -d --build

# View live logs
docker-compose logs -f app
docker-compose logs -f postgres
```

#### Local Development

```bash
# Start dev server with hot reload
pnpm dev
# → http://localhost:3000
```

### 4.7 Docker Usage

#### Docker Architecture (Multi-Stage Build)

```mermaid
graph TB
    subgraph Dockerfile["Dockerfile — Multi-Stage Build"]
        B1["Stage 1: Builder\nnode:22-alpine\nInstall pnpm\nRun prisma generate\nRun next build"]
        B2["Stage 2: Runtime\nnode:22-alpine\nCopy /app/.next from builder\nNon-root user: nextjs:1001\ndumb-init signal handler"]
    end
    B1 --> B2
    B2 --> IMG["Final Image\n~minimal footprint"]
```

#### docker-compose.yml Services

```yaml
# Services summary (from docker-compose.yml)
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB }
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck: pg_isready -U ${POSTGRES_USER}

  app:
    build: .
    ports: ["3000:3000"]
    depends_on: { postgres: { condition: service_healthy } }
    environment: { DATABASE_URL, DIRECT_URL, ANTHROPIC_API_KEY, ... }
    volumes: [app_uploads:./.uploads, app_logs:/app/logs]
    restart: unless-stopped
    healthcheck: curl -f http://localhost:3000/api/health
```

**Startup sequence:** Postgres must pass health check before the app starts. At startup, the app container runs `prisma db push` (schema sync) then `pnpm start`.

### 4.8 Local Development Flow

```mermaid
flowchart LR
    A[Clone repo] --> B[pnpm install]
    B --> C[cp .env.docker .env.local\nFill secrets]
    C --> D[pnpm prisma migrate dev\nCreate tables]
    D --> E[pnpm dev\nlocalhost:3000]
    E --> F{Code change}
    F --> G[Hot reload]
    G --> F
    F --> H[Schema change?]
    H --> I[pnpm prisma migrate dev\n--name change-name]
    I --> E
```

---

## 5. Deployment

### 5.1 Deployment Architecture

The system is deployed as a **self-hosted Docker Compose stack** on a Linux VPS or local server. No cloud platform (Vercel, AWS, GCP) is required.

```
Internet
    │
    ▼
[Nginx Reverse Proxy] (optional, recommended for HTTPS/domain)
    │ port 80/443
    ▼
[Docker: quiz-app] ←────────────────── [Anthropic Claude API]
    │ port 3000           HTTPS
    │
    ▼
[Docker: quiz-postgres]
    │
    ▼
[Volume: postgres_data]  ← persistent database storage
```

### 5.2 Hosting Environment

| Component | Specification |
|---|---|
| **OS** | Ubuntu 20.04 LTS (recommended) / CentOS 8+ |
| **Runtime** | Docker + Docker Compose |
| **App container** | Node.js 22 Alpine (Next.js 16) |
| **DB container** | PostgreSQL 16 Alpine |
| **Port exposed** | 3000 (mapped from container) |
| **Recommended VPS** | 2 vCPU, 2 GB RAM minimum |

### 5.3 Runtime Configuration

**Container startup sequence:**
1. `quiz-postgres` starts; health check polls `pg_isready` every 5 seconds
2. `quiz-app` starts only after Postgres is healthy
3. App container runs: `prisma db push` (schema sync) → `pnpm start`
4. Next.js production server listens on port 3000

**Persistent storage:**
- `postgres_data` volume — database files survive container restarts
- `app_uploads` volume — uploaded files (when using local storage)
- `app_logs` volume — application log output

### 5.4 Access URL

| Environment | URL |
|---|---|
| Local Docker | `http://localhost:3000` |
| VPS (direct) | `http://<server-ip>:3000` |
| VPS (with Nginx) | `https://your-domain.com` |

**Key application paths:**

| Path | Purpose | Audience |
|---|---|---|
| `/` | Landing page | All users |
| `/manager/new` | Upload documents, generate quiz | Manager |
| `/q/{publicToken}` | Take quiz | Participants |
| `/q/{publicToken}/done` | Score result | Participants |
| `/results/{resultsToken}` | Analytics dashboard | Manager |

### 5.5 Full Deployment Workflow

```bash
# Step 1: Clone and configure
git clone <repo-url>
cd QUIZ_KNOWLEDGE_SDD_HACKATHON/quiz-knowledge
cp .env.docker .env.local
# Edit .env.local: set POSTGRES_PASSWORD, ANTHROPIC_API_KEY

# Step 2: Build images
docker-compose build
# Expected: ~5-10 minutes

# Step 3: Start all services
docker-compose up -d

# Step 4: Verify health
docker-compose ps
# Expected output:
# quiz-postgres   Up (healthy)
# quiz-app        Up (healthy)

# Step 5: Access application
# http://<server-ip>:3000
```

### 5.6 Application Update Workflow

```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
docker-compose up -d --build

# Schema changes are applied automatically at startup (prisma db push)

# Monitor logs
docker-compose logs -f app
```

### 5.7 CI/CD

> **Note:** No automated CI/CD pipeline is configured in this project. Deployments are performed manually via the commands above. Adding GitHub Actions or GitLab CI is identified as a future improvement.

**Current deployment model:** Manual → Push to VPS → `docker-compose up -d --build`

---

## 6. Repository Structure

```
QUIZ_KNOWLEDGE_SDD_HACKATHON/               ← Workspace root
├── quiz-knowledge/                          ← Main application (Next.js)
│   ├── src/
│   │   ├── app/                            ← Next.js App Router
│   │   │   ├── layout.tsx                  ← Root layout (Geist font, Sonner toasts)
│   │   │   ├── page.tsx                    ← Landing page → redirects to /manager
│   │   │   ├── manager/
│   │   │   │   └── new/                    ← Document upload & quiz generation UI
│   │   │   ├── q/[publicToken]/            ← Quiz taking (public)
│   │   │   │   └── done/                   ← Score result page
│   │   │   ├── quiz/[token]/               ← Quiz engine (session-based)
│   │   │   ├── results/[token]/            ← Analytics dashboard
│   │   │   └── api/                        ← REST API endpoints
│   │   │       ├── documents/              ← POST: upload & parse file
│   │   │       ├── quizzes/                ← POST: generate quiz
│   │   │       │   └── [publicToken]/
│   │   │       │       └── session/        ← Session management
│   │   │       ├── attempts/               ← POST: submit quiz answers
│   │   │       └── analytics/[token]/      ← GET: results analytics
│   │   ├── components/
│   │   │   ├── ui/                         ← shadcn/ui primitives
│   │   │   ├── quizzes/                    ← QuizEngine, QuestionCard, GenerationProgress
│   │   │   └── results/                    ← StatsCards, SubmissionsTable, QuestionAccuracyList
│   │   ├── lib/
│   │   │   ├── ai/                         ← LLM integration
│   │   │   │   ├── client.ts               ← Anthropic SDK singleton
│   │   │   │   ├── chunker.ts              ← tiktoken text chunking
│   │   │   │   ├── prompts.ts              ← System & user prompt templates
│   │   │   │   └── generateQuestions.ts    ← Orchestration: chunk → call → validate
│   │   │   ├── parsers/                    ← Document text extraction
│   │   │   │   ├── pdf.ts                  ← pdf-parse
│   │   │   │   ├── docx.ts                 ← mammoth
│   │   │   │   ├── markdown.ts             ← UTF-8 + front-matter strip
│   │   │   │   └── index.ts                ← Dispatch by MIME type
│   │   │   ├── services/                   ← Business logic orchestration
│   │   │   │   ├── documents.ts            ← Upload → parse → persist pipeline
│   │   │   │   ├── quizzes.ts              ← Quiz generation from multi-doc input
│   │   │   │   └── quizSessions.ts         ← Session creation with randomization
│   │   │   ├── storage/
│   │   │   │   ├── upload.ts               ← Supabase or local disk upload
│   │   │   │   └── supabase.ts             ← Supabase Storage client
│   │   │   ├── db/
│   │   │   │   └── prisma.ts               ← Prisma client singleton
│   │   │   ├── schemas/                    ← Zod schemas (API + AI output)
│   │   │   ├── config/
│   │   │   │   └── env.ts                  ← Type-safe env validation
│   │   │   └── errors.ts                   ← AppError class + error codes
│   │   └── services/
│   │       ├── attempt/                    ← Submit, validate, score attempts
│   │       ├── analytics/                  ← Aggregation queries
│   │       └── scoring/                    ← Per-question grading logic
│   ├── prisma/
│   │   └── schema.prisma                   ← Database schema (8 models)
│   ├── Dockerfile                          ← Multi-stage production build
│   ├── docker-compose.yml                  ← Postgres + App services
│   ├── .env.docker                         ← Docker env template (git-ignored)
│   ├── .env.example                        ← Local dev env template
│   ├── package.json                        ← Dependencies + scripts
│   └── tsconfig.json                       ← TypeScript configuration
├── docs/
│   ├── product_spec_ai_knowledge_assessment_platform.md  ← Product spec v1.1
│   ├── architecture/
│   │   ├── technical-design.md             ← Architecture reference
│   │   └── phases/                         ← Implementation phase docs
│   └── changes/                            ← Per-change deliverables
├── prisma/                                 ← Root-level package for parsers
│   └── (schema is in quiz-knowledge/prisma/)
├── DOCKER_DEPLOYMENT.md                    ← Docker operations guide
└── package.json                            ← Root workspace (mammoth, pdf-parse, tiktoken)
```

---

## 7. Main Features

### 7.1 Multi-File Document Upload

- Accepts up to **5 files per quiz generation**
- Supported formats: PDF, DOCX, Markdown, Plain Text, CSV, HTML
- Maximum file size: **15 MB per file**
- Combined content from all uploaded files feeds into a single quiz generation
- Storage: Supabase Storage (if configured) with automatic local disk fallback

### 7.2 AI-Powered Quiz Generation

- Uploads document text, chunks it into ~12,000-character segments
- Sends up to 8 chunks in parallel to **claude-haiku-4-5** (fast, cost-efficient)
- Generates `questionCount × QUESTION_BANK_MULTIPLIER` questions (default: 2× requested)
- Each question has exactly 4 options, one correct answer, and a difficulty level (easy/medium/hard)
- Automatic fallback to **claude-sonnet-4-6** if JSON validation fails
- Entire quiz + questions + options persisted in a single database transaction

### 7.3 Session-Based Quiz Delivery

- Manager receives two unique URLs:
  - **Quiz URL** (`/q/{publicToken}`) — shareable with participants
  - **Results URL** (`/results/{resultsToken}`) — private analytics access
- Each session uses **seeded deterministic randomization**:
  - Selects N questions from the question bank
  - Shuffles option order per question
  - Same session token always produces identical ordering (for reproducibility)
- Session expires after **30 minutes**
- `isCorrect` field is **never sent to the client**

### 7.4 Anti-Cheating Randomization

- Different participants see different question subsets from the same bank
- Option order is shuffled per-question per-session
- Screenshots of answers become useless across participants
- Answer submission uses stable option IDs — graded server-side regardless of display order

### 7.5 Quiz Submission and Scoring

- Participants submit answers with a self-declared identifier (name or employee ID)
- Server validates: correct quiz ownership, no expired/duplicate sessions, answer count match
- Duplicate identifier handling: appends hash suffix automatically (`John Doe` → `John Doe-abc123`)
- Scoring: 1 point per correct answer; null selections count as incorrect

### 7.6 Analytics Dashboard

Accessible via the private `resultsToken` URL:

| Widget | Content |
|---|---|
| **Stats Cards** | Total attempts, average score %, highest/lowest score |
| **Submissions Table** | Per-participant: identifier, score, submission timestamp |
| **Question Accuracy List** | Correct answer rate per question (identifies hard questions) |

### 7.7 REST API

| Endpoint | Method | Description |
|---|---|---|
| `/api/documents` | POST | Upload and parse a document file |
| `/api/quizzes` | POST | Generate quiz from document(s) |
| `/api/quizzes/{publicToken}/session` | POST | Create a quiz session |
| `/api/quizzes/{publicToken}/session` | GET | Retrieve randomized session questions |
| `/api/attempts` | POST | Submit quiz answers |
| `/api/analytics/{resultsToken}` | GET | Fetch quiz analytics |

---

## 8. Challenges and Improvements

### 8.1 Technical Challenges

| Challenge | Description | Solution Applied |
|---|---|---|
| **AI response reliability** | LLM may produce malformed JSON or fail structural validation | Zod schema validation + automatic retry with higher-capability fallback model |
| **Token boundary accuracy** | Chunking at arbitrary positions breaks sentence context | tiktoken for accurate token counting; prompt instructs model to ignore truncated fragments |
| **Synchronous generation latency** | Large documents require multiple API calls in sequence | `Promise.all` for parallel chunk processing; 55-second `AbortController` timeout |
| **Answer integrity** | Client-side tampering of option IDs | `isCorrect` never leaves the server; grading uses stable database IDs |
| **Identifier collisions** | Duplicate participant names across quiz attempts | Deterministic hash suffix appended; unique constraint enforced at DB level |
| **File storage reliability** | Supabase Storage may be unavailable | Automatic fallback to local disk with no user-visible error |
| **Session replay prevention** | Same participant re-taking a quiz | Session marked `completedAt` on submission; subsequent attempts rejected |

### 8.2 Current Improvement Activities

- **Multi-file upload**: Completed — up to 5 files can be combined into a single quiz (merged via Phase 8/9)
- **Combined document context**: Questions can now reference content across all uploaded files in a single quiz
- **Dynamic URL generation**: Quiz and results URLs use the server's `Host` header for correct address generation in Docker/VPS environments
- **Session-based delivery**: Replaced stateless randomization with persistent quiz sessions for improved integrity

### 8.3 Future Enhancement Ideas

| Enhancement | Description | Priority |
|---|---|---|
| **CI/CD Pipeline** | GitHub Actions for automated test, build, and deploy | High |
| **Authentication** | Manager login via Supabase Auth or Clerk; protect upload/analytics routes | High |
| **RAG-based generation** | pgvector embeddings for semantic chunk selection | Medium |
| **Async quiz generation** | Background job queue (e.g., Inngest) to remove 55s timeout constraint | Medium |
| **Difficulty distribution control** | Balance easy/medium/hard question ratios per quiz | Medium |
| **Rate limiting (distributed)** | Replace in-memory rate limiter with Upstash Redis for multi-instance deployments | Medium |
| **HTTPS/SSL automation** | Let's Encrypt via Certbot or Traefik for automatic TLS | High |
| **Cleanup jobs** | Vercel Cron or system cron to purge quizzes older than 90 days | Low |
| **LMS integration** | SCORM/xAPI export from attempt data for integration with corporate LMS | Low |
| **Time limits** | Per-quiz configurable time limit with server-side enforcement | Low |

---

## 9. Conclusion

The **AI-Driven Knowledge Management & Assessment Platform** demonstrates a complete, production-deployable solution built for the internal AI innovation competition. The system successfully automates the traditionally labor-intensive task of quiz creation by leveraging Anthropic's Claude language models to transform organizational documentation into structured assessments.

### Key Technical Strengths

- **Self-contained deployment**: A single `docker-compose up --build` command brings up the entire stack — application, database, and file storage — with no external platform dependency
- **Cost-efficient AI pipeline**: Primary model selection (claude-haiku-4-5) keeps per-quiz generation cost below $0.01, with automatic quality fallback to claude-sonnet-4-6 only when needed
- **Robust architecture**: Layered design (UI → API → Service → AI/Parser/DB) with strict Zod validation at every boundary prevents data corruption from malformed AI outputs
- **Anti-cheating by design**: Server-side seeded randomization ensures each participant encounters a unique quiz variant without client-side trust

### Business Impact

The platform reduces quiz creation time from hours to under 30 seconds for a 50-page document, enabling rapid deployment of knowledge verification across onboarding, compliance training, and internal certification scenarios — with full analytics visibility for training managers.

---

*Document generated from source code analysis of the KNOWLEDGE_MNG_HACKATHON repository.*  
*Last updated: 2026-05-13*  
*Prepared for: AI Innovation Competition Internal Review*
