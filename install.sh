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
NC='\033[0m'

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

# Dry run function
execute_command() {
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY-RUN] Would execute: $*"
    else
        "$@"
    fi
}

show_header() {
    clear
    echo -e "${PURPLE}"
    echo "========================================================"
    echo "           GYM TRACKER INSTALLATION SCRIPT            "
    echo "                  COMPLETE EDITION v2.1               "
    echo "========================================================"
    echo -e "${NC}"
    echo "Features:"
    echo "• SQLite database (no MySQL/MariaDB needed)"
    echo "• Node.js backend with Express"
    echo "• Modern modular frontend"
    echo "• Nginx reverse proxy with SSL"
    echo "• Security (UFW firewall, Fail2ban)"
    echo "• Monitoring and automated backups"
    echo "• Complete admin panel"
    echo "• Multi-user support"
    echo "• Rollback functionality"
    echo "• Nginx Proxy Manager support"
    echo "========================================================"
    echo
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

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --domain=*)
                DOMAIN="${1#*=}"
                ;;
            --app-dir=*)
                APP_DIR="${1#*=}"
                DB_PATH="$APP_DIR/database/gym_tracker.db"
                ;;
            --skip-ssl)
                SKIP_SSL=true
                ;;
            --skip-firewall)
                SKIP_FIREWALL=true
                ;;
            --proxy-mode)
                PROXY_MODE=true
                ;;
            --rollback)
                ROLLBACK_MODE=true
                ;;
            --dry-run)
                DRY_RUN=true
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown argument: '$1'"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
        shift
    done
}

check_requirements() {
    print_header "Checking System Requirements"
    
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
    print_sub "Root access: OK"
    
    if [ ! -f /etc/debian_version ]; then
        print_error "This script is designed for Debian/Ubuntu systems"
        exit 1
    fi
    print_sub "Operating system: OK $(lsb_release -d | cut -f2)"
    
    if ! ping -c 1 google.com &> /dev/null; then
        print_error "No internet connection available"
        exit 1
    fi
    print_sub "Internet connection: OK"
    
    available_space=$(df / | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 2097152 ]; then
        print_error "Insufficient disk space. At least 2GB required."
        exit 1
    fi
    print_sub "Disk space: OK $(df -h / | tail -1 | awk '{print $4}') available"
    
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
    
    if [ -f "/etc/systemd/system/$APP_NAME.service" ]; then
        execute_command cp "/etc/systemd/system/$APP_NAME.service" "$backup_path/"
    fi
    
    if [ -f "/etc/nginx/sites-available/$APP_NAME" ]; then
        execute_command cp "/etc/nginx/sites-available/$APP_NAME" "$backup_path/"
    fi
    
    if [ -f "$DB_PATH" ]; then
        execute_command cp "$DB_PATH" "$backup_path/"
    fi
    
    cat > "$backup_path/backup_info.txt" << EOF
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
    execute_command find "$BACKUP_DIR" -name "gym-tracker-backup-*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
}

