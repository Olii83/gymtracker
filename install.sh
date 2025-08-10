#!/bin/bash

# Gym Tracker Installation Script - Complete Edition
# Version 2.1 - With Rollback & Nginx Proxy Manager Support

set -e

# Configuration
APP_NAME="gym-tracker"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="gym.zhst.eu"
DB_PATH="$APP_DIR/database/gym_tracker.db"
GITHUB_REPO="https://github.com/Olii83/gymtracker.git"
BACKUP_DIR="/tmp/gym-tracker-backups"

# Options
SKIP_SSL=false
SKIP_FIREWALL=false
PROXY_MODE=false
ROLLBACK_MODE=false
DRY_RUN=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
}

print_sub() {
    echo -e "${CYAN}  ↳${NC} $1"
}

# Header
show_header() {
    clear
    echo -e "${PURPLE}"
    echo "🏋️‍♂️ ========================================================"
    echo "🏋️‍♀️           GYM TRACKER INSTALLATION SCRIPT            "
    echo "🏋️‍♂️                  COMPLETE EDITION v2.1               "
    echo "🏋️‍♀️ ========================================================"
    echo -e "${NC}"
    echo "Features:"
    echo "• 🗄️  SQLite database (no MySQL/MariaDB needed)"
    echo "• 🚀 Node.js backend with Express"
    echo "• 📱 Modern modular frontend"
    echo "• 🔒 Nginx reverse proxy with SSL"
    echo "• 🛡️  Security (UFW firewall, Fail2ban)"
    echo "• 📊 Monitoring and automated backups"
    echo "• 👑 Complete admin panel"
    echo "• 👥 Multi-user support"
    echo "• 🔄 Rollback functionality"
    echo "• 🌐 Nginx Proxy Manager support"
    echo "========================================================"
    echo
}

# Parse command line arguments
parse_args() {
    echo "DEBUG: Received $# arguments"
    local arg_count=1
    
    while [[ $# -gt 0 ]]; do
        echo "DEBUG: Arg $arg_count: [$1] (length: ${#1})"
        
        # Clean the argument - remove any invisible characters
        local clean_arg=$(printf '%s' "$1" | tr -cd '[:print:]' | sed 's/[[:space:]]*$//')
        echo "DEBUG: Cleaned arg: [$clean_arg]"
        
        case "$clean_arg" in
            --domain=*)
                DOMAIN="${clean_arg#*=}"
                echo "DEBUG: Set DOMAIN to: $DOMAIN"
                ;;
            --app-dir=*)
                APP_DIR="${clean_arg#*=}"
                DB_PATH="$APP_DIR/database/gym_tracker.db"
                echo "DEBUG: Set APP_DIR to: $APP_DIR"
                ;;
            --skip-ssl)
                SKIP_SSL=true
                echo "DEBUG: Set SKIP_SSL to: true"
                ;;
            --skip-firewall)
                SKIP_FIREWALL=true
                echo "DEBUG: Set SKIP_FIREWALL to: true"
                ;;
            --proxy-mode)
                PROXY_MODE=true
                echo "DEBUG: Set PROXY_MODE to: true"
                ;;
            --rollback)
                ROLLBACK_MODE=true
                echo "DEBUG: Set ROLLBACK_MODE to: true"
                ;;
            --dry-run)
                DRY_RUN=true
                echo "DEBUG: Set DRY_RUN to: true"
                ;;
            --help|--helps|-h)
                show_help
                exit 0
                ;;
            "")
                echo "DEBUG: Skipping empty argument"
                ;;
            *)
                echo "DEBUG: Unknown argument detected!"
                echo "  Original: [$1]"
                echo "  Cleaned:  [$clean_arg]"
                echo "  Length:   ${#1} vs ${#clean_arg}"
                echo "  Hex dump: $(echo -n "$1" | xxd -p)"
                
                print_error "Unknown argument: '$clean_arg'"
                echo ""
                echo "Available options:"
                echo "  --domain=DOMAIN"
                echo "  --app-dir=PATH" 
                echo "  --skip-ssl"
                echo "  --skip-firewall"
                echo "  --proxy-mode"
                echo "  --rollback"
                echo "  --dry-run"
                echo "  --help"
                exit 1
                ;;
        esac
        shift
        ((arg_count++))
    done
    
    echo "DEBUG: Finished parsing arguments"
}

show_help() {
    echo "Gym Tracker Installation Script v2.1"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --domain=DOMAIN         Set domain name (default: gym.zhst.eu)"
    echo "  --app-dir=PATH          Set application directory (default: /var/www/gym-tracker)"
    echo "  --skip-ssl              Skip SSL certificate setup"
    echo "  --skip-firewall         Skip firewall configuration"
    echo "  --proxy-mode            Enable Nginx Proxy Manager mode"
    echo "  --rollback              Rollback to previous installation"
    echo "  --dry-run               Show what would be done without executing"
    echo "  --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Basic installation"
    echo "  $0 --domain=gym.example.com          # Custom domain"
    echo "  $0 --proxy-mode --skip-ssl           # For Nginx Proxy Manager"
    echo "  $0 --rollback                        # Rollback installation"
    echo ""
}

# Dry run function
execute_command() {
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY-RUN] Would execute: $*"
    else
        "$@"
    fi
}

check_requirements() {
    print_header "Checking System Requirements"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
    print_sub "Root access: ✅"
    
    # Check OS
    if [ ! -f /etc/debian_version ]; then
        print_error "This script is designed for Debian/Ubuntu systems"
        exit 1
    fi
    print_sub "Operating system: ✅ $(lsb_release -d | cut -f2)"
    
    # Check internet connection
    if ! ping -c 1 google.com &> /dev/null; then
        print_error "No internet connection available"
        exit 1
    fi
    print_sub "Internet connection: ✅"
    
    # Check available disk space (minimum 2GB)
    available_space=$(df / | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 2097152 ]; then # 2GB in KB
        print_error "Insufficient disk space. At least 2GB required."
        exit 1
    fi
    print_sub "Disk space: ✅ $(df -h / | tail -1 | awk '{print $4}') available"
    
    print_success "All system requirements met"
}

create_backup() {
    print_header "Creating System Backup"
    
    if [ ! -d "$APP_DIR" ]; then
        print_sub "No existing installation found, skipping backup"
        return
    fi
    
    local backup_name="gym-tracker-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    execute_command mkdir -p "$BACKUP_DIR"
    
    print_sub "Creating backup: $backup_name"
    execute_command cp -r "$APP_DIR" "$backup_path"
    
    # Save current systemd service
    if [ -f "/etc/systemd/system/$APP_NAME.service" ]; then
        execute_command cp "/etc/systemd/system/$APP_NAME.service" "$backup_path/"
    fi
    
    # Save current nginx config
    if [ -f "/etc/nginx/sites-available/$APP_NAME" ]; then
        execute_command cp "/etc/nginx/sites-available/$APP_NAME" "$backup_path/"
    fi
    
    # Save database
    if [ -f "$DB_PATH" ]; then
        execute_command cp "$DB_PATH" "$backup_path/"
    fi
    
    # Create backup info file
    execute_command tee "$backup_path/backup_info.txt" > /dev/null << EOF
Backup created: $(date)
Domain: $DOMAIN
App Directory: $APP_DIR
Database Path: $DB_PATH
Proxy Mode: $PROXY_MODE
Skip SSL: $SKIP_SSL
Skip Firewall: $SKIP_FIREWALL
System: $(lsb_release -d | cut -f2)
Kernel: $(uname -r)
EOF
    
    print_success "Backup created: $backup_path"
    
    # Cleanup old backups (keep last 5)
    execute_command find "$BACKUP_DIR" -name "gym-tracker-backup-*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
}

