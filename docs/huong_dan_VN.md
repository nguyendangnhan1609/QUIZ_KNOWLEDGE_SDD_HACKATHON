# Hướng Dẫn Sử Dụng Nền Tảng Đánh Giá Kiến Thức AI

**Tài liệu này hướng dẫn cách chạy, kiểm thử và triển khai hệ thống Nền tảng Quản lý & Đánh giá Kiến thức được Hỗ trợ bằng AI**

**Phiên bản:** 1.0  
**Cập nhật:** 2026-05-11  
**Ngôn ngữ:** Tiếng Việt

---

## Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Cài đặt ban đầu](#cài-đặt-ban-đầu)
3. [Hướng dẫn chạy](#hướng-dẫn-chạy)
4. [Kiểm thử hệ thống](#kiểm-thử-hệ-thống)
5. [Triển khai](#triển-khai)
6. [Kiểm tra chức năng cơ bản](#kiểm-tra-chức-năng-cơ-bản)
7. [Khắc phục sự cố](#khắc-phục-sự-cố)

---

## Yêu cầu hệ thống

### Phần cứng tối thiểu
- **CPU:** 2 lõi trở lên
- **RAM:** 4GB trở lên
- **Dung lượng đĩa:** 2GB (không tính node_modules)
- **Kết nối Internet:** Bắt buộc (để kết nối với API)

### Phần mềm bắt buộc
- **Node.js:** v18.17 hoặc mới hơn
- **npm/pnpm:** v8.0 hoặc mới hơn (khuyên dùng pnpm)
- **Git:** v2.30 hoặc mới hơn
- **PowerShell hoặc Bash:** để chạy lệnh

### Tài khoản và khóa API bắt buộc
- **Supabase Account:** [https://supabase.com](https://supabase.com)
  - Cơ sở dữ liệu PostgreSQL
  - Storage bucket cho tài liệu
  - Khóa API và URL
- **OpenAI Account:** [https://openai.com](https://openai.com)
  - API key để tạo câu hỏi trắc nghiệm

### Kiểm tra phiên bản
```bash
node --version      # Nên là v18.17+
npm --version       # hoặc pnpm --version
git --version       # Nên là v2.30+
```

---

## Cài đặt ban đầu

### Bước 1: Clone dự án
```bash
git clone <repo-url>
cd QUIZ_KNOWLEDGE_SDD_HACKATHON
cd quiz-knowledge
```

### Bước 2: Cài đặt dependencies
Dùng **pnpm** (được khuyên dùng):
```bash
pnpm install
```

Hoặc dùng **npm**:
```bash
npm install
```

### Bước 3: Cấu hình biến môi trường

#### 3.1 Tạo file `.env.local`
Tạo file `.quiz-knowledge/.env.local` với nội dung:

```env
# Database - Supabase PostgreSQL
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://[user]:[password]@[host]:[port]/[database]

# Supabase Configuration
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_STORAGE_BUCKET=quiz-assets

# AI Provider - OpenAI
OPENAI_API_KEY=sk-...your-api-key-here...

# Optional: Anthropic API (nếu dùng Anthropic API)
ANTHROPIC_API_KEY=sk-ant-...your-api-key-here...
```

#### 3.2 Lấy thông tin từ Supabase
1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **Settings** → **Database**
4. Copy **Connection String** (cho DATABASE_URL)
5. Vào **Settings** → **API**
6. Copy **Project URL** (SUPABASE_URL)
7. Copy **Service Role Secret** (SUPABASE_SERVICE_ROLE_KEY)
8. Vào **Storage** → Kiểm tra bucket **quiz-assets** tồn tại

#### 3.3 Lấy OpenAI API Key
1. Đăng nhập vào [OpenAI Platform](https://platform.openai.com)
2. Vào **API keys**
3. Tạo hoặc copy API key hiện có

### Bước 4: Khởi tạo cơ sở dữ liệu

#### 4.1 Chạy migrations
```bash
pnpm prisma migrate deploy
```

#### 4.2 Seed dữ liệu mẫu (tùy chọn)
Để thêm dữ liệu mẫu cho phát triển:
```bash
pnpm prisma db seed
```

#### 4.3 Kiểm tra kết nối cơ sở dữ liệu
```bash
pnpm prisma db push
```

### Bước 5: Xây dựng ứng dụng
```bash
pnpm build
```

Nếu thành công, bạn sẽ thấy tệp `.next` được tạo.

---

## Hướng dẫn chạy

### Chế độ phát triển (Development Mode)

Chế độ này có hot-reload, thích hợp để phát triển:

```bash
cd quiz-knowledge
pnpm dev
```

**Đầu ra mong đợi:**
```
  ▲ Next.js 16.2.6
  - Local:        http://localhost:3000
  - Environments: .env.local
```

**Truy cập ứng dụng:** http://localhost:3000

**Dừng máy chủ:** Nhấn `Ctrl + C`

### Chế độ sản xuất (Production Mode)

Sau khi xây dựng, chạy phiên bản tối ưu hóa:

```bash
pnpm build
pnpm start
```

Ứng dụng sẽ chạy trên http://localhost:3000

### Giải thích các lệnh npm script

| Lệnh | Mô tả |
|------|-------|
| `pnpm dev` | Chạy máy chủ phát triển với hot-reload |
| `pnpm build` | Xây dựng ứng dụng cho sản xuất |
| `pnpm start` | Chạy máy chủ sản xuất |
| `pnpm lint` | Kiểm tra code style với ESLint |
| `pnpm format` | Tự động định dạng code với Prettier |
| `pnpm test` | Chạy unit tests (một lần) |
| `pnpm test:watch` | Chạy unit tests (chế độ theo dõi) |

---

## Kiểm thử hệ thống

### Chạy Unit Tests

#### Chạy tất cả tests (một lần)
```bash
pnpm test
```

**Đầu ra mong đợi:**
```
✓ src/lib/ai/chunker.test.ts (N)
✓ src/lib/ai/randomization.test.ts (N)
✓ src/lib/parsers/markdown.test.ts (N)
✓ src/services/attempt/validate-submission.test.ts (N)
...
Test Files  N passed (N)
Tests       N passed (N)
```

#### Chạy tests ở chế độ theo dõi (watch mode)
```bash
pnpm test:watch
```

Lệnh này sẽ tự động chạy lại tests khi bạn sửa file.

#### Chạy tests cho file cụ thể
```bash
pnpm test src/lib/ai/chunker.test.ts
```

#### Chạy tests khớp với pattern
```bash
pnpm test --grep "chunker"
```

### Các test hiện tại trong hệ thống

Hệ thống có các test suites sau:

1. **AI Module Tests** (`src/lib/ai/`)
   - `chunker.test.ts` - Kiểm thử chia nhỏ tài liệu
   - `randomization.test.ts` - Kiểm thử ngẫu nhiên hóa câu hỏi

2. **Parser Tests** (`src/lib/parsers/`)
   - `markdown.test.ts` - Phân tích Markdown
   - `normalize.test.ts` - Chuẩn hóa văn bản

3. **Schema Tests** (`src/lib/schemas/`)
   - `ai.test.ts` - Xác thực schema AI

4. **Service Tests** (`src/lib/services/`, `src/services/`)
   - `quizSessions.test.ts` - Quản lý phiên quiz
   - `validate-submission.test.ts` - Xác thực bài nộp
   - `score-session-answers.test.ts` - Tính điểm
   - `aggregate-summary.test.ts` - Tổng hợp thống kê
   - `identifier-collision.test.ts` - Kiểm thử va chạm ID

### Kiểm tra Coverage Tests
```bash
pnpm test --coverage
```

### Linting và Formatting

#### Kiểm tra code style
```bash
pnpm lint
```

#### Tự động sửa lỗi formatting
```bash
pnpm format
```

---

## Triển khai

### Triển khai trên Vercel (Khuyên dùng)

Vercel là nền tảng được tối ưu hóa cho Next.js.

#### 1. Kết nối GitHub Repository
1. Đăng nhập vào [Vercel](https://vercel.com)
2. Nhấn **New Project**
3. Chọn GitHub repository của bạn
4. Chọn folder: `quiz-knowledge`

#### 2. Cấu hình biến môi trường
Trên Vercel dashboard:
1. Vào **Settings** → **Environment Variables**
2. Thêm tất cả biến từ `.env.local`:
   ```
   DATABASE_URL=...
   DIRECT_URL=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_STORAGE_BUCKET=...
   OPENAI_API_KEY=...
   ```

#### 3. Triển khai
```bash
git push origin main
```

Vercel sẽ tự động:
- Xây dựng ứng dụng
- Chạy migrations (nếu cấu hình)
- Triển khai trên CDN toàn cầu

#### 4. Kiểm tra triển khai
- Vercel sẽ cung cấp URL: `https://your-app.vercel.app`
- Kiểm tra logs tại Vercel Dashboard nếu có lỗi

### Triển khai tự lưu trữ (Self-hosted)

#### Trên VPS / Máy chủ Linux

##### Yêu cầu
- Ubuntu 20.04+ hoặc CentOS 8+
- Node.js v18+
- PM2 (process manager)

##### Bước triển khai
```bash
# 1. SSH vào server
ssh user@your-server

# 2. Clone repository
git clone <repo-url>
cd QUIZ_KNOWLEDGE_SDD_HACKATHON/quiz-knowledge

# 3. Cài đặt dependencies
pnpm install --prod

# 4. Cấu hình biến môi trường
nano .env.local
# (Sao chép nội dung từ .env.example và điền vào)

# 5. Xây dựng ứng dụng
pnpm build

# 6. Cài đặt PM2
npm install -g pm2

# 7. Chạy ứng dụng với PM2
pm2 start "pnpm start" --name "quiz-app"

# 8. Lưu cấu hình PM2
pm2 save
pm2 startup

# 9. Kiểm tra trạng thái
pm2 list
pm2 logs quiz-app
```

#### Sử dụng Nginx làm Reverse Proxy
```nginx
# /etc/nginx/sites-available/quiz-app
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Triển khai với Docker

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod

COPY . .

RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "start"]
```

#### Build và Run
```bash
docker build -t quiz-app .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e OPENAI_API_KEY=sk-... \
  quiz-app
```

---

## Kiểm tra chức năng cơ bản

Sau khi triển khai, hãy kiểm tra các chức năng sau:

### 1. Kiểm tra kết nối cơ sở dữ liệu
```bash
# Chạy command này ở environment
pnpm prisma db execute --stdin < check_db.sql
```

Hoặc truy cập ứng dụng và xem có lỗi DB hay không.

### 2. Kiểm tra trang chính
**Truy cập:** http://localhost:3000 (phát triển) hoặc https://your-domain.com (sản xuất)

**Kỳ vọng:**
- Trang tải thành công
- Không có lỗi console
- Giao diện hiển thị đúng

### 3. Kiểm tra tính năng Upload tài liệu
1. Đi đến trang upload
2. Chọn file PDF hoặc Markdown mẫu
3. Bấm **Upload**
4. **Kỳ vọng:**
   - File tải lên thành công
   - Thông báo "Upload hoàn tất"
   - Dữ liệu lưu trong database

### 4. Kiểm tra tính năng Tạo Quiz
1. Sau khi upload tài liệu, bấm **Tạo Quiz**
2. Chế độ AI sẽ tạo câu hỏi trắc nghiệm
3. **Kỳ vọng:**
   - Trang tải (loading state)
   - Sau 30-60 giây, quiz được tạo
   - Hiển thị các câu hỏi và đáp án
   - Tạo được Public Link

### 5. Kiểm tra Public Link Quiz
1. Sao chép public link
2. Mở link trong tab mới (hoặc incognito)
3. **Kỳ vọng:**
   - Quiz tải thành công
   - Không cần đăng nhập
   - Có thể chọn đáp án
   - Có nút **Nộp bài**

### 6. Kiểm tra Nộp bài và Tính điểm
1. Chọn đáp án cho mỗi câu
2. Bấm **Nộp bài**
3. **Kỳ vọng:**
   - Bài được xử lý
   - Hiển thị điểm số
   - Hiển thị tỉ lệ trả lời đúng
   - Lưu kết quả vào database

### 7. Kiểm tra Dashboard Kết quả
1. Trở về giao diện quản lý
2. Xem Results Dashboard
3. **Kỳ vọng:**
   - Hiển thị số lượt tham gia
   - Hiển thị biểu đồ thống kê
   - Hiển thị danh sách kết quả
   - Dữ liệu chính xác

### 8. Kiểm tra Performance
Mở DevTools (F12):
- **Network:** Trang nên tải dưới 3 giây
- **Console:** Không có lỗi đỏ
- **Performance:** Không có memory leak

### 9. Kiểm tra Responsive Design
1. Mở ứng dụng trên các thiết bị:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
2. **Kỳ vọng:**
   - Giao diện hiển thị đúng
   - Không bị horizontal scroll
   - Button, form dễ sử dụng

### 10. Kiểm tra Error Handling
1. **Test offline:** Tắt Internet, load trang
2. **Test invalid input:** Upload file không đúng format
3. **Test API error:** Cắt API key, tạo quiz
4. **Kỳ vọng:**
   - Hiển thị thông báo lỗi thân thiện
   - Không crash ứng dụng

---

## Khắc phục sự cố

### Lỗi: Database Connection Error

**Triệu chứng:**
```
Error: ECONNREFUSED or "could not connect to server"
```

**Nguyên nhân:**
- DATABASE_URL sai
- Cơ sở dữ liệu Supabase chưa khởi tạo
- Mạng không kết nối tới Supabase

**Giải pháp:**
```bash
# 1. Kiểm tra .env.local
cat .env.local | grep DATABASE_URL

# 2. Kiểm tra kết nối
pnpm prisma db push

# 3. Nếu vẫn lỗi, xóa .env.local và tạo lại từ .env.example
rm .env.local
cp .env.example .env.local
# (Điền lại thông tin)
```

### Lỗi: Module not found

**Triệu chứng:**
```
Error: Cannot find module 'next'
```

**Giải pháp:**
```bash
# 1. Xóa node_modules
rm -rf node_modules
rm pnpm-lock.yaml

# 2. Cài đặt lại
pnpm install

# 3. Xây dựng lại
pnpm build
```

### Lỗi: OpenAI API Error

**Triệu chứng:**
```
Invalid API Key provided
```

**Giải pháp:**
1. Kiểm tra OPENAI_API_KEY trong `.env.local`
2. Truy cập [OpenAI Platform](https://platform.openai.com/api/keys)
3. Xác nhận API key có hoạt động
4. Kiểm tra tài khoản có credit/subscription

### Lỗi: Port 3000 đã được sử dụng

**Triệu chứng:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Giải pháp:**
```bash
# Linux/Mac: Tìm process sử dụng port 3000
lsof -i :3000
kill -9 <PID>

# Windows PowerShell:
Get-Process | Where-Object {$_.Port -eq 3000}
Stop-Process -Id <PID> -Force

# Hoặc chạy trên port khác:
PORT=3001 pnpm dev
```

### Lỗi: Memory tối đa vượt quá

**Triệu chứng:**
```
JavaScript heap out of memory
```

**Giải pháp:**
```bash
# Tăng bộ nhớ Node.js
NODE_OPTIONS=--max-old-space-size=4096 pnpm build
```

### Lỗi: Prisma Migration Error

**Triệu chứng:**
```
Migration cannot be executed against the current state of the database
```

**Giải pháp:**
```bash
# 1. Kiểm tra migration status
pnpm prisma migrate status

# 2. Reset database (chỉ dùng khi cần)
pnpm prisma migrate reset

# 3. Chạy migration lại
pnpm prisma migrate deploy
```

### Lỗi: CORS Error

**Triệu chứng:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Giải pháp:**
1. Kiểm tra Supabase CORS settings
2. Thêm domain vào Supabase allowed origins
3. Vercel/deployment domain phải được phép

### Lỗi: File Upload Không Hoạt động

**Triệu chứng:**
```
Failed to upload file to storage
```

**Giải pháp:**
```bash
# 1. Kiểm tra Supabase bucket tồn tại
# Truy cập Supabase Dashboard → Storage
# Kiểm tra bucket "quiz-assets" có tồn tại

# 2. Kiểm tra SUPABASE_STORAGE_BUCKET
cat .env.local | grep SUPABASE_STORAGE_BUCKET

# 3. Nếu bucket không tồn tại, tạo mới từ Supabase Dashboard
```

### Lỗi: Tests Không Chạy

**Triệu chứng:**
```
No test files found
```

**Giải pháp:**
```bash
# 1. Kiểm tra cấu hình vitest
cat vitest.config.ts

# 2. Cài đặt dependencies test
pnpm install -D vitest

# 3. Chạy tests với debug
pnpm test --reporter=verbose
```

---

## Liên hệ & Hỗ trợ

### Tài liệu liên quan
- [Product Specification](./product_spec_ai_knowledge_assessment_platform.md)
- [Technical Design](./architecture/technical-design.md)
- [Implementation Plan](./architecture/implementation-plan.md)
- [Database Conventions](./standards/database-conventions.md)

### Công cụ hữu ích
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs

### Báo cáo lỗi
Nếu gặp vấn đề:
1. Kiểm tra [Khắc phục sự cố](#khắc-phục-sự-cố) phần trên
2. Xem logs: `pnpm dev` hoặc `pm2 logs quiz-app`
3. Báo cáo issue trên GitHub repository

---

**Cập nhật cuối: 2026-05-11**