rollback_installation() {
    print_header "Rolling Back Installation"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "No backup directory found"
        exit 1
    fi
    
    local latest_backup=$(find "$BACKUP_DIR" -name "gym-tracker-backup-*" -type d | sort -r | head -n 1)
    
    if [ -z "$latest_backup" ]; then
        print_error "No backup found in $BACKUP_DIR"
        exit 1
    fi
    
    print_sub "Found backup: $(basename $latest_backup)"
    
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
    
    execute_command mkdir -p $APP_DIR
    cd $APP_DIR
    
    if [ -d ".git" ]; then
        print_sub "Found existing git repository, updating..."
        execute_command git fetch origin
        execute_command git reset --hard origin/main
        execute_command git clean -fd
    else
        NON_STANDARD_FILES=$(find $APP_DIR -maxdepth 1 -type f 2>/dev/null | wc -l)
        if [ $NON_STANDARD_FILES -gt 0 ]; then
            print_sub "Directory contains files, creating backup..."
            BACKUP_DIR_NAME="backup-$(date +%Y%m%d-%H%M%S)"
            execute_command mkdir -p "$APP_DIR/$BACKUP_DIR_NAME"
            execute_command find $APP_DIR -maxdepth 1 -type f -exec mv {} "$APP_DIR/$BACKUP_DIR_NAME/" \; 2>/dev/null || true
        fi
        
        print_sub "Cloning from GitHub..."
        TEMP_CLONE_DIR="/tmp/gym-tracker-clone-$$"
        execute_command git clone $GITHUB_REPO "$TEMP_CLONE_DIR"
        execute_command cp -r "$TEMP_CLONE_DIR"/. "$APP_DIR/"
        execute_command rm -rf "$TEMP_CLONE_DIR"
    fi
    
    print_sub "Creating required directory structure..."
    execute_command mkdir -p {public/{js,css},database,scripts,logs,backups,uploads}
    
    if [ ! -f "$APP_DIR/server.js" ] && [ ! -f "$APP_DIR/package.json" ]; then
        print_warning "Core application files not found, creating minimal structure..."
        
        if [ ! -f "$APP_DIR/server.js" ]; then
            cat > "$APP_DIR/server.js" << 'SERVERJS_EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/api/health', function(req, res) {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, function() {
    console.log('Gym Tracker running on port ' + PORT);
});
SERVERJS_EOF
        fi
        
        if [ ! -f "$APP_DIR/public/index.html" ]; then
            cat > "$APP_DIR/public/index.html" << 'INDEXHTML_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gym Tracker</title>
</head>
<body>
    <h1>Gym Tracker</h1>
    <p>Welcome to Gym Tracker! The application is starting up...</p>
    <p>Please check back in a moment or contact your administrator.</p>
</body>
</html>
INDEXHTML_EOF
        fi
    fi
    
    print_success "Application files set up successfully"
}

create_package_json() {
    print_header "Creating Package Configuration"
    
    print_sub "Generating package.json..."
    cat > "$APP_DIR/package.json" << 'PACKAGEJSON_EOF'
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
PACKAGEJSON_EOF
    
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
    
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    
    print_sub "Generating secure configuration..."
    cat > "$APP_DIR/.env" << ENV_EOF
# Gym Tracker Environment Configuration
NODE_ENV=production
PORT=3000
APP_NAME=Gym Tracker
APP_URL=https://$DOMAIN
JWT_SECRET=$JWT_SECRET
DB_PATH=$DB_PATH
ADMIN_EMAIL=admin@$DOMAIN
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
SESSION_TIMEOUT=24h
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads
BACKUP_RETENTION_DAYS=30
BACKUP_INTERVAL=daily
TRUST_PROXY=$PROXY_MODE
ENV_EOF

    if [ "$PROXY_MODE" = true ]; then
        print_sub "Adding proxy-specific configuration..."
        cat >> "$APP_DIR/.env" << 'PROXY_ENV_EOF'
PROXY_MODE=true
BEHIND_PROXY=true
PROXY_ENV_EOF
    fi
    
    print_success "Environment configuration created with secure JWT secret"
}