rollback_installation() {
    print_header "Rolling Back Installation"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "No backup directory found"
        exit 1
    fi
    
    # Find latest backup
    local latest_backup=$(find "$BACKUP_DIR" -name "gym-tracker-backup-*" -type d | sort -r | head -n 1)
    
    if [ -z "$latest_backup" ]; then
        print_error "No backup found in $BACKUP_DIR"
        exit 1
    fi
    
    print_sub "Found backup: $(basename $latest_backup)"
    
    # Show backup info if available
    if [ -f "$latest_backup/backup_info.txt" ]; then
        echo ""
        echo "Backup Information:"
        cat "$latest_backup/backup_info.txt"
        echo ""
    fi
    
    read -p "Continue with rollback? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Rollback cancelled."
        exit 0
    fi
    
    print_sub "Stopping services..."
    execute_command systemctl stop $APP_NAME 2>/dev/null || true
    execute_command systemctl stop nginx 2>/dev/null || true
    
    print_sub "Restoring application directory..."
    if [ -d "$APP_DIR" ]; then
        execute_command rm -rf "${APP_DIR}.rollback-temp"
        execute_command mv "$APP_DIR" "${APP_DIR}.rollback-temp"
    fi
    execute_command cp -r "$latest_backup" "$APP_DIR"
    
    print_sub "Restoring systemd service..."
    if [ -f "$latest_backup/$APP_NAME.service" ]; then
        execute_command cp "$latest_backup/$APP_NAME.service" "/etc/systemd/system/"
        execute_command systemctl daemon-reload
    fi
    
    print_sub "Restoring nginx configuration..."
    if [ -f "$latest_backup/$APP_NAME" ]; then
        execute_command cp "$latest_backup/$APP_NAME" "/etc/nginx/sites-available/"
        execute_command ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/"
    fi
    
    print_sub "Setting permissions..."
    execute_command chown -R $APP_NAME:$APP_NAME "$APP_DIR" 2>/dev/null || true
    
    print_sub "Starting services..."
    execute_command systemctl start $APP_NAME 2>/dev/null || true
    execute_command systemctl start nginx 2>/dev/null || true
    
    print_success "Rollback completed successfully!"
    print_warning "Don't forget to check your configuration and test the application"
    
    exit 0
}

update_system() {
    print_header "Updating System Packages"
    print_sub "Updating package lists..."
    execute_command apt-get update -qq
    print_sub "Upgrading existing packages..."
    execute_command apt-get upgrade -y -qq
    print_success "System updated successfully"
}

install_dependencies() {
    print_header "Installing System Dependencies"
    
    print_sub "Installing essential packages..."
    execute_command apt-get install -y -qq \
        curl \
        wget \
        gnupg2 \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        lsb-release \
        unzip \
        git \
        sqlite3 \
        nginx \
        ufw \
        fail2ban \
        htop \
        tree \
        nano \
        vim \
        jq \
        build-essential \
        logrotate \
        cron
    
    # Install certbot only if not in proxy mode
    if [ "$PROXY_MODE" = false ] && [ "$SKIP_SSL" = false ]; then
        print_sub "Installing Certbot for SSL..."
        execute_command apt-get install -y -qq certbot python3-certbot-nginx
    fi
    
    print_success "System dependencies installed"
}

install_nodejs() {
    print_header "Installing Node.js 18 LTS"
    
    print_sub "Adding NodeSource repository..."
    execute_command curl -fsSL https://deb.nodesource.com/setup_18.x | bash - &>/dev/null
    
    print_sub "Installing Node.js..."
    execute_command apt-get install -y -qq nodejs
    
    # Verify installation
    if [ "$DRY_RUN" = false ]; then
        node_version=$(node --version)
        npm_version=$(npm --version)
        
        print_sub "Node.js version: $node_version"
        print_sub "npm version: $npm_version"
    fi
    print_success "Node.js installed successfully"
}

create_app_user() {
    print_header "Creating Application User"
    
    # Create user if it doesn't exist
    if ! id "$APP_NAME" &>/dev/null; then
        execute_command useradd --system --home $APP_DIR --shell /bin/false --create-home $APP_NAME
        print_sub "Created system user: $APP_NAME"
    else
        print_sub "User '$APP_NAME' already exists"
    fi
    
    print_success "Application user configured"
}

download_application() {
    print_header "Setting Up Application Files"
    
    # Create application directory
    execute_command mkdir -p $APP_DIR
    cd $APP_DIR
    
    print_sub "Creating directory structure..."
    execute_command mkdir -p {public/{js,css},database,scripts,logs,backups,uploads}
    
    # Download from GitHub or use local files
    if [ -d ".git" ]; then
        print_sub "Updating existing git repository..."
        execute_command git pull origin main
    else
        print_sub "Cloning from GitHub..."
        execute_command git clone $GITHUB_REPO .
    fi
    
    print_success "Application files downloaded"
}

create_package_json() {
    print_header "Creating Package Configuration"
    
    print_sub "Generating package.json..."
    execute_command tee $APP_DIR/package.json > /dev/null << 'EOF'
{
  "name": "gym-tracker",
  "version": "2.1.0",
  "description": "A comprehensive gym workout tracking web application with SQLite database and modular frontend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "setup": "node scripts/setup.js",
    "backup": "node scripts/backup.js",
    "restore": "node scripts/restore.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "gym",
    "fitness",
    "workout",
    "tracker",
    "sqlite",
    "express",
    "nodejs",
    "admin",
    "multiuser"
  ],
  "author": "Olii83",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/Olii83/gymtracker.git"
  },
  "bugs": {
    "url": "https://github.com/Olii83/gymtracker/issues"
  },
  "homepage": "https://github.com/Olii83/gymtracker#readme"
}
EOF
    
    print_success "Package configuration created"
}

install_npm_dependencies() {
    print_header "Installing Node.js Dependencies"
    
    cd $APP_DIR
    print_sub "Running npm install..."
    execute_command npm install --production --silent
    
    print_success "Node.js dependencies installed"
}

