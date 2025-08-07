
#!/bin/bash

# Skript für die automatisierte Installation von Gym Tracker auf Debian 12

# Variablen (bitte anpassen)
DB_USER="gymuser"
DB_PASSWORD="M4d0xoLimariadb"
DB_NAME="gym_tracker"
JWT_SECRET="your_super_secret_jwt_key"
NGINX_DOMAIN="gym.zhst.eu"
BACKEND_REPO="https://github.com/Olii83/gymtracker-backend.git"
FRONTEND_REPO="hhttps://github.com/Olii83/gymtracker-frontend.git"
PROJECT_DIR="/home/webapp/gym-tracker"
BACKEND_DIR="$PROJECT_DIR/gym-tracker-backend"
FRONTEND_DIR="$PROJECT_DIR/gym-tracker-frontend"
NODE_APP_USER="Oli"
NODE_APP_PATH="$BACKEND_DIR/src/server.js"

# Farben für die Ausgabe
GREEN="\033[0;32m"
NC="\033[0m"

# Funktion, um Befehle auszuführen und auf Fehler zu prüfen
execute() {
    echo -e "${GREEN}-> $1${NC}"
    eval "$1"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Fehler: Der letzte Befehl ist fehlgeschlagen. Das Skript wird beendet.${NC}"
        exit 1
    fi
}

echo -e "${GREEN}Starte die Installation von Gym Tracker...${NC}"

execute "sudo apt update"
execute "sudo apt upgrade -y"
execute "sudo apt install -y curl git nginx mariadb-server nodejs npm"

execute "mkdir -p $PROJECT_DIR"
execute "git clone $BACKEND_REPO $BACKEND_DIR"
execute "git clone $FRONTEND_REPO $FRONTEND_DIR"
execute "cd $BACKEND_DIR"

execute "npm install"
execute "echo \"DB_HOST=localhost\" > .env"
execute "echo \"DB_USER=$DB_USER\" >> .env"
execute "echo \"DB_PASSWORD=$DB_PASSWORD\" >> .env"
execute "echo \"DB_NAME=$DB_NAME\" >> .env"
execute "echo \"JWT_SECRET=$JWT_SECRET\" >> .env"

echo -e "${GREEN}Erstelle die MariaDB-Datenbank und den Benutzer...${NC}"
sudo mysql -e "
    CREATE DATABASE $DB_NAME;
    CREATE USER "$DB_USER"@"localhost" IDENTIFIED BY "$DB_PASSWORD";
    GRANT ALL PRIVILEGES ON $DB_NAME.* TO "$DB_USER"@"localhost";
    FLUSH PRIVILEGES;
"
execute "mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < $DB_DIR/schema.sql"

echo -e "${GREEN}Richte Nginx ein...${NC}"
NGINX_CONF=$(cat <<EOF
server {
    listen 80;
    server_name $NGINX_DOMAIN;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        root $FRONTEND_DIR;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
)
echo "$NGINX_CONF" | sudo tee /etc/nginx/sites-available/$NGINX_DOMAIN > /dev/null
execute "sudo ln -s /etc/nginx/sites-available/$NGINX_DOMAIN /etc/nginx/sites-enabled/"
execute "sudo nginx -t"
execute "sudo systemctl restart nginx"

echo -e "${GREEN}Erstelle den systemd-Dienst...${NC}"
SYSTEMD_SERVICE=$(cat <<EOF
[Unit]
Description=Gym Tracker Node.js App
After=network.target

[Service]
User=$NODE_APP_USER
WorkingDirectory=$BACKEND_DIR
ExecStart=/usr/bin/node $NODE_APP_PATH
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
)
echo "$SYSTEMD_SERVICE" | sudo tee /etc/systemd/system/gym-tracker.service > /dev/null
execute "sudo systemctl daemon-reload"
execute "sudo systemctl enable gym-tracker.service"
execute "sudo systemctl start gym-tracker.service"

echo -e "${GREEN}🎉 Installation von Gym Tracker abgeschlossen!${NC}"
echo "Deine Anwendung ist unter http://$NGINX_DOMAIN erreichbar."
echo "Den Status des Dienstes kannst du mit \"sudo systemctl status gym-tracker.service\" überprüfen."