create_scripts() {
    print_header "Creating Management Scripts"
    
    print_sub "Creating backup script..."
    cat > "$APP_DIR/scripts/backup.js" << 'BACKUPJS_EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database/gym_tracker.db';
const BACKUP_DIR_LOCAL = './backups';

console.log('Starting database backup...');

try {
    if (!fs.existsSync(BACKUP_DIR_LOCAL)) {
        fs.mkdirSync(BACKUP_DIR_LOCAL, { recursive: true });
        console.log('Created backup directory:', BACKUP_DIR_LOCAL);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR_LOCAL, 'gym_tracker_' + timestamp + '.db');

    fs.copyFileSync(DB_PATH, backupPath);
    console.log('Database backup created:', backupPath);
    
    const backups = fs.readdirSync(BACKUP_DIR_LOCAL)
        .filter(function(file) { 
            return file.startsWith('gym_tracker_') && file.endsWith('.db'); 
        })
        .sort()
        .reverse();
    
    console.log('Found', backups.length, 'existing backups');
    
    if (backups.length > 30) {
        const oldBackups = backups.slice(30);
        console.log('Removing', oldBackups.length, 'old backups');
        oldBackups.forEach(function(backup) {
            fs.unlinkSync(path.join(BACKUP_DIR_LOCAL, backup));
            console.log('Removed old backup:', backup);
        });
    }
    
    console.log('Backup completed successfully');
    
} catch (error) {
    console.error('Backup failed:', error.message);
    process.exit(1);
}
BACKUPJS_EOF
    
    execute_command chmod +x $APP_DIR/scripts/backup.js
    
    print_sub "Creating monitoring script..."
    cat > "$APP_DIR/scripts/monitor.sh" << 'MONITORSH_EOF'
#!/bin/bash

APP_NAME="gym-tracker"
LOG_FILE="/var/log/gym-tracker-monitor.log"
MAX_LOG_SIZE=10485760

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE") -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
    touch "$LOG_FILE"
    log_message "Log rotated due to size limit"
fi

if ! systemctl is-active --quiet $APP_NAME; then
    log_message "ERROR: $APP_NAME service is not running, attempting restart..."
    systemctl restart $APP_NAME
    
    sleep 10
    if systemctl is-active --quiet $APP_NAME; then
        log_message "SUCCESS: $APP_NAME service restarted successfully"
    else
        log_message "CRITICAL: Failed to restart $APP_NAME service"
    fi
fi

if ! curl -f -s http://localhost:3000/api/health > /dev/null; then
    log_message "WARNING: Application health check failed"
fi

DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    log_message "WARNING: Disk usage is at ${DISK_USAGE}%"
fi

MEMORY_PERCENT=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ $MEMORY_PERCENT -gt 90 ]; then
    log_message "WARNING: Memory usage is at ${MEMORY_PERCENT}%"
fi
MONITORSH_EOF
    
    execute_command chmod +x $APP_DIR/scripts/monitor.sh
    
    print_sub "Creating status script..."
    cat > "$APP_DIR/scripts/status.sh" << 'STATUSSH_EOF'
#!/bin/bash

APP_NAME="gym-tracker"
APP_DIR="/var/www/$APP_NAME"

echo "Gym Tracker System Status"
echo "==============================="
echo

echo "Service Status:"
if systemctl is-active --quiet $APP_NAME; then
    echo "  Application: Running"
else
    echo "  Application: Stopped"
fi

if systemctl is-active --quiet nginx; then
    echo "  Nginx: Running"
else
    echo "  Nginx: Stopped"
fi

echo
echo "System Resources:"
echo "  Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "  Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"

echo
echo "Database Status:"
if [ -f "$APP_DIR/database/gym_tracker.db" ]; then
    DB_SIZE=$(du -h "$APP_DIR/database/gym_tracker.db" | cut -f1)
    echo "  Database: $DB_SIZE"
    
    if sqlite3 "$APP_DIR/database/gym_tracker.db" "PRAGMA integrity_check;" | grep -q "ok"; then
        echo "  Integrity: OK"
    else
        echo "  Integrity: Failed"
    fi
else
    echo "  Database: Not found"
fi

echo
echo "Network Status:"
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo "  Health Check: Passed"
else
    echo "  Health Check: Failed"
fi