create_env_file() {
    print_header "Creating Environment Configuration"
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    
    print_sub "Generating secure configuration..."
    execute_command tee $APP_DIR/.env > /dev/null << EOF
# Gym Tracker Environment Configuration
# Generated: $(date)

# Application Settings
NODE_ENV=production
PORT=3000
APP_NAME=Gym Tracker
APP_URL=https://$DOMAIN

# JWT Secret (Auto-generated secure key)
JWT_SECRET=$JWT_SECRET

# SQLite Database Configuration
DB_PATH=$DB_PATH

# Admin Settings
ADMIN_EMAIL=admin@$DOMAIN

# CORS Origins
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# Session & Security Settings
SESSION_TIMEOUT=24h
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads

# Backup Settings
BACKUP_RETENTION_DAYS=30
BACKUP_INTERVAL=daily

# Proxy Settings (when behind reverse proxy like Nginx Proxy Manager)
TRUST_PROXY=$PROXY_MODE
EOF

    if [ "$PROXY_MODE" = true ]; then
        print_sub "Adding proxy-specific configuration..."
        execute_command tee -a $APP_DIR/.env > /dev/null << EOF

# Nginx Proxy Manager Configuration
PROXY_MODE=true
BEHIND_PROXY=true
EOF
    fi
    
    print_success "Environment configuration created with secure JWT secret"
}

create_scripts() {
    print_header "Creating Management Scripts"
    
    print_sub "Creating backup script..."
    execute_command tee $APP_DIR/scripts/backup.js > /dev/null << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database/gym_tracker.db';
const BACKUP_DIR = './backups';

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Create backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `gym_tracker_${timestamp}.db`);

