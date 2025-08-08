#!/bin/bash

# Gym Tracker Installation Script for Debian 12 LXC Container
# This script automatically installs and configures the Gym Tracker application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="gym-tracker"
APP_DIR="/var/www/$APP_NAME"
DB_NAME="gym_tracker"
DB_USER="gym_tracker"
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
DOMAIN="gym.zhst.eu"
NODE_VERSION="18"

# Functions
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

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

update_system() {
    print_status "Updating system packages..."
    apt update && apt upgrade -y
    print_success "System updated successfully"
}

install_dependencies() {
    print_status "Installing system dependencies..."
    
    # Install basic packages
    apt install -y \
        curl \
        wget \
        gnupg2 \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        lsb-release \
        unzip \
        git \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban
    
    print_success "System dependencies installed"
}

install_nodejs() {
    print_status "Installing Node.js $NODE_VERSION..."
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
    apt install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    
    print_success "Node.js $node_version and npm $npm_version installed"
}

install_mariadb() {
    print_status "Installing MariaDB..."
    
    apt install -y mariadb-server mariadb-client
    
    # Secure MariaDB installation
    mysql_secure_installation_auto
    
    systemctl enable mariadb
    systemctl start mariadb
    
    print_success "MariaDB installed and configured"
}

mysql_secure_installation_auto() {
    print_status "Securing MariaDB installation..."
    
    # Set root password and secure installation
    mysql -e "UPDATE mysql.user SET Password=PASSWORD('$(openssl rand -base64 32)') WHERE User='root'"
    mysql -e "DELETE FROM mysql.user WHERE User=''"
    mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1')"
    mysql -e "DROP DATABASE IF EXISTS test"
    mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%'"
    mysql -e "FLUSH PRIVILEGES"
    
    print_success "MariaDB secured"
}

setup_database() {
    print_status "Setting up database..."
    
    # Create database and user
    mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"
    
    print_success "Database created and configured"
}

create_app_user() {
    print_status "Creating application user..."
    
    # Create system user for the application
    useradd --system --home $APP_DIR --shell /bin/false $APP_NAME || true
    
    print_success "Application user created"
}

download_application() {
    print_status "Setting up application directory..."
    
    # Create application directory
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Here you would normally download/clone the application
    # For this example, we'll create the structure
    mkdir -p public
    
    print_success "Application directory created"
}

install_application() {
    print_status "Installing application dependencies..."
    
    cd $APP_DIR
    
    # Create package.json if it doesn't exist (it should be copied from the artifact)
    if [ ! -f package.json ]; then
        print_warning "package.json not found, creating basic one..."
        cat > package.json << 'EOF'
{
  "name": "gym-tracker",
  "version": "1.0.0",
  "description": "A comprehensive gym workout tracking web application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.7",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
EOF
    fi
    
    # Install npm dependencies
    npm install
    
    print_success "Application dependencies installed"
}

setup_environment() {
    print_status "Setting up environment configuration..."
    
    cd $APP_DIR
    
    cat > .env << EOF
# Gym Tracker Environment Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Domain Configuration
DOMAIN=$DOMAIN
SITE_URL=https://$DOMAIN

# Security
SESSION_SECRET=$(openssl rand -base64 32)
BCRYPT_ROUNDS=12
EOF
    
    # Set proper permissions
    chown $APP_NAME:$APP_NAME .env
    chmod 600 .env
    
    print_success "Environment configuration created"
}

setup_database_schema() {
    print_status "Setting up database schema..."
    
    cd $APP_DIR
    
    # Import database schema (assuming database.sql exists)
    if [ -f database.sql ]; then
        mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < database.sql
        print_success "Database schema imported"
    else
        print_warning "database.sql not found, skipping schema import"
    fi
}

setup_systemd_service() {
    print_status "Setting up systemd service..."
    
    cat > /etc/systemd/system/$APP_NAME.service << EOF
[Unit]
Description=Gym Tracker Web Application
Documentation=https://github.com/your-org/gym-tracker
After=network.target mariadb.service
Wants=mariadb.service

[Service]
Type=simple
User=$APP_NAME
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
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

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable $APP_NAME
    
    print_success "Systemd service configured"
}

setup_nginx() {
    print_status "Setting up Nginx configuration..."
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create Nginx configuration (assuming nginx.conf artifact exists)
    if [ -f nginx.conf ]; then
        cp nginx.conf /etc/nginx/sites-available/$DOMAIN
    else
        # Create basic Nginx config
        cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name gym.zhst.eu www.gym.zhst.eu;
    
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
    }
}
EOF
    fi
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    nginx -t
    
    systemctl enable nginx
    systemctl reload nginx
    
    print_success "Nginx configured"
}

