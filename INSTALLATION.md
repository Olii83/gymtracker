# Gym Tracker - Installationsanleitung

Diese Anleitung beschreibt die komplette Installation der Gym Tracker Web-App auf einem Debian 12 LXC Container in Proxmox.

## Systemvoraussetzungen

- Debian 12 LXC Container (unprivileged)
- Mindestens 2GB RAM
- Mindestens 10GB Speicherplatz
- Root-Zugriff auf den Container
- Internetverbindung
- Domain (gym.zhst.eu) mit DNS-Eintrag auf die Container-IP

## Automatische Installation

### 1. Schnellinstallation mit Bash-Script

```bash
# Als root ausführen
wget https://raw.githubusercontent.com/your-repo/gym-tracker/main/install.sh
chmod +x install.sh
./install.sh
```

Das Script installiert automatisch alle Abhängigkeiten und konfiguriert das System.

## Manuelle Installation

### 1. System vorbereiten

```bash
# System aktualisieren
apt update && apt upgrade -y

# Grundlegende Pakete installieren
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release unzip git nginx certbot python3-certbot-nginx ufw fail2ban
```

### 2. Node.js installieren

```bash
# NodeSource Repository hinzufügen
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Node.js installieren
apt install -y nodejs

# Version prüfen
node --version
npm --version
```

### 3. MariaDB installieren

```bash
# MariaDB installieren
apt install -y mariadb-server mariadb-client

# MariaDB sichern
mysql_secure_installation

# MariaDB starten und aktivieren
systemctl enable mariadb
systemctl start mariadb
```

### 4. Datenbank einrichten

```bash
# Als root in MySQL einloggen
mysql -u root -p

# Datenbank und Benutzer erstellen
CREATE DATABASE gym_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gym_tracker'@'localhost' IDENTIFIED BY 'IHR_SICHERES_PASSWORT';
GRANT ALL PRIVILEGES ON gym_tracker.* TO 'gym_tracker'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Datenbankschema importieren
mysql -u gym_tracker -p gym_tracker < database.sql
```

### 5. Anwendung installieren

```bash
# Anwendungsverzeichnis erstellen
mkdir -p /var/www/gym-tracker
cd /var/www/gym-tracker

# Anwendungsdateien kopieren (alle Dateien aus den Artefakten)
# - server.js
# - package.json
# - database.sql
# - public/ (mit index.html, styles.css, app.js, admin.html, admin.js, reset-password.html)

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
nano .env
```

### 6. Umgebungsvariablen konfigurieren

Bearbeite die `.env` Datei:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_USER=gym_tracker
DB_PASSWORD=IHR_SICHERES_PASSWORT
DB_NAME=gym_tracker

# JWT Secret (32+ Zeichen, sicher generieren!)
JWT_SECRET=ihr_sehr_sicherer_jwt_schlüssel_hier

# Domain Configuration
DOMAIN=gym.zhst.eu
SITE_URL=https://gym.zhst.eu
```

### 7. Systembenutzer erstellen

```bash
# Systembenutzer für die Anwendung erstellen
useradd --system --home /var/www/gym-tracker --shell /bin/false gym-tracker

# Dateiberechtigungen setzen
chown -R gym-tracker:gym-tracker /var/www/gym-tracker
chmod 600 /var/www/gym-tracker/.env
```

### 8. Systemd Service einrichten

[Unit]
Description=Gym Tracker Web Application
Documentation=https://github.com/your-org/gym-tracker
After=network.target mariadb.service
Wants=mariadb.service

[Service]
Type=simple
User=gym-tracker
WorkingDirectory=/var/www/gym-tracker
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gym-tracker

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/gym-tracker
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

[Install]
WantedBy=multi-user.target
```

```bash
# Service aktivieren und starten
systemctl daemon-reload
systemctl enable gym-tracker
systemctl start gym-tracker

# Status prüfen
systemctl status gym-tracker
```

### 9. Nginx konfigurieren

Erstelle `/etc/nginx/sites-available/gym.zhst.eu`:

```nginx
# Kopiere den Inhalt aus der nginx.conf Artefakt
```

```bash
# Default-Site deaktivieren
rm -f /etc/nginx/sites-enabled/default

# Neue Site aktivieren
ln -s /etc/nginx/sites-available/gym.zhst.eu /etc/nginx/sites-enabled/

# Nginx-Konfiguration testen
nginx -t

# Nginx neu laden
systemctl reload nginx
```

### 10. SSL-Zertifikat einrichten

```bash
# Let's Encrypt SSL-Zertifikat erstellen
certbot --nginx -d gym.zhst.eu -d www.gym.zhst.eu

# Auto-Renewal einrichten
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### 11. Firewall konfigurieren

```bash
# UFW zurücksetzen und konfigurieren
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH erlauben
ufw allow ssh

# HTTP/HTTPS erlauben
ufw allow 'Nginx Full'

# Firewall aktivieren
ufw --force enable