try {
    // Copy database file
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ Database backup created: ${backupPath}`);
    
    // Keep only last 30 backups
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('gym_tracker_') && file.endsWith('.db'))
        .sort()
        .reverse();
    
    if (backups.length > 30) {
        const oldBackups = backups.slice(30);
        oldBackups.forEach(backup => {
            fs.unlinkSync(path.join(BACKUP_DIR, backup));
            console.log(`🗑️  Removed old backup: ${backup}`);
        });
    }
    
} catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
}
EOF
    
    execute_command chmod +x $APP_DIR/scripts/backup.js
    
    print_sub "Creating monitoring script..."
    execute_command tee $APP_DIR/scripts/monitor.sh > /dev/null << 'EOF'
#!/bin/bash

APP_NAME="gym-tracker"
LOG_FILE="/var/log/gym-tracker-monitor.log"
MAX_LOG_SIZE=10485760  # 10MB

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Rotate log if it gets too big
if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE") -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
    touch "$LOG_FILE"
    log_message "Log rotated due to size limit"
fi

# Check if service is running
if ! systemctl is-active --quiet $APP_NAME; then
    log_message "ERROR: $APP_NAME service is not running, attempting restart..."
    systemctl restart $APP_NAME
    
    # Wait a bit and check again
    sleep 10
    if systemctl is-active --quiet $APP_NAME; then
        log_message "SUCCESS: $APP_NAME service restarted successfully"
    else
        log_message "CRITICAL: Failed to restart $APP_NAME service"
        # Send alert email if configured
        if command -v mail &> /dev/null; then
            echo "Gym Tracker service failed to restart on $(hostname)" | mail -s "Gym Tracker Alert" admin@localhost
        fi
    fi
fi

# Check if application responds
if ! curl -f -s http://localhost:3000/api/health > /dev/null; then
    log_message "WARNING: Application health check failed"
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    log_message "WARNING: Disk usage is at ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    log_message "WARNING: Memory usage is at ${MEMORY_USAGE}%"
fi

# Check database size and integrity
if [ -f "$APP_DIR/database/gym_tracker.db" ]; then
    DB_SIZE=$(du -h $APP_DIR/database/gym_tracker.db | cut -f1)
    log_message "INFO: Database size: $DB_SIZE"
    
    # Check database integrity (once per day)
    LAST_CHECK_FILE="/tmp/gym-tracker-db-check"
    if [ ! -f "$LAST_CHECK_FILE" ] || [ $(find "$LAST_CHECK_FILE" -mtime +1) ]; then
        if sqlite3 $APP_DIR/database/gym_tracker.db "PRAGMA integrity_check;" | grep -q "ok"; then
            log_message "INFO: Database integrity check passed"
            touch "$LAST_CHECK_FILE"
        else
            log_message "ERROR: Database integrity check failed"
        fi
    fi
fi

# Check SSL certificate expiration (if not in proxy mode)
if [ "$PROXY_MODE" != "true" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem | cut -d= -f2)
    CERT_EXPIRY_TIMESTAMP=$(date -d "$CERT_EXPIRY" +%s)
    CURRENT_TIMESTAMP=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (CERT_EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
    
    if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
        log_message "WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    fi
fi
EOF
    
    execute_command chmod +x $APP_DIR/scripts/monitor.sh
    
    print_sub "Creating update script..."
    execute_command tee $APP_DIR/scripts/update.sh > /dev/null << 'EOF'
#!/bin/bash

APP_NAME="gym-tracker"
APP_DIR="/var/www/$APP_NAME"

echo "🔄 Starting Gym Tracker update..."

# Create backup before update
echo "📦 Creating backup..."
cd $APP_DIR && node scripts/backup.js

# Stop service
echo "⏹️  Stopping service..."
systemctl stop $APP_NAME

# Update code
echo "📥 Updating code..."
cd $APP_DIR
git pull origin main

# Update dependencies
echo "📦 Updating dependencies..."
npm install --production

# Restart service
echo "▶️  Starting service..."
systemctl start $APP_NAME

# Check if service is running
if systemctl is-active --quiet $APP_NAME; then
    echo "✅ Update completed successfully!"
else
    echo "❌ Update failed - service not running"
    exit 1
fi
EOF
    
    execute_command chmod +x $APP_DIR/scripts/update.sh
    
    print_success "Management scripts created"
}

setup_database() {
    print_header "Setting Up SQLite Database"
    
    print_sub "Creating database directory..."
    execute_command mkdir -p $APP_DIR/database
    
    print_sub "Database will be created automatically on first server start"
    
    print_success "Database setup prepared"
}

set_permissions() {
    print_header "Setting File Permissions"
    
    print_sub "Setting ownership..."
    execute_command chown -R $APP_NAME:$APP_NAME $APP_DIR
    
    print_sub "Setting directory permissions..."
    execute_command find $APP_DIR -type d -exec chmod 755 {} \;
    
    print_sub "Setting file permissions..."
    execute_command find $APP_DIR -type f -exec chmod 644 {} \;
    
    # Make executable files
    execute_command chmod 755 $APP_DIR/server.js
    execute_command chmod 755 $APP_DIR/scripts/*.js
    execute_command chmod 755 $APP_DIR/scripts/*.sh
    
    # Set special permissions for data directories
    execute_command chmod 775 $APP_DIR/database
    execute_command chmod 775 $APP_DIR/logs
    execute_command chmod 775 $APP_DIR/backups
    execute_command chmod 775 $APP_DIR/uploads
    
    print_success "File permissions configured"
}

setup_nginx() {
    print_header "Configuring Nginx Web Server"
    
    if [ "$PROXY_MODE" = true ]; then
        print_sub "Proxy mode enabled - creating minimal nginx config..."
        execute_command tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
# Gym Tracker Nginx Configuration - Proxy Mode
# This config is for use behind Nginx Proxy Manager
server {
    listen 80;
    server_name localhost;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Trust proxy headers
    real_ip_header X-Forwarded-For;
    set_real_ip_from 10.0.0.0/8;
    set_real_ip_from 172.16.0.0/12;
    set_real_ip_from 192.168.0.0/16;
    
    # Main proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_redirect off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # API routes with rate limiting
    location /api {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static files with caching
    location /static {
        alias $APP_DIR/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Health check
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:3000;
    }
    
    # Block access to sensitive files
    location ~ /\\.env {
        deny all;
        return 404;
    }
    
    location ~ /database/ {
        deny all;
        return 404;
    }
    
    location ~ /backups/ {
        deny all;
        return 404;
    }
    
    location ~ /scripts/ {
        deny all;
        return 404;
    }
    
    location ~ /logs/ {
        deny all;
        return 404;
    }
}
EOF
    fi
    
    print_sub "Enabling site..."
    execute_command ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    print_sub "Removing default site..."
    execute_command rm -f /etc/nginx/sites-enabled/default
    
    print_sub "Testing Nginx configuration..."
    if [ "$DRY_RUN" = false ]; then
        if nginx -t; then
            print_success "Nginx configured successfully"
        else
            print_error "Nginx configuration test failed"
            exit 1
        fi
    else
        print_sub "[DRY-RUN] Would test nginx configuration"
        print_success "Nginx configuration would be created"
    fi
}

setup_systemd_service() {
    print_header "Setting Up Systemd Service"
    
    print_sub "Creating service file..."
    execute_command tee /etc/systemd/system/$APP_NAME.service > /dev/null << EOF
[Unit]
Description=Gym Tracker Web Application (Complete Edition)
Documentation=https://github.com/Olii83/gymtracker
After=network.target
Wants=network.target

[Service]
Type=simple
User=$APP_NAME
Group=$APP_NAME
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=NODE_OPTIONS="--max-old-space-size=512"
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -USR2 \$MAINPID
Restart=on-failure
RestartSec=10
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF
    
    print_sub "Reloading systemd daemon..."
    execute_command systemctl daemon-reload
    
    print_sub "Enabling service..."
    execute_command systemctl enable $APP_NAME
    
    print_success "Systemd service configured"
}

setup_ssl() {
    print_header "Setting Up SSL Certificate"
    
    if [ "$SKIP_SSL" = true ] || [ "$PROXY_MODE" = true ]; then
        print_warning "SSL setup skipped (--skip-ssl or --proxy-mode enabled)"
        return
    fi
    
    print_sub "Checking DNS resolution for $DOMAIN..."
    if [ "$DRY_RUN" = false ]; then
        if nslookup $DOMAIN &>/dev/null; then
            print_sub "DNS resolution successful"
            
            print_sub "Obtaining SSL certificate from Let's Encrypt..."
            if certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect --quiet; then
                print_success "SSL certificate obtained for $DOMAIN"
                
                # Setup auto-renewal
                execute_command tee /etc/cron.d/certbot-$APP_NAME > /dev/null << EOF
# Certbot renewal for $APP_NAME
0 2,14 * * * root /usr/bin/certbot renew --quiet --nginx --deploy-hook "systemctl reload nginx"
EOF
                
                print_sub "SSL auto-renewal configured"
            else
                print_warning "SSL certificate setup failed"
                print_sub "You can manually run: certbot --nginx -d $DOMAIN"
            fi
        else
            print_warning "DNS resolution failed for $DOMAIN"
            print_sub "Please configure DNS first, then run: certbot --nginx -d $DOMAIN"
        fi
    else
        print_sub "[DRY-RUN] Would check DNS and obtain SSL certificate"
    fi
}

setup_firewall() {
    print_header "Configuring UFW Firewall"
    
    if [ "$SKIP_FIREWALL" = true ]; then
        print_warning "Firewall setup skipped (--skip-firewall enabled)"
        return
    fi
    
    print_sub "Resetting UFW to defaults..."
    execute_command ufw --force reset &>/dev/null
    
    print_sub "Setting default policies..."
    execute_command ufw default deny incoming &>/dev/null
    execute_command ufw default allow outgoing &>/dev/null
    
    print_sub "Allowing SSH access..."
    execute_command ufw allow ssh &>/dev/null
    execute_command ufw allow 22/tcp &>/dev/null
    
    if [ "$PROXY_MODE" = false ]; then
        print_sub "Allowing HTTP and HTTPS..."
        execute_command ufw allow 80/tcp &>/dev/null
        execute_command ufw allow 443/tcp &>/dev/null
    else
        print_sub "Proxy mode: Only allowing local access to port 3000..."
        execute_command ufw allow from 192.168.0.0/16 to any port 3000 &>/dev/null
        execute_command ufw allow from 172.16.0.0/12 to any port 3000 &>/dev/null
        execute_command ufw allow from 10.0.0.0/8 to any port 3000 &>/dev/null
    fi
    
    print_sub "Setting up rate limiting for SSH..."
    execute_command ufw limit ssh &>/dev/null
    
    print_sub "Enabling UFW..."
    execute_command ufw --force enable &>/dev/null
    
    print_success "Firewall configured and enabled"
}

setup_fail2ban() {
    print_header "Configuring Fail2ban"
    
    print_sub "Creating Fail2ban configuration..."
    execute_command tee /etc/fail2ban/jail.local > /dev/null << EOF
[DEFAULT]
# Ban time in seconds (1 hour)
bantime = 3600

# Time frame for counting failures (10 minutes)
findtime = 600

# Number of failures before ban
maxretry = 3

# Email notifications
destemail = admin@$DOMAIN
sender = fail2ban@$DOMAIN

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[gym-tracker-api]
enabled = true
filter = gym-tracker-api
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 20
findtime = 300
bantime = 1800
EOF
    
    print_sub "Creating custom nginx filters..."
    execute_command tee /etc/fail2ban/filter.d/nginx-req-limit.conf > /dev/null << 'EOF'
[Definition]
failregex = limiting requests, excess: .* by zone .*, client: <HOST>
ignoreregex =
EOF
    
    execute_command tee /etc/fail2ban/filter.d/gym-tracker-api.conf > /dev/null << 'EOF'
[Definition]
failregex = ^<HOST> -.*"(GET|POST|PUT|DELETE) /api/.*" 40[0-9] .*$
            ^<HOST> -.*"(GET|POST|PUT|DELETE) /api/.*" 429 .*$
ignoreregex =
EOF
    
    print_sub "Enabling and starting Fail2ban..."
    execute_command systemctl enable fail2ban &>/dev/null
    execute_command systemctl restart fail2ban &>/dev/null
    
    print_success "Fail2ban configured and started"
}

setup_logrotate() {
    print_header "Setting Up Log Rotation"
    
    print_sub "Creating logrotate configuration..."
    execute_command tee /etc/logrotate.d/$APP_NAME > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 $APP_NAME $APP_NAME
    postrotate
        systemctl reload $APP_NAME >/dev/null 2>&1 || true
    endscript
}

/var/log/gym-tracker-monitor.log {
    weekly
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
}

/var/log/nginx/access.log /var/log/nginx/error.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
EOF
    
    print_success "Log rotation configured"
}

setup_monitoring() {
    print_header "Setting Up System Monitoring"
    
    print_sub "Creating monitoring cron jobs..."
    execute_command tee /etc/cron.d/$APP_NAME-monitor > /dev/null << EOF
# Monitor gym-tracker application every 5 minutes
*/5 * * * * root $APP_DIR/scripts/monitor.sh

# Health check every minute during business hours
* 8-18 * * 1-5 root curl -f -s http://localhost:3000/api/health > /dev/null || echo "\$(date): Health check failed during business hours" >> /var/log/gym-tracker-monitor.log

# Weekly system health report
0 9 * * 1 root $APP_DIR/scripts/monitor.sh && echo "Weekly system report generated" >> /var/log/gym-tracker-monitor.log

# Check for updates monthly
0 2 1 * * root cd $APP_DIR && git fetch && if [ \$(git rev-list HEAD...origin/main --count) -gt 0 ]; then echo "\$(date): Updates available" >> /var/log/gym-tracker-monitor.log; fi
EOF
    
    print_sub "Creating system status script..."
    execute_command tee $APP_DIR/scripts/status.sh > /dev/null << 'EOF'
#!/bin/bash

APP_NAME="gym-tracker"
APP_DIR="/var/www/$APP_NAME"

echo "🏋️‍♂️ Gym Tracker System Status"
echo "==============================="
echo

# Service status
echo "📊 Service Status:"
if systemctl is-active --quiet $APP_NAME; then
    echo "  ✅ Application: Running"
else
    echo "  ❌ Application: Stopped"
fi

if systemctl is-active --quiet nginx; then
    echo "  ✅ Nginx: Running"
else
    echo "  ❌ Nginx: Stopped"
fi

# System resources
echo
echo "💻 System Resources:"
echo "  Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "  Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
echo "  Load: $(uptime | awk -F'load average:' '{print $2}')"

# Database status
echo
echo "💾 Database Status:"
if [ -f "$APP_DIR/database/gym_tracker.db" ]; then
    DB_SIZE=$(du -h "$APP_DIR/database/gym_tracker.db" | cut -f1)
    echo "  ✅ Database: $DB_SIZE"
    
    # Check database integrity
    if sqlite3 "$APP_DIR/database/gym_tracker.db" "PRAGMA integrity_check;" | grep -q "ok"; then
        echo "  ✅ Integrity: OK"
    else
        echo "  ❌ Integrity: Failed"
    fi
else
    echo "  ❌ Database: Not found"
fi

# Network status
echo
echo "🌐 Network Status:"
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo "  ✅ Health Check: Passed"
else
    echo "  ❌ Health Check: Failed"
fi

# SSL certificate status (if not in proxy mode)
if [ "$PROXY_MODE" != "true" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo
    echo "🔒 SSL Certificate:"
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem | cut -d= -f2)
    CERT_EXPIRY_TIMESTAMP=$(date -d "$CERT_EXPIRY" +%s)
    CURRENT_TIMESTAMP=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (CERT_EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
    
    if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
        echo "  ✅ Expires in $DAYS_UNTIL_EXPIRY days"
    elif [ $DAYS_UNTIL_EXPIRY -gt 7 ]; then
        echo "  ⚠️  Expires in $DAYS_UNTIL_EXPIRY days (renewal recommended)"
    else
        echo "  ❌ Expires in $DAYS_UNTIL_EXPIRY days (urgent renewal needed)"
    fi
fi

# Recent errors
echo
echo "⚠️  Recent Errors (last 24h):"
ERROR_COUNT=$(journalctl -u $APP_NAME --since "24 hours ago" --grep "ERROR" --no-pager -q | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
    echo "  ✅ No errors found"
else
    echo "  ⚠️  $ERROR_COUNT errors found in logs"
    echo "     Check with: journalctl -u $APP_NAME --since '24 hours ago' --grep ERROR"
fi

echo
echo "==============================="
echo "Last updated: $(date)"
EOF
    
    execute_command chmod +x $APP_DIR/scripts/status.sh
    
    print_success "System monitoring configured"
}

setup_backup_automation() {
    print_header "Setting Up Automated Backups"
    
    print_sub "Creating backup cron jobs..."
    execute_command tee /etc/cron.d/$APP_NAME-backup > /dev/null << EOF
# Daily backup for gym-tracker database at 3 AM
0 3 * * * $APP_NAME cd $APP_DIR && node scripts/backup.js

# Weekly backup cleanup (keep last 4 weeks)
0 4 * * 0 $APP_NAME find $APP_DIR/backups -name "gym_tracker_*.db" -mtime +28 -delete

# Monthly system backup (full application)
0 2 1 * * root tar -czf $BACKUP_DIR/system-backup-\$(date +\%Y\%m\%d).tar.gz -C /var/www $APP_NAME --exclude="*/node_modules/*" --exclude="*/logs/*"

# Cleanup old system backups (keep last 3 months)
0 3 1 * * root find $BACKUP_DIR -name "system-backup-*.tar.gz" -mtime +90 -delete
EOF
    
    print_sub "Creating backup verification script..."
    execute_command tee $APP_DIR/scripts/verify-backup.sh > /dev/null << 'EOF'
#!/bin/bash

APP_DIR="/var/www/gym-tracker"
BACKUP_DIR="$APP_DIR/backups"

echo "🔍 Verifying database backups..."

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory not found: $BACKUP_DIR"
    exit 1
fi

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "gym_tracker_*.db" | wc -l)

if [ $BACKUP_COUNT -eq 0 ]; then
    echo "❌ No database backups found"
    exit 1
fi

echo "📊 Found $BACKUP_COUNT database backups"

# Check latest backup
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "gym_tracker_*.db" | sort | tail -n 1)
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
BACKUP_AGE=$(stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( (CURRENT_TIME - BACKUP_AGE) / 3600 ))

echo "🕐 Latest backup: $(basename "$LATEST_BACKUP") ($BACKUP_SIZE, ${AGE_HOURS}h old)"

if [ $AGE_HOURS -gt 30 ]; then
    echo "⚠️  Warning: Latest backup is older than 30 hours"
fi

# Verify backup integrity
if sqlite3 "$LATEST_BACKUP" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "✅ Latest backup integrity: OK"
else
    echo "❌ Latest backup integrity: FAILED"
    exit 1
fi

echo "✅ Backup verification completed successfully"
EOF
    
    execute_command chmod +x $APP_DIR/scripts/verify-backup.sh
    
    print_success "Automated backups configured (daily at 3 AM)"
}

create_favicon() {
    print_header "Creating Favicon"
    
    print_sub "Creating simple favicon..."
    # Create a simple text-based favicon placeholder
    execute_command echo "💪" > $APP_DIR/public/favicon.ico
    
    print_success "Favicon created"
}

optimize_system() {
    print_header "Optimizing System Settings"
    
    print_sub "Creating database optimization script..."
    execute_command tee $APP_DIR/scripts/optimize-db.js > /dev/null << 'EOF'
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database/gym_tracker.db';

console.log('🔧 Starting database optimization...');

const db = new sqlite3.Database(DB_PATH);

// Optimize SQLite for better performance
db.exec(`
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA temp_store = memory;
    PRAGMA mmap_size = 268435456;
    PRAGMA journal_mode = WAL;
    PRAGMA wal_autocheckpoint = 1000;
    PRAGMA optimize;
    VACUUM;
    ANALYZE;
`, (err) => {
    if (err) {
        console.error('❌ Database optimization failed:', err);
        process.exit(1);
    } else {
        console.log('✅ Database optimized successfully');
        
        // Show database stats
        db.get("SELECT COUNT(*) as users FROM users", (err, result) => {
            if (!err) console.log(`👥 Users: ${result.users}`);
        });
        
        db.get("SELECT COUNT(*) as workouts FROM workouts", (err, result) => {
            if (!err) console.log(`🏋️ Workouts: ${result.workouts}`);
        });
        
        db.get("SELECT COUNT(*) as exercises FROM exercises", (err, result) => {
            if (!err) console.log(`💪 Exercises: ${result.exercises}`);
        });
    }
    
    db.close();
});
EOF
    
    execute_command chmod +x $APP_DIR/scripts/optimize-db.js
    
    print_sub "Setting up system optimization cron job..."
    execute_command tee -a /etc/cron.d/$APP_NAME-monitor > /dev/null << EOF

# Optimize database weekly
0 3 * * 0 $APP_NAME cd $APP_DIR && node scripts/optimize-db.js >> /var/log/gym-tracker-monitor.log 2>&1
EOF
    
    print_success "System optimization configured"
}

start_services() {
    print_header "Starting Services"
    
    print_sub "Reloading systemd daemon..."
    execute_command systemctl daemon-reload
    
    print_sub "Starting Nginx..."
    execute_command systemctl restart nginx
    
    print_sub "Starting Gym Tracker application..."
    execute_command systemctl start $APP_NAME
    
    # Wait for services to start
    sleep 5
    
    if [ "$DRY_RUN" = false ]; then
        # Check service status
        if systemctl is-active --quiet $APP_NAME; then
            print_success "Gym Tracker application started successfully"
        else
            print_error "Failed to start Gym Tracker application"
            print_sub "Checking service status..."
            systemctl status $APP_NAME --no-pager
            print_sub "Checking logs..."
            journalctl -u $APP_NAME --no-pager -n 20
            exit 1
        fi
        
        if systemctl is-active --quiet nginx; then
            print_success "Nginx web server started successfully"
        else
            print_error "Failed to start Nginx"
            systemctl status nginx --no-pager
            exit 1
        fi
    else
        print_sub "[DRY-RUN] Would start services and check status"
    fi
    
    print_success "All services started successfully"
}

test_installation() {
    print_header "Testing Installation"
    
    if [ "$DRY_RUN" = true ]; then
        print_sub "[DRY-RUN] Would perform installation tests"
        return
    fi
    
    print_sub "Testing health endpoint..."
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        print_success "Health check passed"
    else
        print_warning "Health check failed"
    fi
    
    print_sub "Testing web interface..."
    if curl -f -s http://localhost:3000/ > /dev/null; then
        print_success "Web interface accessible"
    else
        print_warning "Web interface test failed"
    fi
    
    print_sub "Testing database connection..."
    if sqlite3 $DB_PATH "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_warning "Database connection test failed"
    fi
    
    # Test SSL if configured
    if [ "$PROXY_MODE" = false ] && [ "$SKIP_SSL" = false ] && [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        print_sub "Testing SSL certificate..."
        if curl -f -s https://$DOMAIN/api/health > /dev/null; then
            print_success "SSL certificate working"
        else
            print_warning "SSL test failed"
        fi
    fi
    
    print_success "Installation tests completed"
}

cleanup() {
    print_header "Cleaning Up"
    
    print_sub "Cleaning npm cache..."
    execute_command npm cache clean --force &>/dev/null || true
    
    print_sub "Cleaning apt cache..."
    execute_command apt-get autoremove -y &>/dev/null
    execute_command apt-get autoclean &>/dev/null
    
    print_sub "Setting final permissions..."
    execute_command chown -R $APP_NAME:$APP_NAME $APP_DIR
    
    # Create status command
    print_sub "Creating status command..."
    execute_command tee /usr/local/bin/gym-tracker-status > /dev/null << EOF
#!/bin/bash
$APP_DIR/scripts/status.sh
EOF
    execute_command chmod +x /usr/local/bin/gym-tracker-status
    
    print_success "Cleanup completed"
}

create_nginx_proxy_manager_instructions() {
    print_header "Creating Nginx Proxy Manager Instructions"
    
    execute_command tee $APP_DIR/NGINX_PROXY_MANAGER_SETUP.md > /dev/null << EOF
# Nginx Proxy Manager Setup for Gym Tracker

## Prerequisites
- Nginx Proxy Manager is running and accessible
- Your domain ($DOMAIN) is pointing to your Nginx Proxy Manager server
- Gym Tracker is installed and running on this server

## Setup Steps

### 1. Add Proxy Host in Nginx Proxy Manager

1. **Open Nginx Proxy Manager Admin Interface**
2. **Go to "Hosts" → "Proxy Hosts"**
3. **Click "Add Proxy Host"**

### 2. Configure Proxy Host

**Details Tab:**
- **Domain Names:** $DOMAIN
- **Scheme:** http
- **Forward Hostname/IP:** $(hostname -I | awk '{print $1}')
- **Forward Port:** 3000
- **Cache Assets:** ✅ Enabled
- **Block Common Exploits:** ✅ Enabled
- **Websockets Support:** ✅ Enabled

### 3. SSL Configuration

**SSL Tab:**
- **SSL Certificate:** Request a new SSL Certificate
- **Force SSL:** ✅ Enabled
- **HTTP/2 Support:** ✅ Enabled
- **HSTS Enabled:** ✅ Enabled
- **Email:** admin@$DOMAIN

### 4. Advanced Configuration (Optional)

**Advanced Tab:**
\`\`\`nginx
# Rate Limiting
limit_req_zone \$binary_remote_addr zone=gym_api:10m rate=10r/s;
limit_req zone=gym_api burst=20 nodelay;

# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Proxy Headers for better logging
proxy_set_header X-Real-IP \$remote_addr;
proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto \$scheme;
proxy_set_header Host \$host;

# Timeouts
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
proxy_send_timeout 300s;

# API specific rate limiting
location /api {
    limit_req zone=gym_api burst=10 nodelay;
    proxy_pass http://$(hostname -I | awk '{print $1}'):3000;
}
\`\`\`

## Verification

1. **Test Health Check:** https://$DOMAIN/api/health
2. **Test Web Interface:** https://$DOMAIN
3. **Check SSL:** https://$DOMAIN should have a valid certificate

## Firewall Configuration

The firewall has been configured to only allow access from private IP ranges to port 3000.
Make sure your Nginx Proxy Manager server is in one of these ranges:
- 192.168.0.0/16
- 172.16.0.0/12
- 10.0.0.0/8

## Troubleshooting

### 502 Bad Gateway
1. Check if Gym Tracker is running: \`systemctl status gym-tracker\`
2. Check if port 3000 is accessible: \`curl http://localhost:3000/api/health\`
3. Check firewall rules: \`ufw status\`

### SSL Issues
1. Verify domain DNS points to your Nginx Proxy Manager
2. Check Let's Encrypt rate limits
3. Ensure port 80 and 443 are open on your Nginx Proxy Manager server

## Commands

- **Check Status:** \`gym-tracker-status\`
- **View Logs:** \`journalctl -u gym-tracker -f\`
- **Restart Service:** \`systemctl restart gym-tracker\`
EOF
    
    print_success "Nginx Proxy Manager instructions created at $APP_DIR/NGINX_PROXY_MANAGER_SETUP.md"
}

display_summary() {
    clear
    echo -e "${PURPLE}"
    echo "🏋️‍♂️ =================================================================="
    echo "🏋️‍♀️              GYM TRACKER INSTALLATION COMPLETE!              "
    echo "🏋️‍♂️ =================================================================="
    echo -e "${NC}"
    echo
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}🔍 DRY RUN COMPLETED - NO CHANGES WERE MADE${NC}"
        echo
        echo "This was a dry run. To perform the actual installation, run:"
        echo "  sudo $0 $(echo "$@" | sed 's/--dry-run//g')"
        echo
        return
    fi
    
    echo -e "${GREEN}✅ INSTALLATION SUCCESSFUL!${NC}"
    echo
    echo "📊 Installation Summary:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}📱 Application:${NC}     Gym Tracker v2.1 (Complete Edition)"
    echo -e "${CYAN}📍 Location:${NC}        $APP_DIR"
    echo -e "${CYAN}💾 Database:${NC}        SQLite ($DB_PATH)"
    echo -e "${CYAN}🌐 Web Server:${NC}      Nginx with $([ "$PROXY_MODE" = true ] && echo "Proxy Manager" || echo "SSL") support"
    echo -e "${CYAN}👤 System User:${NC}     $APP_NAME"
    echo -e "${CYAN}🛡️  Security:${NC}        UFW Firewall + Fail2ban"
    echo -e "${CYAN}📊 Monitoring:${NC}      Automated health checks"
    echo -e "${CYAN}💿 Backups:${NC}         Daily automated backups"
    echo -e "${CYAN}🔄 Updates:${NC}         Rollback capability enabled"
    echo
    echo "🌐 Access URLs:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$PROXY_MODE" = true ]; then
        echo -e "${GREEN}🌐 Local Access:${NC}    http://$(hostname -I | awk '{print $1}'):3000"
        echo -e "${GREEN}🔗 API Base:${NC}        http://$(hostname -I | awk '{print $1}'):3000/api"
        echo -e "${GREEN}❤️  Health Check:${NC}   http://$(hostname -I | awk '{print $1}'):3000/api/health"
        echo -e "${YELLOW}📋 NPM Setup:${NC}       See $APP_DIR/NGINX_PROXY_MANAGER_SETUP.md"
        echo -e "${YELLOW}🌍 Public Access:${NC}    Configure in Nginx Proxy Manager for https://$DOMAIN"
    else
        if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
            echo -e "${GREEN}🔒 Main Site:${NC}       https://$DOMAIN"
            echo -e "${GREEN}🔗 API Base:${NC}        https://$DOMAIN/api"
            echo -e "${GREEN}❤️  Health Check:${NC}   https://$DOMAIN/api/health"
        else
            echo -e "${YELLOW}🌐 Main Site:${NC}       http://$DOMAIN"
            echo -e "${YELLOW}🔗 API Base:${NC}        http://$DOMAIN/api"
            echo -e "${YELLOW}❤️  Health Check:${NC}   http://$DOMAIN/api/health"
            echo -e "${YELLOW}⚠️  SSL:${NC}            Not configured (run certbot manually)"
        fi
    fi
    
    echo
    echo "🔐 Default Admin Account:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${RED}👤 Username:${NC}        admin"
    echo -e "${RED}🔑 Password:${NC}        admin123"
    echo -e "${RED}⚠️  IMPORTANT:${NC}       CHANGE THIS PASSWORD IMMEDIATELY!"
    echo
    echo "📁 Important Files & Directories:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}📂 Application:${NC}     $APP_DIR"
    echo -e "${CYAN}💾 Database:${NC}        $DB_PATH"
    echo -e "${CYAN}⚙️  Nginx Config:${NC}   /etc/nginx/sites-available/$APP_NAME"
    echo -e "${CYAN}🔧 Service:${NC}         /etc/systemd/system/$APP_NAME.service"
    echo -e "${CYAN}🌍 Environment:${NC}     $APP_DIR/.env"
    echo -e "${CYAN}📋 Logs:${NC}            /var/log/nginx/ & journalctl -u $APP_NAME"
    echo -e "${CYAN}💿 Backups:${NC}         $APP_DIR/backups/"
    echo -e "${CYAN}🛠️  Scripts:${NC}         $APP_DIR/scripts/"
    echo
    echo "🔧 Management Commands:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}📊 Status:${NC}          gym-tracker-status"
    echo -e "${GREEN}▶️  Start:${NC}           systemctl start $APP_NAME"
    echo -e "${RED}⏹️  Stop:${NC}            systemctl stop $APP_NAME"
    echo -e "${YELLOW}🔄 Restart:${NC}         systemctl restart $APP_NAME"
    echo -e "${BLUE}📋 Logs:${NC}            journalctl -u $APP_NAME -f"
    echo -e "${PURPLE}🌐 Nginx:${NC}           systemctl restart nginx"
    echo -e "${CYAN}🔄 Update:${NC}          $APP_DIR/scripts/update.sh"
    echo
    echo "💾 Database Management:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}🔍 Access DB:${NC}       sqlite3 $DB_PATH"
    echo -e "${CYAN}💿 Manual Backup:${NC}   cd $APP_DIR && node scripts/backup.js"
    echo -e "${CYAN}⚡ Optimize DB:${NC}     cd $APP_DIR && node scripts/optimize-db.js"
    echo -e "${CYAN}✅ Verify Backup:${NC}   $APP_DIR/scripts/verify-backup.sh"
    echo -e "${CYAN}📊 Monitor:${NC}         tail -f /var/log/gym-tracker-monitor.log"
    echo
    echo "🔄 Rollback & Recovery:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}🔙 Rollback:${NC}        $0 --rollback"
    echo -e "${YELLOW}📦 Backups:${NC}         ls -la $BACKUP_DIR/"
    echo -e "${YELLOW}🕐 Restore Point:${NC}   Created before installation"
    echo
    echo "🛡️ Security & Maintenance:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}🔥 Firewall:${NC}        ufw status"
    echo -e "${GREEN}🚫 Fail2ban:${NC}        fail2ban-client status"
    if [ "$PROXY_MODE" = false ] && [ "$SKIP_SSL" = false ]; then
        echo -e "${GREEN}🔒 SSL Status:${NC}      certbot certificates"
        echo -e "${GREEN}🔄 SSL Renew:${NC}       certbot renew"
    fi
    echo -e "${GREEN}🔍 Security Scan:${NC}   lynis audit system"
    echo
    echo "📈 Monitoring & Health:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}❤️  Health Check:${NC}   curl http://localhost:3000/api/health"
    echo -e "${BLUE}📊 Full Status:${NC}     gym-tracker-status"
    echo -e "${BLUE}📋 System Status:${NC}   systemctl status $APP_NAME nginx"
    echo -e "${BLUE}💾 Disk Usage:${NC}      df -h"
    echo -e "${BLUE}📈 Performance:${NC}     htop"
    echo
    echo "🗄️ Backup & Recovery:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}📅 Schedule:${NC}        Daily at 3:00 AM (automatic)"
    echo -e "${CYAN}📍 DB Backups:${NC}      $APP_DIR/backups/"
    echo -e "${CYAN}📍 System Backups:${NC}  $BACKUP_DIR/"
    echo -e "${CYAN}🔍 List Backups:${NC}    ls -la $APP_DIR/backups/"
    echo -e "${CYAN}♻️  Retention:${NC}       30 days (automatic cleanup)"
    echo -e "${CYAN}✅ Verify:${NC}          $APP_DIR/scripts/verify-backup.sh"
    echo
    if [ "$PROXY_MODE" = true ]; then
        echo "🌐 Nginx Proxy Manager Configuration:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "${YELLOW}📋 Setup Guide:${NC}     $APP_DIR/NGINX_PROXY_MANAGER_SETUP.md"
        echo -e "${YELLOW}🎯 Target IP:${NC}       $(hostname -I | awk '{print $1}')"
        echo -e "${YELLOW}🚪 Target Port:${NC}     3000"
        echo -e "${YELLOW}🌍 Domain:${NC}          $DOMAIN"
        echo -e "${YELLOW}🔒 SSL:${NC}             Configure in NPM (Let's Encrypt)"
        echo
    fi
    
    echo "🏋️‍♂️ =================================================================="
    echo
    
    if systemctl is-active --quiet nginx && systemctl is-active --quiet $APP_NAME; then
        echo -e "${GREEN}🎉 INSTALLATION SUCCESSFUL! 🎉${NC}"
        echo
        if [ "$PROXY_MODE" = true ]; then
            echo -e "📱 ${YELLOW}Local Access: http://$(hostname -I | awk '{print $1}'):3000${NC}"
            echo -e "🌍 ${YELLOW}Setup Nginx Proxy Manager for public access${NC}"
            echo -e "📖 ${CYAN}Read: $APP_DIR/NGINX_PROXY_MANAGER_SETUP.md${NC}"
        else
            if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
                echo -e "📱 ${GREEN}Your Gym Tracker is now running at: https://$DOMAIN${NC}"
            else
                echo -e "📱 ${YELLOW}Your Gym Tracker is now running at: http://$DOMAIN${NC}"
            fi
        fi
        echo
        echo "🚀 Next Steps:"
        echo "1. 🌐 Open your browser and visit your website"
        echo "2. 🔐 Login with admin/admin123"
        echo "3. ⚠️  Change the admin password immediately"
        echo "4. 👥 Create your first user accounts"
        echo "5. 💪 Start tracking your fitness journey!"
        if [ "$PROXY_MODE" = true ]; then
            echo "6. 🌍 Configure Nginx Proxy Manager for public access"
        else
            echo "6. 🔒 Verify SSL certificate if applicable"
        fi
    else
        echo -e "${RED}⚠️ INSTALLATION COMPLETED WITH ISSUES ⚠️${NC}"
        echo
        echo "Some services may not be running properly."
        echo "🔍 Check service status with:"
        echo "   gym-tracker-status"
        echo "   systemctl status $APP_NAME nginx"
        echo "   journalctl -u $APP_NAME -n 50"
    fi
    
    echo
    echo "📖 Documentation & Support:"
    echo "   🌐 GitHub: https://github.com/Olii83/gymtracker"
    echo "   🐛 Issues: https://github.com/Olii83/gymtracker/issues"
    echo "   📚 Wiki: https://github.com/Olii83/gymtracker/wiki"
    echo
    echo "⚡ Quick Commands Reference:"
    echo "   📊 Status: gym-tracker-status"
    echo "   🔄 Restart: systemctl restart $APP_NAME"
    echo "   📋 Logs: journalctl -u $APP_NAME -f"
    echo "   💿 Backup: cd $APP_DIR && node scripts/backup.js"
    echo "   🔄 Update: $APP_DIR/scripts/update.sh"
    if [ "$PROXY_MODE" = false ] && [ "$SKIP_SSL" = false ]; then
        echo "   🔒 SSL: certbot renew"
    fi
    echo "   🔙 Rollback: $0 --rollback"
    echo
    echo -e "${PURPLE}🏋️‍♂️ Happy training with Gym Tracker! 🏋️‍♀️${NC}"
    echo "=================================================================="
}

# Main installation function
main() {
    show_header
    
    # Parse arguments if any were provided
    if [ $# -gt 0 ]; then
        parse_args "$@"
    fi
    
    # Handle rollback mode
    if [ "$ROLLBACK_MODE" = true ]; then
        rollback_installation
        exit 0
    fi
    
    # Show configuration
    echo "Configuration:"
    echo "  Domain: $DOMAIN"
    echo "  App Directory: $APP_DIR"
    echo "  Proxy Mode: $PROXY_MODE"
    echo "  Skip SSL: $SKIP_SSL"
    echo "  Skip Firewall: $SKIP_FIREWALL"
    echo "  Dry Run: $DRY_RUN"
    echo
    
    if [ "$DRY_RUN" = false ]; then
        read -p "Continue with installation? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Installation cancelled."
            exit 0
        fi
    fi
    
    echo
    print_status "Starting Gym Tracker installation..."
    echo
    
    # Run installation steps
    check_requirements
    create_backup
    update_system
    install_dependencies
    install_nodejs
    create_app_user
    download_application
    create_package_json
    install_npm_dependencies
    create_env_file
    create_scripts
    setup_database
    set_permissions
    setup_nginx
    setup_systemd_service
    
    # Conditional steps
    if [ "$SKIP_SSL" = false ]; then
        setup_ssl
    fi
    
    if [ "$SKIP_FIREWALL" = false ]; then
        setup_firewall
    fi
    
    setup_fail2ban
    setup_logrotate
    setup_monitoring
    setup_backup_automation
    create_favicon
    optimize_system
    
    # Create Nginx Proxy Manager instructions if in proxy mode
    if [ "$PROXY_MODE" = true ]; then
        create_nginx_proxy_manager_instructions
    fi
    
    start_services
    test_installation
    cleanup
    display_summary
}

# Error handling
set -e
trap 'print_error "Installation failed at line $LINENO. Check the output above for details."' ERR

# Execute main function with all arguments
main "$@"s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:3000;
    }
}
EOF
    else
        print_sub "Creating full nginx configuration..."
        execute_command tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
# Gym Tracker Nginx Configuration
server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Client settings
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Main proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_redirect off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75
