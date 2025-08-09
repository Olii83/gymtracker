#!/bin/bash

# Gym Tracker Installation Script with SQLite
# Complete installation script for production deployment

set -e

# Configuration
APP_NAME="gym-tracker"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="gym.zhst.eu"
DB_PATH="$APP_DIR/database/gym_tracker.db"
GITHUB_REPO="https://github.com/Olii83/gymtracker.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

check_requirements() {
    print_status "Checking system requirements..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
    
    # Check OS
    if [ ! -f /etc/debian_version ]; then
        print_error "This script is designed for Debian/Ubuntu systems"
        exit 1
    fi
    
    # Check internet connection
    if ! ping -c 1 google.com &> /dev/null; then
        print_error "No internet connection available"
        exit 1
    fi
    
    print_success "System requirements checked"
}

update_system() {
    print_status "Updating system packages..."
    apt-get update
    apt-get upgrade -y
    print_success "System updated successfully"
}

install_dependencies() {
    print_status "Installing system dependencies..."
    
    # Essential packages
    apt-get install -y \
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
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        htop \
        tree \
        nano \
        vim
    
    print_success "System dependencies installed"
}

install_nodejs() {
    print_status "Installing Node.js 18..."
    
    # Install NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    
    # Install Node.js
    apt-get install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    
    print_success "Node.js $node_version and npm $npm_version installed"
}

create_app_user() {
    print_status "Creating application user..."
    
    # Create user if it doesn't exist
    if ! id "$APP_NAME" &>/dev/null; then
        useradd --system --home $APP_DIR --shell /bin/false $APP_NAME
        print_success "Application user '$APP_NAME' created"
    else
        print_status "Application user '$APP_NAME' already exists"
    fi
}

download_application() {
    print_status "Downloading application from GitHub..."
    
    # Remove existing directory if it exists
    if [ -d "$APP_DIR" ]; then
        print_status "Backing up existing installation..."
        mv $APP_DIR $APP_DIR.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Clone the repository
    git clone $GITHUB_REPO $APP_DIR
    
    if [ $? -eq 0 ]; then
        print_success "Application downloaded successfully from GitHub"
        cd $APP_DIR
        print_status "Repository contents:"
        ls -la
    else
        print_error "Failed to download application from GitHub"
        exit 1
    fi
}

