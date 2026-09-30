#!/bin/bash

# Docker Compose Helper Script
# Hỗ trợ các lệnh thường dùng để quản lý ứng dụng

set -e

# Màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Kiểm tra Docker Compose
check_docker() {
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Error: docker-compose không được cài đặt${NC}"
        exit 1
    fi
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: docker không được cài đặt${NC}"
        exit 1
    fi
}

# Hiển thị menu
show_menu() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Quiz Knowledge - Docker Helper${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "Available commands:"
    echo "  1. start     - Khởi động services"
    echo "  2. stop      - Dừng services"
    echo "  3. restart   - Khởi động lại services"
    echo "  4. logs      - Xem logs ứng dụng"
    echo "  5. logs-db   - Xem logs database"
    echo "  6. status    - Kiểm tra trạng thái"
    echo "  7. shell     - Truy cập shell ứng dụng"
    echo "  8. db-shell  - Truy cập PostgreSQL"
    echo "  9. migrate   - Chạy Prisma migrations"
    echo "  10. seed     - Seed dữ liệu mẫu"
    echo "  11. backup   - Backup database"
    echo "  12. build    - Build images"
    echo "  13. down     - Down tất cả (giữ data)"
    echo "  14. down-v   - Down tất cả (xóa data) - NGUY HIỂM!"
    echo "  15. help     - Hiển thị menu này"
    echo ""
}

# Các hàm lệnh
cmd_start() {
    echo -e "${YELLOW}Starting services...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✓ Services started${NC}"
    echo -e "${BLUE}Access app at: http://localhost:3000${NC}"
}

cmd_stop() {
    echo -e "${YELLOW}Stopping services...${NC}"
    docker-compose stop
    echo -e "${GREEN}✓ Services stopped${NC}"
}

cmd_restart() {
    echo -e "${YELLOW}Restarting services...${NC}"
    docker-compose restart
    echo -e "${GREEN}✓ Services restarted${NC}"
}

cmd_logs() {
    echo -e "${YELLOW}Application logs (last 50 lines):${NC}"
    docker-compose logs app --tail 50
}

cmd_logs_db() {
    echo -e "${YELLOW}Database logs (last 50 lines):${NC}"
    docker-compose logs postgres --tail 50
}

cmd_status() {
    echo -e "${YELLOW}Services status:${NC}"
    docker-compose ps
    echo ""
    echo -e "${YELLOW}Resource usage:${NC}"
    docker stats --no-stream
}

cmd_shell() {
    echo -e "${YELLOW}Entering app shell...${NC}"
    echo -e "${BLUE}Type 'exit' to leave${NC}"
    docker-compose exec app sh
}

cmd_db_shell() {
    echo -e "${YELLOW}Entering PostgreSQL shell...${NC}"
    echo -e "${BLUE}Type '\\q' to exit${NC}"
    docker-compose exec postgres psql -U quizuser -d quiz_db
}

cmd_migrate() {
    echo -e "${YELLOW}Running Prisma migrations...${NC}"
    docker-compose exec app pnpm prisma migrate deploy
    echo -e "${GREEN}✓ Migrations completed${NC}"
}

cmd_seed() {
    echo -e "${YELLOW}Seeding database...${NC}"
    docker-compose exec app pnpm prisma db seed
    echo -e "${GREEN}✓ Database seeded${NC}"
}

cmd_backup() {
    BACKUP_DIR="./backups"
    BACKUP_FILE="$BACKUP_DIR/quiz_db_$(date +%Y%m%d_%H%M%S).sql"

    mkdir -p "$BACKUP_DIR"

    echo -e "${YELLOW}Backing up database to $BACKUP_FILE...${NC}"
    docker-compose exec postgres pg_dump -U quizuser -d quiz_db > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✓ Backup completed ($SIZE)${NC}"
        echo -e "${BLUE}Backup file: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}✗ Backup failed${NC}"
        exit 1
    fi
}

cmd_build() {
    echo -e "${YELLOW}Building images...${NC}"
    docker-compose build
    echo -e "${GREEN}✓ Images built${NC}"
}

cmd_down() {
    echo -e "${YELLOW}Bringing down services (keeping data)...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Services down${NC}"
}

cmd_down_v() {
    echo -e "${RED}WARNING: This will DELETE all data including database!${NC}"
    read -p "Type 'yes' to confirm: " confirm

    if [ "$confirm" = "yes" ]; then
        echo -e "${YELLOW}Bringing down and removing volumes...${NC}"
        docker-compose down -v
        echo -e "${GREEN}✓ Services and data removed${NC}"
    else
        echo -e "${BLUE}Cancelled${NC}"
    fi
}

# Main script
main() {
    check_docker

    # If argument provided
    if [ -n "$1" ]; then
        case "$1" in
            start) cmd_start ;;
            stop) cmd_stop ;;
            restart) cmd_restart ;;
            logs) cmd_logs ;;
            logs-db) cmd_logs_db ;;
            status) cmd_status ;;
            shell) cmd_shell ;;
            db-shell) cmd_db_shell ;;
            migrate) cmd_migrate ;;
            seed) cmd_seed ;;
            backup) cmd_backup ;;
            build) cmd_build ;;
            down) cmd_down ;;
            down-v) cmd_down_v ;;
            help|--help|-h) show_menu ;;
            *)
                echo -e "${RED}Unknown command: $1${NC}"
                show_menu
                exit 1
                ;;
        esac
    else
        # Interactive menu
        show_menu
        read -p "Enter command number or name (1-15): " choice

        case "$choice" in
            1|start) cmd_start ;;
            2|stop) cmd_stop ;;
            3|restart) cmd_restart ;;
            4|logs) cmd_logs ;;
            5|logs-db) cmd_logs_db ;;
            6|status) cmd_status ;;
            7|shell) cmd_shell ;;
            8|db-shell) cmd_db_shell ;;
            9|migrate) cmd_migrate ;;
            10|seed) cmd_seed ;;
            11|backup) cmd_backup ;;
            12|build) cmd_build ;;
            13|down) cmd_down ;;
            14|down-v) cmd_down_v ;;
            15|help) show_menu ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                exit 1
                ;;
        esac
    fi
}

# Chạy
main "$@"