# Status prüfen
ufw status
```

### 12. Fail2Ban einrichten

Erstelle `/etc/fail2ban/jail.d/gym-tracker.conf`:

```ini
[gym-tracker]
enabled = true
port = http,https
filter = gym-tracker
logpath = /var/log/nginx/gym.zhst.eu.error.log
maxretry = 5
bantime = 3600
```

Erstelle `/etc/fail2ban/filter.d/gym-tracker.conf`:

```ini
[Definition]
failregex = ^<HOST> -.*"(GET|POST).*HTTP.*" (4|5)[0-9][0-9]
ignoreregex =
```

```bash
# Fail2Ban neu starten
systemctl restart fail2ban
```

## Erste Schritte nach der Installation

### 1. Admin-Zugang

- URL: `https://gym.zhst.eu/admin`
- Standard-Anmeldedaten:
  - Benutzername: `admin`
  - Passwort: `admin123`

**⚠️ WICHTIG: Ändere das Admin-Passwort sofort!**

### 2. E-Mail-Konfiguration

1. Melde dich im Admin-Panel an
2. Gehe zu "Einstellungen"
3. Konfiguriere die SMTP-Einstellungen für E-Mail-Versand

### 3. Anwendung testen

1. Besuche `https://gym.zhst.eu`
2. Erstelle einen Test-Benutzer
3. Teste die Hauptfunktionen

## Dateistruktur

```
/var/www/gym-tracker/
├── server.js              # Hauptserver-Datei
├── package.json            # Node.js-Abhängigkeiten
├── .env                    # Umgebungsvariablen
├── database.sql            # Datenbankschema
└── public/                 # Frontend-Dateien
    ├── index.html          # Hauptanwendung
    ├── admin.html          # Admin-Panel
    ├── reset-password.html # Passwort-Reset-Seite
    ├── styles.css          # Stylesheet
    ├── app.js              # Hauptanwendungs-JS
    └── admin.js            # Admin-Panel-JS
```

## Wartung und Monitoring

### Logs überprüfen

```bash
# Anwendungslogs
journalctl -u gym-tracker -f

# Nginx-Logs
tail -f /var/log/nginx/gym.zhst.eu.access.log
tail -f /var/log/nginx/gym.zhst.eu.error.log

# System-Logs
tail -f /var/log/syslog
```

### Service-Status

```bash
# Service-Status prüfen
systemctl status gym-tracker
systemctl status nginx
systemctl status mariadb

# Services neu starten
systemctl restart gym-tracker
systemctl restart nginx
```

### Datenbank-Backup

```bash
# Backup erstellen
mysqldump -u gym_tracker -p gym_tracker > backup_$(date +%Y%m%d_%H%M%S).sql

# Automatisches tägliches Backup
echo "0 2 * * * mysqldump -u gym_tracker -pPASSWORT gym_tracker > /var/backups/gym_tracker_\$(date +\%Y\%m\%d_\%H\%M\%S).sql" | crontab -
```

### Updates

```bash
# System-Updates
apt update && apt upgrade -y

# Node.js-Abhängigkeiten aktualisieren
cd /var/www/gym-tracker
npm update

# Nach Updates Service neu starten
systemctl restart gym-tracker
```

## Troubleshooting

### Häufige Probleme

#### Anwendung startet nicht

```bash
# Logs prüfen
journalctl -u gym-tracker -n 50

# Häufige Ursachen:
# - Falsche Datenbankverbindung (.env prüfen)
# - Port bereits belegt
# - Dateiberechtigungen falsch
```

#### Datenbank-Verbindungsfehler

```bash
# Datenbankverbindung testen
mysql -u gym_tracker -p gym_tracker

# MariaDB-Status prüfen
systemctl status mariadb

# .env-Datei überprüfen
```

#### SSL-Zertifikat-Probleme

```bash
# Zertifikat-Status prüfen
certbot certificates

# Zertifikat erneuern
certbot renew --dry-run
```

#### Nginx-Konfigurationsfehler

```bash
# Nginx-Konfiguration testen
nginx -t

# Nginx-Logs prüfen
tail -f /var/log/nginx/error.log
```

### Performance-Optimierung

#### PM2 für Prozess-Management (optional)

```bash
# PM2 installieren
npm install -g pm2

# Anwendung mit PM2 starten
pm2 start server.js --name gym-tracker

# PM2 Auto-Start
pm2 startup
pm2 save
```

#### Datenbank-Optimierung

```bash
# MySQL/MariaDB optimieren
mysql_secure_installation

# Indizes überprüfen
mysql -u gym_tracker -p gym_tracker -e "SHOW INDEX FROM users;"
```

## Sicherheits-Checkliste

- [ ] Standard-Admin-Passwort geändert
- [ ] .env-Datei mit sicheren Passwörtern
- [ ] SSL-Zertifikat installiert
- [ ] Firewall konfiguriert
- [ ] Fail2Ban aktiviert
- [ ] Regelmäßige Backups eingerichtet
- [ ] System-Updates eingeplant
- [ ] Monitoring eingerichtet

## Support und Dokumentation

### Nützliche Befehle

```bash
# Vollständiger Service-Restart
systemctl restart gym-tracker nginx mariadb

# Disk-Space prüfen
df -h

# Memory-Usage prüfen
free -h

# Prozesse prüfen
ps aux | grep node
```

### Kontakt

Bei Problemen oder Fragen zur Installation:

1. Logs sammeln (`journalctl -u gym-tracker -n 100`)
2. Systeminfo sammeln (`systemctl status gym-tracker`)
3. GitHub Issues erstellen oder Support kontaktieren

---

**Hinweis**: Diese Anleitung geht von einer Standard-Debian-12-Installation aus. Bei anderen Distributionen können sich die Befehle unterscheiden.