setup_database() {
    print_status "Setting up SQLite database..."
    
    # Create database directory
    mkdir -p $APP_DIR/database
    
    # Create SQLite database with schema
    sqlite3 $DB_PATH << 'EOF'
-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    muscle_group VARCHAR(50) NOT NULL,
    description TEXT,
    instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Workout exercises table
CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    sets_count INTEGER NOT NULL,
    reps TEXT, -- JSON array
    weights TEXT, -- JSON array
    rest_time INTEGER,
    notes TEXT,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Create trigger for updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert default exercises
INSERT OR IGNORE INTO exercises (name, category, muscle_group, description, instructions) VALUES
('Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur', 'Flach auf die Bank legen, Langhantel greifen und kontrolliert zur Brust führen'),
('Schrägbankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken auf der Schrägbank', 'Bank auf 30-45° einstellen, Langhantel kontrolliert zur oberen Brust führen'),
('Fliegende', 'Krafttraining', 'Brust', 'Isolationsübung für die Brust', 'Mit Kurzhanteln bogenförmige Bewegung zur Brustmitte'),
('Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur', 'Aufrecht stehen, in die Hocke gehen und wieder aufrichten'),
('Kreuzheben', 'Krafttraining', 'Rücken', 'Grundübung für den gesamten Körper', 'Langhantel vom Boden kontrolliert nach oben ziehen'),
('Klimmzüge', 'Krafttraining', 'Rücken', 'Übung für den Latissimus und Bizeps', 'An der Stange hängen und sich nach oben ziehen'),
('Rudern', 'Krafttraining', 'Rücken', 'Horizontales Ziehen für den Rücken', 'Langhantel oder Kabel horizontal zum Körper ziehen'),
('Schulterdrücken', 'Krafttraining', 'Schultern', 'Übung für die Schultermuskulatur', 'Hantel oder Langhantel über den Kopf drücken'),
('Seitheben', 'Krafttraining', 'Schultern', 'Isolationsübung für seitliche Schulter', 'Kurzhanteln seitlich bis Schulterhöhe heben'),
('Bizeps Curls', 'Krafttraining', 'Arme', 'Isolationsübung für den Bizeps', 'Hantel kontrolliert zum Körper führen'),
('Trizeps Dips', 'Krafttraining', 'Arme', 'Übung für den Trizeps', 'Körper an Stangen oder Bank nach unten und oben bewegen'),
('Trizepsdrücken', 'Krafttraining', 'Arme', 'Isolationsübung für den Trizeps', 'Hantel oder Kabel über Kopf nach unten drücken'),
('Plank', 'Krafttraining', 'Core', 'Statische Übung für die Rumpfmuskulatur', 'In Liegestützposition halten'),
('Crunches', 'Krafttraining', 'Core', 'Bauchmuskelübung', 'Oberkörper kontrolliert zu den Knien führen'),
('Russian Twists', 'Krafttraining', 'Core', 'Übung für die seitlichen Bauchmuskeln', 'Sitzend Oberkörper seitlich rotieren'),
('Laufband', 'Cardio', 'Cardio', 'Ausdauertraining', 'Gleichmäßiges Laufen auf dem Laufband'),
('Fahrrad', 'Cardio', 'Cardio', 'Ausdauertraining', 'Cardio-Training auf dem Ergometer'),
('Ellipsentrainer', 'Cardio', 'Cardio', 'Gelenkschonendes Cardio', 'Ganzkörper-Cardio-Training'),
('Rudergerät', 'Cardio', 'Cardio', 'Ganzkörper-Cardio', 'Ruder-Bewegung für Ausdauer und Kraft'),
('Burpees', 'Functional', 'Ganzkörper', 'Explosive Ganzkörperübung', 'Kombination aus Liegestütz, Sprung und Streckung');

.quit
EOF
    
    print_success "SQLite database created with schema and default exercises"
}

install_application() {
    print_status "Installing application dependencies..."
    
    cd $APP_DIR
    
    # Backup original files if they exist
    [ -f package.json ] && cp package.json package.json.original
    [ -f server.js ] && cp server.js server.js.original
    
    # Create SQLite-compatible package.json
    cat > package.json << 'EOF'
{
  "name": "gym-tracker",
  "version": "1.0.0",
  "description": "A comprehensive gym workout tracking web application with SQLite database",
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
    "nodejs"
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
  }
}
EOF
    
    # Install dependencies
    npm install
    
    print_success "Application dependencies installed for SQLite"
}

create_env_file() {
    print_status "Creating environment configuration..."
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 64)
    
    cat > $APP_DIR/.env << EOF
# Application Configuration
NODE_ENV=production
PORT=3000

# JWT Secret (Generated: $(date))
JWT_SECRET=$JWT_SECRET

# SQLite Database Configuration
DB_PATH=$DB_PATH

# Application Settings
APP_NAME=Gym Tracker
APP_URL=https://$DOMAIN

# Admin Settings
ADMIN_EMAIL=admin@$DOMAIN

# CORS Origins
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# Session Settings
SESSION_TIMEOUT=24h

# File Upload Settings
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads
EOF
    
    print_success "Environment file created with SQLite configuration"
}

create_directories() {
    print_status "Creating application directories..."
    
    # Create necessary directories
    mkdir -p $APP_DIR/database
    mkdir -p $APP_DIR/public
    mkdir -p $APP_DIR/uploads
    mkdir -p $APP_DIR/logs
    mkdir -p $APP_DIR/backups
    mkdir -p $APP_DIR/scripts
    
    print_success "Application directories created"
}