echo
echo "==============================="
echo "Last updated: $(date)"
STATUSSH_EOF
    
    execute_command chmod +x $APP_DIR/scripts/status.sh
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
    
    execute_command chmod 755 $APP_DIR/server.js
    execute_command chmod 755 $APP_DIR/scripts/*.js
    execute_command chmod 755 $APP_DIR/scripts/*.sh
    
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
        cat > "/etc/nginx/sites-available/$APP_NAME" << 'NGINX_PROXY_EOF'
server {
    listen 80;
    server_name localhost;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }
    
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:3000;
    }
}
NGINX_PROXY_EOF
    else
        print_sub "Creating full nginx configuration..."
        cat > "/etc/nginx/sites-available/$APP_NAME" << NGINX_FULL_EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    client_max_body_size 10M;
    
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
    }
    
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:3000;
    }
}
NGINX_FULL_EOF
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
    cat > "/etc/systemd/system/$APP_NAME.service" << SYSTEMD_EOF
[Unit]
Description=Gym Tracker Web Application
After=network.target

[Service]
Type=simple
User=$APP_NAME
Group=$APP_NAME
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF
    
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
    cat > "/etc/fail2ban/jail.local" << FAIL2BAN_EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
FAIL2BAN_EOF
    
    print_sub "Enabling and starting Fail2ban..."
    execute_command systemctl enable fail2ban &>/dev/null
    execute_command systemctl restart fail2ban &>/dev/null
    
    print_success "Fail2ban configured and started"
}

setup_logrotate() {
    print_header "Setting Up Log Rotation"
    
    print_sub "Creating logrotate configuration..."
    cat > "/etc/logrotate.d/$APP_NAME" << LOGROTATE_EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 $APP_NAME $APP_NAME
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
LOGROTATE_EOF
    
    print_success "Log rotation configured"
}

setup_monitoring() {
    print_header "Setting Up System Monitoring"
    
    print_sub "Creating monitoring cron jobs..."
    cat > "/etc/cron.d/$APP_NAME-monitor" << CRON_MONITOR_EOF
*/5 * * * * root $APP_DIR/scripts/monitor.sh
CRON_MONITOR_EOF
    
    print_success "System monitoring configured"
}

setup_backup_automation() {
    print_header "Setting Up Automated Backups"
    
    print_sub "Creating backup cron jobs..."
    cat > "/etc/cron.d/$APP_NAME-backup" << CRON_BACKUP_EOF
0 3 * * * $APP_NAME cd $APP_DIR && node scripts/backup.js
0 4 * * 0 $APP_NAME find $APP_DIR/backups -name "gym_tracker_*.db" -mtime +28 -delete
CRON_BACKUP_EOF
    
    print_success "Automated backups configured (daily at 3 AM)"
}

create_nginx_proxy_manager_instructions() {
    print_header "Creating Nginx Proxy Manager Instructions"
    
    cat > "$APP_DIR/NGINX_PROXY_MANAGER_SETUP.md" << NPM_SETUP_EOF
# Nginx Proxy Manager Setup for Gym Tracker

## Setup Steps

1. **Add Proxy Host in Nginx Proxy Manager**
2. **Configure:**
   - Domain: $DOMAIN
   - Forward IP: $(hostname -I | awk '{print $1}')
   - Forward Port: 3000
3. **Enable SSL with Let's Encrypt**

## Test URLs
- Health Check: https://$DOMAIN/api/health
- Main Site: https://$DOMAIN

## Commands
- Status: gym-tracker-status
- Logs: journalctl -u gym-tracker -f
NPM_SETUP_EOF
    
    print_success "Nginx Proxy Manager instructions created"
}

start_services() {
    print_header "Starting Services"
    
    print_sub "Reloading systemd daemon..."
    execute_command systemctl daemon-reload
    
    print_sub "Starting Nginx..."
    execute_command systemctl restart nginx
    
    print_sub "Starting Gym Tracker application..."
    execute_command systemctl start $APP_NAME
    
    sleep 5
    
    if [ "$DRY_RUN" = false ]; then
        if systemctl is-active --quiet $APP_NAME; then
            print_success "Gym Tracker application started successfully"
        else
            print_error "Failed to start Gym Tracker application"
            systemctl status $APP_NAME --no-pager
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
    
    print_sub "Creating status command..."
    cat > "/usr/local/bin/gym-tracker-status" << 'STATUS_CMD_EOF'
#!/bin/bash
/var/www/gym-tracker/scripts/status.sh
STATUS_CMD_EOF
    execute_command chmod +x /usr/local/bin/gym-tracker-status
    
    print_success "Cleanup completed"
}

