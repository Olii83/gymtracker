# 🏋️ Gym Tracker - Complete Edition

Ein umfassendes, modernes Fitness-Tracking-System mit SQLite-Datenbank, entwickelt für einfache Installation und Multi-User-Unterstützung.

![Gym Tracker](https://img.shields.io/badge/Version-2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![SQLite](https://img.shields.io/badge/Database-SQLite-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📋 Inhaltsverzeichnis

- [✨ Features](#-features)
- [🚀 Schnellstart](#-schnellstart)
- [📦 Installation](#-installation)
- [⚙️ Konfiguration](#️-konfiguration)
- [🔧 Verwendung](#-verwendung)
- [👑 Admin-Funktionen](#-admin-funktionen)
- [🔄 Updates & Wartung](#-updates--wartung)
- [🐛 Troubleshooting](#-troubleshooting)
- [🤝 Support](#-support)

## ✨ Features

### 🎯 Kernfunktionen
- **Multi-User-System** - Jeder Benutzer hat seinen eigenen, sicheren Datenbereich
- **Workout-Tracking** - Detaillierte Erfassung von Trainingseinheiten mit Übungen, Sätzen und Gewichten
- **Übungsmanagement** - Umfangreiche Übungsdatenbank mit Kategorien und Anleitungen
- **Fortschrittsverfolgung** - Dashboard mit Statistiken, Trends und Verlaufsanzeigen
- **Responsive Design** - Funktioniert perfekt auf Desktop, Tablet und Smartphone
- **Offline-Fähig** - PWA-Support für Nutzung ohne Internetverbindung

### 👑 Admin-Features
- **Vollständige Benutzerverwaltung** - Benutzer erstellen, bearbeiten, deaktivieren, löschen
- **Passwort-Management** - Admin kann Passwörter für alle Benutzer zurücksetzen
- **System-Monitoring** - Übersicht über Systemstatus, Benutzeraktivität und Performance
- **Backup-Management** - Automatische Backups mit manueller Steuerung
- **Statistik-Dashboard** - Umfassende Einblicke in die Systemnutzung

### 🔧 Technische Features
- **SQLite-Datenbank** - Keine separate Datenbankinstallation erforderlich
- **JWT-Authentifizierung** - Sichere, tokenbasierte Anmeldung
- **RESTful API** - Vollständige Backend-API für alle Funktionen
- **Modular aufgebaut** - Saubere Trennung von Frontend-Komponenten
- **Automatische Backups** - Tägliche Sicherung mit konfigurierbarer Aufbewahrung
- **SSL-Unterstützung** - Sichere HTTPS-Verbindungen
- **Proxy-Manager-Support** - Optimiert für Nginx Proxy Manager
- **Docker-Ready** - Container-Unterstützung für einfache Bereitstellung

### 🛡️ Sicherheitsfeatures
- **Bcrypt-Passwort-Hashing** - Sichere Speicherung von Passwörtern
- **Rate Limiting** - Schutz vor Brute-Force-Angriffen
- **Input-Validierung** - Schutz vor SQL-Injection und XSS
- **CORS-Konfiguration** - Sichere Cross-Origin-Requests
- **Session-Management** - Automatische Token-Erneuerung und -Ablauf

## 🚀 Schnellstart

### Voraussetzungen
- **Betriebssystem**: Ubuntu 20.04+ / Debian 11+
- **RAM**: Minimum 512 MB, empfohlen 1 GB
- **Speicher**: 2 GB freier Speicherplatz
- **Root-Zugriff** für die Installation

### Blitz-Installation
```bash
# 1. Installationsskript herunterladen
wget -O install.sh https://raw.githubusercontent.com/Olii83/gymtracker/main/install.sh

# 2. Ausführbar machen
chmod +x install.sh

# 3. Installation starten
sudo ./install.sh --domain=gym.ihredomain.de
```

**Das war's!** Nach 5-10 Minuten ist Ihr Gym Tracker einsatzbereit.

## 📦 Installation

### Automatische Installation (Empfohlen)

```bash
# Basis-Installation
sudo ./install.sh

# Mit benutzerdefinierten Einstellungen
sudo ./install.sh --domain=gym.example.com --skip-ssl

# Für Nginx Proxy Manager Setup
sudo ./install.sh --domain=gym.example.com --proxy-mode --skip-ssl --skip-firewall
```

#### Installationsparameter
| Parameter | Beschreibung | Beispiel |
|-----------|--------------|----------|
| `--domain=` | Ihre Domain | `--domain=gym.example.com` |
| `--proxy-mode` | Nginx Proxy Manager Modus | `--proxy-mode` |
| `--skip-ssl` | SSL-Setup überspringen | `--skip-ssl` |
| `--skip-firewall` | Firewall-Setup überspringen | `--skip-firewall` |
| `--app-dir=` | Installationsverzeichnis | `--app-dir=/opt/gym-tracker` |

### Manuelle Installation

<details>
<summary>Klicken für detaillierte manuelle Installation</summary>

```bash
# 1. System aktualisieren
sudo apt update && sudo apt upgrade -y

# 2. Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Anwendung herunterladen
sudo git clone https://github.com/Olii83/gymtracker.git /var/www/gym-tracker
cd /var/www/gym-tracker

# 4. Dependencies installieren
sudo npm install --production

# 5. Konfiguration erstellen
sudo cp env_example .env
sudo nano .env  # JWT_SECRET und andere Einstellungen anpassen

# 6. Datenbank initialisieren
sudo mkdir -p database
sudo node -e "require('./server.js')" &
sleep 5 && sudo pkill node

# 7. Systemd Service erstellen
sudo cp scripts/gym-tracker.service /etc/systemd/system/
sudo systemctl enable gym-tracker
sudo systemctl start gym-tracker

# 8. Nginx konfigurieren (falls nicht Proxy Manager verwendet)
sudo cp scripts/nginx.conf /etc/nginx/sites-available/gym-tracker
sudo ln -s /etc/nginx/sites-available/gym-tracker /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

</details>

## ⚙️ Konfiguration

### Umgebungsvariablen (.env)

Kopieren Sie `.env.example` zu `.env` und passen Sie die Werte an:

```bash
# Kopieren der Vorlage
cp .env.example .env

# Bearbeiten der Konfiguration
nano .env
```

#### Wichtige Konfigurationen

**Sicherheit (WICHTIG!):**
```env
# Generieren Sie einen sicheren JWT-Secret:
# openssl rand -base64 64
JWT_SECRET=IHR_SICHERER_JWT_SECRET_HIER

# Admin-Anmeldedaten ändern
ADMIN_USERNAME=admin
ADMIN_PASSWORD=IhrSicheresPasswort123!
```

**Anwendung:**
```env
NODE_ENV=production
PORT=3000
APP_URL=https://gym.ihredomain.de
```

**Proxy-Manager-Setup:**
```env
TRUST_PROXY=true
PROXY_IP=192.168.2.4
```

**Datenbank:**
```env
DB_PATH=./database/gym_tracker.db
BACKUP_RETENTION_DAYS=30
```

### Nginx Proxy Manager Konfiguration

Da Sie Nginx Proxy Manager verwenden, erstellen Sie dort einen neuen Proxy Host:

1. **Neuen Proxy Host hinzufügen**
2. **Details Tab:**
   - Domain Names: `gym.ihredomain.de`
   - Scheme: `http`
   - Forward Hostname/IP: `IP_IHRES_GYM_TRACKER_SERVERS`
   - Forward Port: `3000`
   - ✅ Cache Assets
   - ✅ Block Common Exploits
   - ✅ Websockets Support

3. **SSL Tab:**
   - ✅ Force SSL
   - ✅ HTTP/2 Support
   - SSL Certificate: Request a new SSL Certificate with Let's Encrypt

4. **Advanced Tab (optional):**
```nginx
# Rate Limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;

# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Proxy Headers
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Host $host;
```

## 🔧 Verwendung

### Erste Schritte

1. **Website öffnen:** `https://gym.ihredomain.de`
2. **Admin-Anmeldung:**
   - Benutzername: `admin`
   - Passwort: `admin123` (oder Ihr konfiguriertes Passwort)
3. **⚠️ Passwort sofort ändern!**
4. **Erste Benutzer erstellen** oder Registrierung aktivieren

### Benutzer-Features

#### Dashboard
- **Überblick** über alle Trainings
- **Wöchentliche Statistiken**
- **Fortschrittsanzeige**
- **Schnellaktionen** für häufige Aufgaben

#### Workout-Management
- **Neues Training erstellen** mit Datum und Dauer
- **Übungen hinzufügen** aus der Datenbank
- **Sätze, Wiederholungen und Gewichte** erfassen
- **Notizen** für besondere Bemerkungen
- **Training-Historie** mit Suchfunktion

#### Übungsdatenbank
- **Vorgefertigte Übungen** in verschiedenen Kategorien
- **Neue Übungen erstellen** mit Beschreibung und Anleitung
- **Kategorien:** Krafttraining, Cardio, Stretching, Functional
- **Muskelgruppen:** Brust, Rücken, Schultern, Arme, Beine, Core

### API-Nutzung

Die Anwendung bietet eine vollständige REST-API:

```bash
# Gesundheitsstatus prüfen
curl https://gym.ihredomain.de/api/health

# Mit JWT-Token authentifiziert
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://gym.ihredomain.de/api/workouts
```

Vollständige API-Dokumentation: `/api/docs` (wenn aktiviert)

## 👑 Admin-Funktionen

### Benutzerverwaltung

**Benutzer anzeigen:**
- Vollständige Liste aller registrierten Benutzer
- Status (Aktiv/Inaktiv) anzeigen
- Registrierungsdatum und letzte Aktivität

**Benutzer verwalten:**
- **Passwort zurücksetzen** - Neues Passwort für jeden Benutzer setzen
- **Benutzer deaktivieren/aktivieren** - Zugang temporär sperren
- **Benutzer löschen** - Vollständige Entfernung mit allen Daten
- **Rolle ändern** - Admin-Rechte vergeben/entziehen

### System-Monitoring

**Dashboard:**
- Anzahl registrierter Benutzer
- Aktive Benutzer (letzte 30 Tage)
- Gesamtanzahl Workouts im System
- Speicherplatz-Nutzung

**Backup-Management:**
- Manuelle Backups erstellen
- Backup-Historie anzeigen
- Backups herunterladen
- Automatische Backup-Einstellungen

### Erweiterte Admin-Features

```bash
# Systemstatus prüfen
sudo systemctl status gym-tracker

# Detaillierte Logs anzeigen
sudo journalctl -u gym-tracker -f

# Backup erstellen
cd /var/www/gym-tracker
sudo -u gym-tracker node scripts/backup.js

# Benutzerstatistiken
sqlite3 database/gym_tracker.db "
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
    (SELECT COUNT(*) FROM workouts) as total_workouts
FROM users;"
```

## 🔄 Updates & Wartung

### Automatisches Update

```bash
# Update-Skript ausführen
sudo ./deploy.sh

# Mit Rollback-Option
sudo ./deploy.sh --with-rollback
```

### Manuelles Update

```bash
# 1. Backup erstellen
sudo systemctl stop gym-tracker
sudo cp -r /var/www/gym-tracker /var/www/gym-tracker.backup

# 2. Code aktualisieren
cd /var/www/gym-tracker
sudo git pull origin main
sudo npm install

# 3. Service neu starten
sudo systemctl start gym-tracker
```

### Rollback durchführen

```bash
# Automatisches Rollback (wenn verfügbar)
sudo ./install.sh --rollback

# Manuelles Rollback
sudo systemctl stop gym-tracker
sudo rm -rf /var/www/gym-tracker
sudo mv /var/www/gym-tracker.backup /var/www/gym-tracker
sudo systemctl start gym-tracker
```

### Wartungsaufgaben

**Tägliche Aufgaben (automatisch):**
- Datenbank-Backup um 3:00 Uhr
- Log-Rotation
- Cleanup alter Backups

**Wöchentliche Aufgaben (empfohlen):**
```bash
# System-Updates
sudo apt update && sudo apt upgrade

# Festplatte überprüfen
df -h
du -sh /var/www/gym-tracker/*

# Backup-Status prüfen
ls -la /var/www/gym-tracker/backups/
```

**Monatliche Aufgaben:**
```bash
# SSL-Zertifikat Status
sudo certbot certificates

# Performance-Analyse
sudo journalctl -u gym-tracker --since="1 month ago" | grep ERROR

# Datenbank optimieren
sqlite3 /var/www/gym-tracker/database/gym_tracker.db "VACUUM; ANALYZE;"
```

## 🐛 Troubleshooting

### Häufige Probleme

**Problem: Service startet nicht**
```bash
# Status prüfen
sudo systemctl status gym-tracker

# Logs anzeigen
sudo journalctl -u gym-tracker -n 50

# Lösung: Meist Berechtigungsproblem
sudo chown -R gym-tracker:gym-tracker /var/www/gym-tracker
sudo systemctl restart gym-tracker
```

**Problem: Datenbank gesperrt**
```bash
# Prüfen ob Prozess läuft
sudo systemctl stop gym-tracker

# WAL-Dateien entfernen
sudo rm -f /var/www/gym-tracker/database/*.wal
sudo rm -f /var/www/gym-tracker/database/*.shm

# Service neu starten
sudo systemctl start gym-tracker
```

**Problem: 502 Bad Gateway (Nginx Proxy Manager)**
```bash
# App-Status prüfen
curl http://IHRE_SERVER_IP:3000/api/health

# Proxy-Manager Logs prüfen
# In NPM: Logs → Access Logs / Error Logs anzeigen

# Firewall prüfen
sudo ufw status
sudo ufw allow from 192.168.2.4 to any port 3000
```

**Problem: Anmeldung funktioniert nicht**
```bash
# Admin-Passwort zurücksetzen
cd /var/www/gym-tracker
sudo -u gym-tracker node -e "
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/gym_tracker.db');
bcrypt.hash('admin123', 12, (err, hash) => {
    db.run('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'admin']);
    console.log('Admin password reset to: admin123');
    db.close();
});
"
```

### Log-Dateien

**Anwendungs-Logs:**
```bash
# Systemd Service Logs
sudo journalctl -u gym-tracker -f

# Anwendungs-Logs (falls konfiguriert)
tail -f /var/www/gym-tracker/logs/app.log

# Nginx Proxy Manager Logs
# Über NPM Web-Interface → Logs
```

**Debugging aktivieren:**
```bash
# In .env Datei
DEBUG=true
LOG_LEVEL=debug

# Service neu starten
sudo systemctl restart gym-tracker
```

### Performance-Optimierung

**Datenbank optimieren:**
```bash
# SQLite Vacuum und Analyze
sqlite3 /var/www/gym-tracker/database/gym_tracker.db "
PRAGMA optimize;
VACUUM;
ANALYZE;
"
```

**Memory-Überwachung:**
```bash
# RAM-Nutzung prüfen
free -h
ps aux | grep node

# Wenn zu viel RAM verbraucht:
# In .env: NODE_OPTIONS=--max-old-space-size=256
```

## 🤝 Support

### Community & Hilfe

- **GitHub Issues:** [https://github.com/Olii83/gymtracker/issues](https://github.com/Olii83/gymtracker/issues)
- **Dokumentation:** [https://github.com/Olii83/gymtracker/wiki](https://github.com/Olii83/gymtracker/wiki)
- **Discussions:** [https://github.com/Olii83/gymtracker/discussions](https://github.com/Olii83/gymtracker/discussions)

### Fehler melden

Wenn Sie einen Fehler finden, erstellen Sie bitte ein Issue mit:

1. **Fehlerbeschreibung** - Was ist passiert?
2. **Erwartetes Verhalten** - Was sollte passieren?
3. **Schritte zur Reproduktion** - Wie kann der Fehler nachgestellt werden?
4. **System-Informationen:**
   ```bash
   # Diese Informationen hinzufügen:
   cat /etc/os-release
   node --version
   npm --version
   sudo systemctl status gym-tracker
   ```
5. **Logs:**
   ```bash
   sudo journalctl -u gym-tracker -n 100 --no-pager
   ```

### Feature-Anfragen

Haben Sie eine Idee für ein neues Feature? Erstellen Sie ein Issue mit dem Label "enhancement" und beschreiben Sie:
- **Beschreibung** des gewünschten Features
- **Anwendungsfall** - Warum wäre es nützlich?
- **Mockups/Beispiele** falls vorhanden

### Beitragen

Beiträge sind willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für Details.

## 📄 Lizenz

Dieses Projekt steht unter der [MIT License](LICENSE).

## 🙏 Danksagungen

- **SQLite** - Zuverlässige, eingebettete Datenbank
- **Express.js** - Schnelles Web-Framework für Node.js
- **Nginx Proxy Manager** - Einfache Reverse-Proxy-Verwaltung
- **Community** - Für Feedback, Bug-Reports und Verbesserungsvorschläge

---

**Entwickelt mit ❤️ für die Fitness-Community**

![Footer](https://img.shields.io/badge/Made%20with-❤️-red)
![Node.js](https://img.shields.io/badge/Powered%20by-Node.js-green)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue)