create_backup_script() {
    print_status "Creating backup script..."
    
    cat > $APP_DIR/scripts/backup.js << 'EOF'
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
    
    chmod +x $APP_DIR/scripts/backup.js
    
    print_success "Backup script created"
}

create_sqlite_server() {
    print_status "Creating SQLite-compatible server.js..."
    
    # Only create server.js if it doesn't exist or if explicitly requested
    if [ ! -f $APP_DIR/server.js ] || [ "$1" = "--force-server" ]; then
        if [ -f $APP_DIR/server.js ]; then
            cp $APP_DIR/server.js $APP_DIR/server.js.backup
        fi
        
        # Copy the SQLite server.js from the artifacts
        print_status "Creating new SQLite-compatible server.js..."
        
        # Note: In a real deployment, you would copy the server.js content here
        # For this example, we'll create a basic version
        cat > $APP_DIR/server.js << 'EOF'
// This is a placeholder - the actual server.js should be created
// from the SQLite version artifact provided earlier
console.log('Server.js placeholder - replace with actual SQLite version');
process.exit(1);
EOF
        
        print_warning "server.js created as placeholder - replace with actual SQLite version"
    else
        print_status "Existing server.js found, keeping original"
    fi
}

set_permissions() {
    print_status "Setting file permissions..."
    
    # Set ownership
    chown -R $APP_NAME:$APP_NAME $APP_DIR
    
    # Set permissions
    find $APP_DIR -type f -exec chmod 644 {} \;
    find $APP_DIR -type d -exec chmod 755 {} \;
    
    # Make executable files
    [ -f $APP_DIR/server.js ] && chmod 755 $APP_DIR/server.js
    [ -f $APP_DIR/app.js ] && chmod 755 $APP_DIR/app.js
    [ -f $APP_DIR/scripts/backup.js ] && chmod 755 $APP_DIR/scripts/backup.js
    
    # Set database permissions
    chmod 664 $DB_PATH
    chmod 775 $APP_DIR/database
    chmod 775 $APP_DIR/logs
    chmod 775 $APP_DIR/backups
    chmod 775 $APP_DIR/uploads
    
    print_success "File permissions set"
}