display_summary() {
    clear
    echo -e "${PURPLE}"
    echo "========================================================"
    echo "              GYM TRACKER INSTALLATION COMPLETE!              "
    echo "========================================================"
    echo -e "${NC}"
    echo
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}DRY RUN COMPLETED - NO CHANGES WERE MADE${NC}"
        echo
        echo "This was a dry run. To perform the actual installation, run:"
        echo "  sudo $0 $(echo "$@" | sed 's/--dry-run//g')"
        echo
        return
    fi
    
    echo -e "${GREEN}INSTALLATION SUCCESSFUL!${NC}"
    echo
    echo "Installation Summary:"
    echo "Application:     Gym Tracker v2.1"
    echo "Location:        $APP_DIR"
    echo "Database:        SQLite ($DB_PATH)"
    echo "Web Server:      Nginx"
    echo "System User:     $APP_NAME"
    echo
    echo "Access URLs:"
    
    if [ "$PROXY_MODE" = true ]; then
        echo "Local Access:    http://$(hostname -I | awk '{print $1}'):3000"
        echo "API Base:        http://$(hostname -I | awk '{print $1}'):3000/api"
        echo "Health Check:    http://$(hostname -I | awk '{print $1}'):3000/api/health"
        echo "NPM Setup:       See $APP_DIR/NGINX_PROXY_MANAGER_SETUP.md"
        echo "Public Access:   Configure in Nginx Proxy Manager for https://$DOMAIN"
    else
        if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
            echo "Main Site:       https://$DOMAIN"
            echo "API Base:        https://$DOMAIN/api"
            echo "Health Check:    https://$DOMAIN/api/health"
        else
            echo "Main Site:       http://$DOMAIN"
            echo "API Base:        http://$DOMAIN/api"
            echo "Health Check:    http://$DOMAIN/api/health"
        fi
    fi
    
    echo
    echo "Default Admin Account:"
    echo "Username:        admin"
    echo "Password:        admin123"
    echo "IMPORTANT:       CHANGE THIS PASSWORD IMMEDIATELY!"
    echo
    echo "Management Commands:"
    echo "Status:          gym-tracker-status"
    echo "Start:           systemctl start $APP_NAME"
    echo "Stop:            systemctl stop $APP_NAME"
    echo "Restart:         systemctl restart $APP_NAME"
    echo "Logs:            journalctl -u $APP_NAME -f"
    echo "Rollback:        $0 --rollback"
    echo
    
    if systemctl is-active --quiet nginx && systemctl is-active --quiet $APP_NAME; then
        echo -e "${GREEN}INSTALLATION SUCCESSFUL!${NC}"
        echo
        if [ "$PROXY_MODE" = true ]; then
            echo "Local Access: http://$(hostname -I | awk '{print $1}'):3000"
            echo "Setup Nginx Proxy Manager for public access"
            echo "Read: $APP_DIR/NGINX_PROXY_MANAGER_SETUP.md"
        else
            if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
                echo "Your Gym Tracker is now running at: https://$DOMAIN"
            else
                echo "Your Gym Tracker is now running at: http://$DOMAIN"
            fi
        fi
        echo
        echo "Next Steps:"
        echo "1. Open your browser and visit your website"
        echo "2. Login with admin/admin123"
        echo "3. Change the admin password immediately"
        echo "4. Start tracking your fitness journey!"
    else
        echo -e "${RED}INSTALLATION COMPLETED WITH ISSUES${NC}"
        echo
        echo "Some services may not be running properly."
        echo "Check service status with: gym-tracker-status"
    fi
    
    echo
    echo "Happy training with Gym Tracker!"
    echo "========================================================"
}

main() {
    if [ $# -gt 0 ]; then
        parse_args "$@"
    fi
    
    show_header
    
    if [ "$ROLLBACK_MODE" = true ]; then
        rollback_installation
        exit 0
    fi
    
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
    
    if [ "$PROXY_MODE" = true ]; then
        create_nginx_proxy_manager_instructions
    fi
    
    start_services
    test_installation
    cleanup
    display_summary
}

set -e
trap 'print_error "Installation failed at line $LINENO. Check the output above for details."' ERR

main "$@"