setup_ssl() {
    print_status "Setting up SSL certificate..."
    
    # Setup Let's Encrypt SSL
    if command -v certbot &> /dev/null; then
        print_status "Obtaining SSL certificate from Let's Encrypt..."
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
        
        print_success "SSL certificate configured with auto-renewal"
    else
        print_warning "Certbot not available, SSL setup skipped"
    fi
}

setup_firewall() {
    print_status "Setting up firewall..."
    
    # Configure UFW
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (assuming standard port)
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 'Nginx Full'
    
    # Enable firewall
    ufw --force enable
    
    print_success "Firewall configured"
}

setup_fail2ban() {
    print_status "Setting up Fail2Ban..."
    
    # Create custom jail for the application
    cat > /etc/fail2ban/jail.d/gym-tracker.conf << EOF
[gym-tracker]
enabled = true
port = http,https
filter = gym-tracker
logpath = /var/log/nginx/gym.zhst.eu.error.log
maxretry = 5
bantime = 3600
EOF
    
    # Create custom filter
    cat > /etc/fail2ban/filter.d/gym-tracker.conf << EOF
[Definition]
failregex = ^<HOST> -.*"(GET|POST).*HTTP.*" (4|5)[0-9][0-9]
ignoreregex =
EOF
    
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    print_success "Fail2Ban configured"
}

set_permissions() {
    print_status "Setting file permissions..."
    
    # Set ownership
    chown -R $APP_NAME:$APP_NAME $APP_DIR
    
    # Set permissions
    find $APP_DIR -type f -exec chmod 644 {} \;
    find $APP_DIR -type d -exec chmod 755 {} \;
    
    # Make server.js executable
    chmod 755 $APP_DIR/server.js
    
    print_success "File permissions set"
}

start_services() {
    print_status "Starting services..."
    
    systemctl start $APP_NAME
    systemctl start nginx
    
    # Check if services are running
    if systemctl is-active --quiet $APP_NAME; then
        print_success "Gym Tracker application started"
    else
        print_error "Failed to start Gym Tracker application"
        systemctl status $APP_NAME
    fi
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx started"
    else
        print_error "Failed to start Nginx"
        systemctl status nginx
    fi
}

create_admin_user() {
    print_status "Creating default admin user..."
    
    # This would normally be done via API or direct database insertion
    # For now, we'll use the default admin user from the database schema
    print_warning "Default admin user: admin / admin123 (CHANGE THIS PASSWORD!)"
}

print_summary() {
    print_success "Installation completed successfully!"
    echo ""
    echo "======================================="
    echo "  GYM TRACKER INSTALLATION SUMMARY"
    echo "======================================="
    echo ""
    echo "Application URL: https://$DOMAIN"
    echo "Admin Panel: https://$DOMAIN/admin"
    echo ""
    echo "Database Configuration:"
    echo "  Host: localhost"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Password: $DB_PASSWORD"
    echo ""
    echo "Default Admin Credentials:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo "  ⚠️  IMPORTANT: Change the admin password immediately!"
    echo ""
    echo "Application Directory: $APP_DIR"
    echo "Configuration File: $APP_DIR/.env"
    echo "Service: systemctl status $APP_NAME"
    echo "Logs: journalctl -u $APP_NAME -f"
    echo ""
    echo "Next Steps:"
    echo "1. Change the default admin password"
    echo "2. Configure SMTP settings in admin panel"
    echo "3. Customize the application as needed"
    echo "4. Set up regular backups"
    echo ""
    print_success "Installation completed! 🎉"
}

# Main installation process
main() {
    print_status "Starting Gym Tracker installation..."
    
    check_root
    update_system
    install_dependencies
    install_nodejs
    install_mariadb
    setup_database
    create_app_user
    download_application
    install_application
    setup_environment
    setup_database_schema
    setup_systemd_service
    setup_nginx
    setup_ssl
    setup_firewall
    setup_fail2ban
    set_permissions
    start_services
    create_admin_user
    
    print_summary
}

# Run installation
main "$@"