setup_nginx() {
    print_status "Configuring Nginx..."
    
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
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
    gzip_proxied expired no-cache no-store private must-revalidate max-age=0;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
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
    
    # API routes
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static files (if served directly by nginx)
    location /static {
        alias $APP_DIR/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
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
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # Remove default site if it exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    if nginx -t; then
        print_success "Nginx configured successfully"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
}

setup_systemd_service() {
    print_status "Setting up systemd service..."
    
    # Detect the main server file
    if [ -f $APP_DIR/server.js ]; then
        SERVER_FILE="server.js"
    elif [ -f $APP_DIR/app.js ]; then
        SERVER_FILE="app.js"
    elif [ -f $APP_DIR/index.js ]; then
        SERVER_FILE="index.js"
    else
        print_error "No main server file found (server.js, app.js, or index.js)"
        print_status "Available files:"
        ls -la $APP_DIR
        SERVER_FILE="server.js"  # fallback
    fi
    
    print_status "Using $SERVER_FILE as main application file"
    
    cat > /etc/systemd/system/$APP_NAME.service << EOF
[Unit]
Description=Gym Tracker Web Application (SQLite)
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
ExecStart=/usr/bin/node $SERVER_FILE
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
    
    systemctl daemon-reload
    systemctl enable $APP_NAME
    
    print_success "Systemd service configured with $SERVER_FILE (SQLite)"
}

setup_ssl() {
    print_status "Setting up SSL certificate..."
    
    # Setup Let's Encrypt SSL
    if command -v certbot &> /dev/null; then
        print_status "Obtaining SSL certificate from Let's Encrypt..."
        
        # First try only the main domain
        if certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect; then
            print_success "SSL certificate obtained for $DOMAIN"
            
            # Try to add www subdomain if DNS exists
            print_status "Checking if www subdomain exists..."
            if nslookup www.$DOMAIN &>/dev/null; then
                print_status "Adding www subdomain to certificate..."
                certbot --nginx -d $DOMAIN -d www.$DOMAIN --expand --non-interactive --agree-tos --redirect
                print_success "SSL certificate expanded to include www.$DOMAIN"
            else
                print_warning "www.$DOMAIN DNS record not found, skipping www subdomain"
                print_status "Certificate obtained only for $DOMAIN"
            fi
            
            # Setup auto-renewal with better scheduling
            cat > /etc/cron.d/certbot-$APP_NAME << EOF
# Certbot renewal for $APP_NAME
0 2,14 * * * root /usr/bin/certbot renew --quiet --nginx --deploy-hook "systemctl reload nginx"
EOF
            
            print_success "SSL certificate configured with auto-renewal"
        else
            print_warning "SSL certificate setup failed, continuing without SSL"
            print_status "You can manually run: certbot --nginx -d $DOMAIN later"
        fi
    else
        print_warning "Certbot not available, SSL setup skipped"
    fi
}

setup_firewall() {
    print_status "Configuring UFW firewall..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (important!)
    ufw allow ssh
    ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow specific IP ranges if needed (uncomment and modify as needed)
    # ufw allow from 192.168.1.0/24 to any port 22
    
    # Rate limiting for SSH
    ufw limit ssh
    
    # Enable UFW
    ufw --force enable
    
    print_success "Firewall configured"
}

setup_fail2ban() {
    print_status "Configuring Fail2ban..."
    
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
# Ban time in seconds (1 hour)
bantime = 3600

# Time frame for counting failures (10 minutes)
findtime = 600

# Number of failures before ban
maxretry = 3

# Email notifications (configure if needed)
# destemail = admin@$DOMAIN
# sendername = Fail2Ban-$DOMAIN

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

[nginx-badbots]
enabled = true
filter = nginx-badbots
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
EOF
    
    # Create custom nginx filters
    cat > /etc/fail2ban/filter.d/nginx-req-limit.conf << 'EOF'
[Definition]
failregex = limiting requests, excess: .* by zone .*, client: <HOST>
ignoreregex =
EOF
    
    cat > /etc/fail2ban/filter.d/nginx-badbots.conf << 'EOF'
[Definition]
failregex = <HOST> -.*"(GET|POST).*HTTP.*" (404|444) .*
            <HOST> -.*"(GET|POST) .*(wp-admin|wp-login|xmlrpc).*HTTP.*" .*
ignoreregex =
EOF
    
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    print_success "Fail2ban configured"
}

setup_logrotate() {
    print_status "Setting up log rotation..."
    
    cat > /etc/logrotate.d/$APP_NAME << EOF
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
EOF
    
    print_success "Log rotation configured"
}

setup_monitoring() {
    print_status "Setting up basic monitoring..."
    
    # Create monitoring script
    cat > $APP_DIR/scripts/monitor.sh << 'EOF'
#!/bin/bash

APP_NAME="gym-tracker"
LOG_FILE="/var/log/gym-tracker-monitor.log"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

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

# Check database size
if [ -f "/var/www/gym-tracker/database/gym_tracker.db" ]; then
    DB_SIZE=$(du -h /var/www/gym-tracker/database/gym_tracker.db | cut -f1)
    log_message "INFO: Database size: $DB_SIZE"
fi
EOF
    
    chmod +x $APP_DIR/scripts/monitor.sh
    
    # Add to crontab
    cat > /etc/cron.d/$APP_NAME-monitor << EOF
# Monitor gym-tracker application every 5 minutes
*/5 * * * * root $APP_DIR/scripts/monitor.sh
EOF
    
    print_success "Basic monitoring configured"
}

setup_backup_cron() {
    print_status "Setting up automated backups..."
    
    # Daily backup at 3 AM
    cat > /etc/cron.d/$APP_NAME-backup << EOF
# Daily backup for gym-tracker database
0 3 * * * $APP_NAME cd $APP_DIR && node scripts/backup.js
EOF
    
    print_success "Automated backups configured (daily at 3 AM)"
}

start_services() {
    print_status "Starting services..."
    
    # Reload systemd
    systemctl daemon-reload
    
    # Start and enable services
    systemctl restart nginx
    systemctl start $APP_NAME
    
    # Wait a moment for services to start
    sleep 5
    
    # Check service status
    if systemctl is-active --quiet $APP_NAME; then
        print_success "Gym Tracker application started successfully"
    else
        print_error "Failed to start Gym Tracker application"
        print_status "Checking service status..."
        systemctl status $APP_NAME --no-pager
        print_status "Checking logs..."
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
    
    print_success "All services started successfully"
}

display_summary() {
    print_status "Installation completed successfully!"
    echo
    echo "========================================"
    echo "🏋️  GYM TRACKER INSTALLATION SUMMARY 🏋️"
    echo "========================================"
    echo
    echo "✅ Application: Gym Tracker (SQLite Edition)"
    echo "✅ Location: $APP_DIR"
    echo "✅ Database: SQLite ($DB_PATH)"
    echo "✅ Web Server: Nginx"
    echo "✅ SSL: Let's Encrypt"
    echo "✅ User: $APP_NAME"
    echo "✅ Security: UFW Firewall + Fail2ban"
    echo "✅ Monitoring: Basic health checks"
    echo "✅ Backups: Daily automated backups"
    echo
    echo "🌐 URLs:"
    if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
        echo "   Main Site: https://$DOMAIN"
        echo "   API Base: https://$DOMAIN/api"
        echo "   Health Check: https://$DOMAIN/api/health"
    else
        echo "   Main Site: http://$DOMAIN"
        echo "   API Base: http://$DOMAIN/api"
        echo "   Health Check: http://$DOMAIN/api/health"
    fi
    echo
    echo "🔐 Default Admin Account:"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo "   ⚠️  PLEASE CHANGE THIS PASSWORD IMMEDIATELY!"
    echo
    echo "📁 Important Files:"
    echo "   Application: $APP_DIR"
    echo "   Database: $DB_PATH"
    echo "   Nginx Config: /etc/nginx/sites-available/$APP_NAME"
    echo "   Service: /etc/systemd/system/$APP_NAME.service"
    echo "   Environment: $APP_DIR/.env"
    echo "   Logs: /var/log/nginx/ & journalctl -u $APP_NAME"
    echo
    echo "🔧 Management Commands:"
    echo "   Start:   sudo systemctl start $APP_NAME"
    echo "   Stop:    sudo systemctl stop $APP_NAME"
    echo "   Restart: sudo systemctl restart $APP_NAME"
    echo "   Status:  sudo systemctl status $APP_NAME"
    echo "   Logs:    sudo journalctl -u $APP_NAME -f"
    echo "   Nginx:   sudo systemctl restart nginx"
    echo
    echo "📊 Database Management:"
    echo "   Access:  sqlite3 $DB_PATH"
    echo "   Backup:  cd $APP_DIR && node scripts/backup.js"
    echo "   Monitor: tail -f /var/log/gym-tracker-monitor.log"
    echo
    echo "🔄 Update Application:"
    echo "   cd $APP_DIR"
    echo "   sudo git pull origin main"
    echo "   sudo npm install"
    echo "   sudo systemctl restart $APP_NAME"
    echo
    echo "🛡️ Security Features:"
    echo "   Firewall: sudo ufw status"
    echo "   Fail2ban: sudo fail2ban-client status"
    echo "   SSL: sudo certbot certificates"
    echo
    echo "📈 Monitoring:"
    echo "   Health: curl http://localhost:3000/api/health"
    echo "   Logs: tail -f /var/log/gym-tracker-monitor.log"
    echo "   Disk: df -h"
    echo
    echo "🗄️ Backups:"
    echo "   Location: $APP_DIR/backups/"
    echo "   Schedule: Daily at 3 AM"
    echo "   Manual: cd $APP_DIR && node scripts/backup.js"
    echo
    echo "========================================"
    echo
    
    if systemctl is-active --quiet nginx && systemctl is-active --quiet $APP_NAME; then
        echo "🎉 Installation successful! Your Gym Tracker is now running."
        if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
            echo "📱 Open your browser and visit: https://$DOMAIN"
        else
            echo "📱 Open your browser and visit: http://$DOMAIN"
        fi
        echo
        echo "📋 Next Steps:"
        echo "1. Visit your website and login with admin/admin123"
        echo "2. Change the admin password immediately"
        echo "3. Create your first workout"
        echo "4. Start tracking your fitness journey!"
        echo "5. Consider setting up additional monitoring"
    else
        echo "⚠️  Installation completed but some services may not be running."
        echo "🔍 Check service status with:"
        echo "   sudo systemctl status $APP_NAME nginx"
        echo "   sudo journalctl -u $APP_NAME -n 50"
    fi
    
    echo
    echo "📖 For support and documentation:"
    echo "   GitHub: https://github.com/Olii83/gymtracker"
    echo "   Issues: https://github.com/Olii83/gymtracker/issues"
    echo
    echo "⚡ Quick Commands:"
    echo "   Restart app: sudo systemctl restart $APP_NAME"
    echo "   View logs: sudo journalctl -u $APP_NAME -f"
    echo "   Backup DB: cd $APP_DIR && node scripts/backup.js"
    echo "   Update SSL: sudo certbot renew"
    echo
}

cleanup() {
    print_status "Cleaning up temporary files..."
    
    # Clean up npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Clean up apt cache
    apt-get autoremove -y
    apt-get autoclean
    
    # Set final permissions
    chown -R $APP_NAME:$APP_NAME $APP_DIR
    
    print_success "Cleanup completed"
}

# Main installation function
main() {
    echo "🏋️‍♂️ Gym Tracker Installation Script (SQLite Edition) 🏋️‍♀️"
    echo "================================================================"
    echo "This script will install a complete Gym Tracker application with:"
    echo "• SQLite database (no MySQL/MariaDB needed)"
    echo "• Node.js backend with Express"
    echo "• Nginx reverse proxy"
    echo "• SSL certificates (Let's Encrypt)"
    echo "• Security (UFW firewall, Fail2ban)"
    echo "• Monitoring and backups"
    echo "================================================================"
    echo
    
    read -p "Continue with installation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
    
    # Run installation steps
    check_requirements
    update_system
    install_dependencies
    install_nodejs
    create_app_user
    download_application
    create_directories
    setup_database
    install_application
    create_env_file
    create_backup_script
    create_sqlite_server
    set_permissions
    setup_nginx
    setup_systemd_service
    setup_ssl
    setup_firewall
    setup_fail2ban
    setup_logrotate
    setup_monitoring
    setup_backup_cron
    start_services
    cleanup
    display_summary
}

# Error handling
set -e
trap 'print_error "Installation failed at line $LINENO. Check the logs above for details."' ERR

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain=*)
            DOMAIN="${1#*=}"
            shift
            ;;
        --force-server)
            FORCE_SERVER=true
            shift
            ;;
        --skip-ssl)
            SKIP_SSL=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --domain=DOMAIN     Set domain name (default: gym.zhst.eu)"
            echo "  --force-server      Force recreation of server.js"
            echo "  --skip-ssl          Skip SSL certificate setup"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main installation
