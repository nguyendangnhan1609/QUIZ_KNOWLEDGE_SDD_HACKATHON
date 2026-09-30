# Hướng Dẫn Triển Khai với Docker Compose

**Tài liệu này hướng dẫn cách chạy ứng dụng Quiz Knowledge trên server Linux sử dụng Docker Compose**

---

## Mục lục

1. [Yêu cầu](#yêu-cầu)
2. [Chuẩn bị](#chuẩn-bị)
3. [Triển khai](#triển-khai)
4. [Quản lý Container](#quản-lý-container)
5. [Backup & Restore Database](#backup--restore-database)
6. [Monitoring & Logs](#monitoring--logs)
7. [Troubleshooting](#troubleshooting)

---

## Yêu cầu

### Phần mềm bắt buộc
- **Docker:** v20.10+
- **Docker Compose:** v2.0+ (hoặc v1.29+)
- **Linux OS:** Ubuntu 20.04 LTS hoặc CentOS 8+ (khuyên dùng)

### Kiểm tra phiên bản
```bash
docker --version
docker-compose --version
```

### Tài khoản API
- **OpenAI API Key:** [https://platform.openai.com/api/keys](https://platform.openai.com/api/keys)
- **Supabase** (tùy chọn, nếu dùng Supabase Storage)

---

## Chuẩn bị

### Bước 1: Cài đặt Docker và Docker Compose

#### Trên Ubuntu 20.04+
```bash
# Cập nhật package manager
sudo apt-get update
sudo apt-get upgrade -y

# Cài đặt Docker
sudo apt-get install -y docker.io

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Thêm user vào docker group (để chạy không cần sudo)
sudo usermod -aG docker $USER
newgrp docker

# Kiểm tra cài đặt
docker --version
docker-compose --version
```

#### Trên CentOS 8+
```bash
# Cài đặt Docker
sudo yum install -y docker

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Khởi động Docker
sudo systemctl start docker
sudo systemctl enable docker

# Thêm user vào docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Bước 2: Clone Repository
```bash
git clone <repo-url>
cd QUIZ_KNOWLEDGE_SDD_HACKATHON/quiz-knowledge
```

### Bước 3: Cấu hình Environment

#### 3.1 Tạo file `.env.local`
```bash
cp .env.docker .env.local
```

#### 3.2 Chỉnh sửa `.env.local`
```bash
nano .env.local
```

**Cần thay đổi giá trị:**
```env
# PostgreSQL - Có thể giữ nguyên hoặc thay đổi
POSTGRES_USER=quizuser
POSTGRES_PASSWORD=quizpass123  # ⚠️ Thay đổi mật khẩu mạnh cho production
POSTGRES_DB=quiz_db

# OpenAI API Key - BẮT BUỘC
OPENAI_API_KEY=sk-your-actual-api-key-here

# Supabase (nếu dùng) - TÙY CHỌN
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

**Ghi chú:**
- Lưu file bằng `Ctrl + X` rồi `Y` rồi `Enter` (nano)
- **KHÔNG commit .env.local vào git** - nó chứa credentials

### Bước 4: Chuẩn bị thư mục dữ liệu (tùy chọn)
```bash
# Tạo thư mục cho PostgreSQL data
mkdir -p ./postgres_data

# Cấp quyền
chmod 755 ./postgres_data
```

---

## Triển khai

### Bước 1: Build Images
```bash
docker-compose build
```

**Thời gian:** ~5-10 phút (phần đầu tiên sẽ lâu hơn)

**Đầu ra mong đợi:**
```
[+] Building 157.3s (18/18) FINISHED
 => [internal] load build definition
 => [app] exporting to image
 => => naming to docker.io/library/quiz-knowledge-app:latest
```

### Bước 2: Khởi động Services
```bash
docker-compose up -d
```

**Tùy chọn:**
```bash
# Chạy ở foreground để xem logs (không chạy background)
docker-compose up

# Build và start cùng lúc
docker-compose up -d --build
```

### Bước 3: Chạy Database Migrations
```bash
docker-compose exec app pnpm prisma migrate deploy
```

**Đầu ra mong đợi:**
```
Prisma has detected that you have inline update triggers
✔ Applied migration `XXXXX_initial_schema`
```

### Bước 4: Seed dữ liệu (tùy chọn)
```bash
docker-compose exec app pnpm prisma db seed
```

### Bước 5: Kiểm tra trạng thái
```bash
docker-compose ps
```

**Đầu ra mong đợi:**
```
NAME              COMMAND               SERVICE    STATUS
quiz-postgres     postgres              postgres   Up (healthy)
quiz-app          pnpm start            app        Up (healthy)
```

### Bước 6: Truy cập ứng dụng
- **URL:** http://your-server-ip:3000
- **Hoặc:** http://localhost:3000 (nếu SSH vào server)

---

## Quản lý Container

### Xem trạng thái
```bash
docker-compose ps
docker-compose status
```

### Xem logs
```bash
# Logs ứng dụng
docker-compose logs app

# Logs database
docker-compose logs postgres

# Logs real-time (follow)
docker-compose logs -f app

# Logs của container cụ thể với số dòng
docker-compose logs app --tail 100
```

### Dừng services
```bash
# Dừng mà không xóa
docker-compose stop

# Dừng service cụ thể
docker-compose stop app
```

### Khởi động lại
```bash
# Restart all services
docker-compose restart

# Restart service cụ thể
docker-compose restart app
```

### Xóa containers (nguy hiểm!)
```bash
# Xóa containers (giữ lại data)
docker-compose down

# Xóa containers + volumes (XÓA DỮ LIỆU!)
docker-compose down -v
```

### Truy cập vào container
```bash
# Truy cập bash của app
docker-compose exec app sh

# Truy cập PostgreSQL
docker-compose exec postgres psql -U quizuser -d quiz_db
```

---

## Backup & Restore Database

### Backup Database
```bash
# Backup vào file
docker-compose exec postgres pg_dump -U quizuser -d quiz_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Hoặc tất cả databases
docker-compose exec postgres pg_dumpall -U quizuser > full_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
# Restore từ file
docker-compose exec -T postgres psql -U quizuser -d quiz_db < backup_20260511_120000.sql

# Hoặc full restore
docker-compose exec -T postgres psql -U quizuser < full_backup_20260511_120000.sql
```

### Backup Volumes
```bash
# Backup PostgreSQL volume
docker run --rm -v quiz-knowledge_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .

# Restore PostgreSQL volume
docker run --rm -v quiz-knowledge_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_data.tar.gz -C /data
```

---

## Monitoring & Logs

### Kiểm tra sử dụng tài nguyên
```bash
docker stats
```

**Thông tin hiển thị:**
- CPU %
- Memory usage
- Network I/O
- Disk I/O

### Kiểm tra health
```bash
# Xem health status
docker-compose ps

# Chi tiết health check
docker inspect quiz-app | grep -A 10 "Health"
```

### Ghi log tới file
```bash
# Ghi logs vào file
docker-compose logs app > app.log 2>&1

# Ghi logs real-time vào file
docker-compose logs -f app >> app.log 2>&1 &
```

### Xem events
```bash
# Xem các events Docker
docker events --filter "label=com.docker.compose.project=quiz-knowledge"
```

---

## Troubleshooting

### Lỗi: Port 3000 đã được sử dụng
```bash
# Tìm process sử dụng port 3000
lsof -i :3000

# Hoặc dùng port khác trong .env.local
PORT=3001 docker-compose up -d
```

### Lỗi: PostgreSQL không khởi động
```bash
# Kiểm tra logs
docker-compose logs postgres

# Xóa volume và rebuild
docker-compose down -v
docker-compose up -d --build

# Chạy migrations lại
docker-compose exec app pnpm prisma migrate deploy
```

### Lỗi: "Cannot find module 'next'"
```bash
# Rebuild image
docker-compose down
docker-compose up -d --build

# Hoặc install dependencies
docker-compose exec app pnpm install
```

### Lỗi: Database connection timeout
```bash
# Kiểm tra health check
docker-compose ps

# Kiểm tra logs database
docker-compose logs postgres

# Kiểm tra kết nối
docker-compose exec app pnpm prisma db push
```

### Lỗi: Supabase/OpenAI API không hoạt động
```bash
# Kiểm tra environment variables
docker-compose exec app env | grep -i openai

# Kiểm tra .env.local
cat .env.local

# Thử kết nối
docker-compose exec app pnpm prisma db push
```

### Lỗi: Out of memory
```bash
# Tăng memory limit trong docker-compose.yml
# Thêm dòng sau vào app service:
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### Reset hoàn toàn (nguy hiểm!)
```bash
# Xóa tất cả containers, images, volumes
docker-compose down -v --rmi all

# Rebuild
docker-compose up -d --build

# Migrations
docker-compose exec app pnpm prisma migrate deploy
```

---

## Cập nhật ứng dụng

### Cập nhật code
```bash
# Pull latest code
git pull origin main

# Rebuild image
docker-compose build

# Restart app
docker-compose up -d

# Run migrations nếu cần
docker-compose exec app pnpm prisma migrate deploy
```

### Cập nhật dependencies
```bash
# Trong container
docker-compose exec app pnpm install

# Hoặc rebuild
docker-compose up -d --build
```

---

## Production Checklist

Trước khi deploy lên production:

- [ ] Thay đổi `POSTGRES_PASSWORD` thành mật khẩu mạnh
- [ ] Thay đổi `NODE_ENV=production`
- [ ] Cấu hình `OPENAI_API_KEY` chính xác
- [ ] Kiểm tra logs không có lỗi: `docker-compose logs -f`
- [ ] Test upload file: Tạo quiz & xem kết quả
- [ ] Setup backup hàng ngày (cron job):
  ```bash
  # Thêm vào crontab
  0 2 * * * cd /path/to/quiz-knowledge && docker-compose exec -T postgres pg_dump -U quizuser -d quiz_db > /backups/quiz_$(date +\%Y\%m\%d_\%H\%M\%S).sql
  ```
- [ ] Setup monitoring (opsional)
- [ ] Cấu hình firewall (chỉ cho phép port 80, 443, 3000)

---

## Tips & Best Practices

### Development vs Production
```bash
# Development: xem logs real-time
docker-compose logs -f

# Production: run background + ghi logs
docker-compose up -d
docker-compose logs app >> /var/log/quiz-app.log 2>&1 &
```

### Auto-restart khi server reboot
```bash
# restart policy đã được set trong docker-compose.yml
restart: unless-stopped

# Hoặc enable Docker service
sudo systemctl enable docker
```

### Sử dụng volumes cho persistent data
```bash
# Volumes được tạo tự động:
# - postgres_data (dữ liệu database)
# - app_logs (logs ứng dụng)

# Kiểm tra volumes
docker volume ls
```

### Custom domain (với reverse proxy)
Nếu muốn dùng domain thay vì IP:
1. Setup Nginx/Apache reverse proxy
2. Configure HTTPS/SSL
3. Point domain tới server

Xem hướng dẫn Nginx trong `docs/huong_dan_VN.md`

---

## Liên hệ & Hỗ trợ

### Tài liệu liên quan
- [Hướng dẫn Tiếng Việt](./docs/huong_dan_VN.md)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

### Kiểm tra logs
```bash
docker-compose logs [service-name]
```

### Báo cáo lỗi
Khi báo cáo lỗi, cung cấp:
1. Output của `docker-compose ps`
2. Logs: `docker-compose logs app --tail 50`
3. Docker version: `docker --version`
4. Environment: .env.local (có che giấu keys)

---

**Cập nhật cuối: 2026-05-11**