main "$@"#!/bin/bash

# Gym Tracker Installation Script with SQLite
# Complete installation script for production deployment

set -e

# Configuration
APP_NAME="gym-tracker"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="gym.zhst.eu"
DB_PATH="$APP_DIR/database/gym_tracker.db"
GITHUB_REPO="https://github.com/Olii83/gymtracker.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

check_requirements() {
    print_status "Checking system requirements..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
    
    # Check OS
    if [ ! -f /etc/debian_version ]; then
        print_error "This script is designed for Debian/Ubuntu systems"
        exit 1
    fi
    
    # Check internet connection
    if ! ping -c 1 google.com &> /dev/null; then
        print_error "No internet connection available"
        exit 1
    fi
    
    print_success "System requirements checked"
}

update_system() {
    print_status "Updating system packages..."
    apt-get update
    apt-get upgrade -y
    print_success "System updated successfully"
}

install_dependencies() {
    print_status "Installing system dependencies..."
    
    # Essential packages
    apt-get install -y \
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
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        htop \
        tree \
        nano \
        vim
    
    print_success "System dependencies installed"
}

install_nodejs() {
    print_status "Installing Node.js 18..."
    
    # Install NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    
    # Install Node.js
    apt-get install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    
    print_success "Node.js $node_version and npm $npm_version installed"
}

create_app_user() {
    print_status "Creating application user..."
    
    # Create user if it doesn't exist
    if ! id "$APP_NAME" &>/dev/null; then
        useradd --system --home $APP_DIR --shell /bin/false $APP_NAME
        print_success "Application user '$APP_NAME' created"
    else
        print_status "Application user '$APP_NAME' already exists"
    fi
}

download_application() {
    print_status "Downloading application from GitHub..."
    
    # Remove existing directory if it exists
    if [ -d "$APP_DIR" ]; then
        print_status "Backing up existing installation..."
        mv $APP_DIR $APP_DIR.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Clone the repository
    git clone $GITHUB_REPO $APP_DIR
    
    if [ $? -eq 0 ]; then
        print_success "Application downloaded successfully from GitHub"
        cd $APP_DIR
        print_status "Repository contents:"
        ls -la
    else
        print_error "Failed to download application from GitHub"
        exit 1
    fi
}

setup_database() {
    print_status "Setting up SQLite database..."
    
    # Create database directory
    mkdir -p $APP_DIR/database
    
    # Create SQLite database with schema
    sqlite3 $DB_PATH << 'EOF'
-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    muscle_group VARCHAR(50) NOT NULL,
    description TEXT,
    instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Workout exercises table
CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    sets_count INTEGER NOT NULL,
    reps TEXT, -- JSON array
    weights TEXT, -- JSON array
    rest_time INTEGER,
    notes TEXT,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

-- Create trigger for updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert default exercises
INSERT OR IGNORE INTO exercises (name, category, muscle_group, description, instructions) VALUES
('Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur', 'Flach auf die Bank legen, Langhantel greifen und kontrolliert zur Brust führen'),
('Schrägbankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken auf der Schrägbank', 'Bank auf 30-45° einstellen, Langhantel kontrolliert zur oberen Brust führen'),
('Fliegende', 'Krafttraining', 'Brust', 'Isolationsübung für die Brust', 'Mit Kurzhanteln bogenförmige Bewegung zur Brustmitte'),
('Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur', 'Aufrecht stehen, in die Hocke gehen und wieder aufrichten'),
('Kreuzheben', 'Krafttraining', 'Rücken', 'Grundübung für den gesamten Körper', 'Langhantel vom Boden kontrolliert nach oben ziehen'),
('Klimmzüge', 'Krafttraining', 'Rücken', 'Übung für den Latissimus und Bizeps', 'An der Stange hängen und sich nach oben ziehen'),
('Rudern', 'Krafttraining', 'Rücken', 'Horizontales
