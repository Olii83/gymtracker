# 🏋️ Gym Tracker

Eine umfassende Web-App zum Verfolgen von Gym-Workouts, Personal Records und Trainingshistorie.

## ✨ Features

### Benutzer-Features
- 🔐 **Benutzerregistrierung und -anmeldung** mit E-Mail-Verifizierung
- 👤 **Profilverwaltung** - Namen, E-Mail und Passwort ändern
- 🔑 **Passwort-Reset** via E-Mail
- 🏋️ **Workout-Tracking** - Sätze, Wiederholungen und Gewicht erfassen
- 📊 **Personal Records (PR)** - Automatische Erkennung und Verfolgung
- 📈 **Workout-Historie** - Vollständige Übersicht aller Trainings
- 💪 **Übungen-Datenbank** - Eigene Übungen erstellen und verwalten
- ⚖️ **Gewichtstypen** - kg, lbs oder kein Gewicht
- 📱 **Responsive Design** - Optimiert für Desktop und Mobile
- 🕐 **Workout-Timer** - Automatische Zeiterfassung

### Admin-Features
- 🛠️ **Admin-Panel** - Vollständige Systemverwaltung
- 📊 **Dashboard** - Überblick über Benutzer und Aktivitäten
- ⚙️ **Einstellungen** - E-Mail, Sicherheit und mehr
- 👥 **Benutzerverwaltung** - Benutzer verwalten und überwachen
- 📧 **E-Mail-Konfiguration** - SMTP-Einstellungen
- 🔧 **Systemwartung** - Datenbankoptimierung und mehr

### Technische Features
- 🚀 **Moderne Web-Technologien** - Node.js, Express, MariaDB
- 🔒 **Sicherheit** - JWT-Authentifizierung, Passwort-Hashing, Rate Limiting
- 📱 **Progressive Web App** - App-ähnliches Erlebnis
- 🎨 **Modernes UI** - Inspiriert von GymBook App
- ⚡ **Performance** - Optimiert für Geschwindigkeit
- 🔐 **SSL/HTTPS** - Sichere Verbindung

## 🚀 Schnellstart

### Automatische Installation

```bash
# Lade das Installationsskript herunter
wget https://raw.githubusercontent.com/your-repo/gym-tracker/main/install.sh

# Mache es ausführbar
chmod +x install.sh

# Führe die Installation aus (als root)
sudo ./install.sh
```

Das Skript installiert und konfiguriert automatisch:
- Node.js 18
- MariaDB
- Nginx mit SSL
- Firewall (UFW)
- Fail2Ban
- Die komplette Gym Tracker Anwendung

### Nach der Installation

1. **Besuche die App**: `https://gym.zhst.eu`
2. **Admin-Panel**: `https://gym.zhst.eu/admin`
3. **Standard Admin-Daten**:
   - Benutzername: `admin`
   - Passwort: `admin123` ⚠️ **SOFORT ÄNDERN!**

## 📋 Systemvoraussetzungen

- **OS**: Debian 12 (empfohlen) oder Ubuntu 22.04+
- **RAM**: Mindestens 2GB
- **Storage**: Mindestens 10GB
- **Network**: Internetverbindung für SSL-Zertifikat
- **Domain**: Konfigurierte Domain mit DNS-Eintrag

## 🏗️ Architektur

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │────│   Node.js App   │────│    MariaDB      │
│  (Reverse Proxy │    │   (Express)     │    │   (Database)    │
│   + SSL/TLS)    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│   File System   │──────────────┘
                        │   (Static Files,│
                        │    Uploads)     │
                        └─────────────────┘
```

## 🛠️ Technologie-Stack

### Backend
- **Node.js** - Laufzeitumgebung
- **Express.js** - Web-Framework
- **MariaDB** - Datenbank
- **JWT** - Authentifizierung
- **bcrypt** - Passwort-Hashing
- **Nodemailer** - E-Mail-Versand

### Frontend
- **Vanilla JavaScript** - Kein Framework-Overhead
- **Modern CSS** - Grid, Flexbox, Custom Properties
- **Responsive Design** - Mobile-first Ansatz
- **Progressive Enhancement** - Funktioniert überall

### Infrastructure
- **Nginx** - Reverse Proxy und Static File Server
- **Let's Encrypt** - SSL/TLS-Zertifikate
- **UFW** - Firewall
- **Fail2Ban** - Schutz vor Brute-Force-Attacken
- **Systemd** - Service Management

## 📁 Projektstruktur

```
gym-tracker/
├── 📄 server.js              # Hauptserver-Datei
├── 📄 package.json           # NPM-Konfiguration
├── 📄 database.sql           # Datenbankschema
├── 📄 .env                   # Umgebungsvariablen
├── 📁 public/                # Frontend-Dateien
│   ├── 📄 index.html         # Haupt-App
│   ├── 📄 admin.html         # Admin-Panel
│   ├── 📄 reset-password.html# Passwort-Reset
│   ├── 📄 styles.css         # Stylesheet
│   ├── 📄 app.js             # Frontend-Logik
│   └── 📄 admin.js           # Admin-Logik
├── 📄 nginx.conf             # Nginx-Konfiguration
├── 📄 install.sh             # Installationsskript
├── 📄 INSTALLATION.md        # Detaillierte Anleitung
└── 📄 README.md              # Diese Datei
```

## 🔧 Konfiguration

### Umgebungsvariablen (.env)

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_USER=gym_tracker
DB_PASSWORD=your_secure_password
DB_NAME=gym_tracker

# Security
JWT_SECRET=your_jwt_secret_min_32_chars
SESSION_SECRET=your_session_secret

# Domain
DOMAIN=gym.zhst.eu
SITE_URL=https://gym.zhst.eu

# Email (Optional - kann über Admin-Panel konfiguriert werden)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
```

## 📊 Datenbankschema

Die Datenbank besteht aus folgenden Haupttabellen:

- **users** - Benutzerdaten und Authentifizierung
- **exercises** - Übungen-Datenbank
- **workouts** - Workout-Templates
- **workout_sessions** - Durchgeführte Workouts
- **session_exercises** - Übungen in einer Session
- **sets** - Einzelne Sätze mit Gewicht/Wiederholungen
- **personal_records** - Automatisch erfasste PRs
- **admin_users** - Administrator-Accounts
- **settings** - Systemkonfiguration

## 🔐 Sicherheitsfeatures

- **JWT-basierte Authentifizierung** - Sichere Session-Verwaltung
- **Passwort-Hashing** - bcrypt mit Salt
- **Rate Limiting** - Schutz vor Brute-Force
- **Input-Validierung** - Schutz vor Injection-Attacks
- **HTTPS-Only** - Alle Verbindungen verschlüsselt
- **CSRF-Schutz** - Cross-Site-Request-Forgery-Schutz
- **SQL-Injection-Schutz** - Prepared Statements
- **XSS-Schutz** - Content Security Policy

## 🚀 API-Endpunkte

### Authentifizierung
- `POST /api/register` - Benutzerregistrierung
- `POST /api/login` - Anmeldung
- `POST /api/forgot-password` - Passwort vergessen
- `POST /api/reset-password` - Passwort zurücksetzen

### Benutzer
- `GET /api/profile` - Benutzerprofil abrufen
- `PUT /api/profile` - Profil aktualisieren

### Übungen
- `GET /api/exercises` - Übungen auflisten
- `POST /api/exercises` - Neue Übung erstellen
- `GET /api/exercise-categories` - Kategorien abrufen

### Workouts
- `GET /api/workouts` - Workout-Templates auflisten
- `POST /api/workouts` - Neues Template erstellen
- `GET /api/workouts/:id` - Template-Details

### Sessions
- `GET /api/sessions` - Workout-Historie
- `POST /api/sessions` - Neue Session starten
- `GET /api/sessions/:id` - Session-Details
- `PUT /api/sessions/:id/finish` - Session beenden

### Personal Records
- `GET /api/personal-records` - PR-Liste abrufen

### Admin
- `POST /api/admin/login` - Admin-Anmeldung
- `GET /api/admin/stats` - System-Statistiken
- `GET /api/admin/settings` - Einstellungen abrufen
- `PUT /api/admin/settings` - Einstellungen speichern

## 📱 Mobile App Experience

Die Web-App ist als Progressive Web App (PWA) entwickelt und bietet:

- **App-ähnliches Interface** - Native App-Gefühl
- **Responsive Design** - Optimiert für alle Bildschirmgrößen
- **Touch-optimiert** - Große Touch-Targets
- **Offline-Funktionen** - Grundfunktionen auch ohne Internet*
- **Home-Screen-Installation** - Als App installierbar*

*Geplante Features für zukünftige Versionen

## 🔄 Backup und Wartung

### Automatisches Backup

```bash
# Tägliches Datenbank-Backup
echo "0 2 * * * mysqldump -u gym_tracker -p'PASSWORD' gym_tracker > /var/backups/gym_tracker_\$(date +\%Y\%m\%d).sql" | crontab -

# Wöchentliche Bereinigung alter Backups
echo "0 3 * * 0 find /var/backups/ -name 'gym_tracker_*.sql' -mtime +30 -delete" | crontab -
```

### System-Updates

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Node.js-Dependencies aktualisieren
cd /var/www/gym-tracker
npm update

# Services neu starten
sudo systemctl restart gym-tracker
```

## 🐛 Troubleshooting

### Häufige Probleme

1. **App lädt nicht**
   - Prüfe Nginx-Status: `systemctl status nginx`
   - Prüfe SSL-Zertifikat: `certbot certificates`

2. **Datenbank-Verbindungsfehler**
   - Prüfe MariaDB: `systemctl status mariadb`
   - Prüfe .env-Konfiguration

3. **E-Mails werden nicht gesendet**
   - Konfiguriere SMTP im Admin-Panel
   - Prüfe Firewall-Regeln für SMTP-Ports

### Logs

```bash
# App-Logs
journalctl -u gym-tracker -f

# Nginx-Logs
tail -f /var/log/nginx/gym.zhst.eu.access.log
tail -f /var/log/nginx/gym.zhst.eu.error.log
```

## 🤝 Beitragen

Wir freuen uns über Beiträge! Bitte:

1. Fork das Repository
2. Erstelle einen Feature-Branch
3. Mache deine Änderungen
4. Schreibe Tests (falls zutreffend)
5. Erstelle einen Pull Request

## 📝 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe [LICENSE](LICENSE) Datei für Details.

## 🏆 Credits

- **Design-Inspiration**: [GymBook App](https://www.gymbookapp.com/)
- **Icons**: Lucide Icons
- **Fonts**: Inter Font Family
- **CSS Reset**: Modern CSS Reset

## 📞 Support

Bei Fragen oder Problemen:

1. 📖 Lies die [Installationsanleitung](INSTALLATION.md)
2. 🔍 Durchsuche die [Issues](https://github.com/your-repo/gym-tracker/issues)
3. 🆕 Erstelle ein neues Issue
4. 📧 Kontaktiere den Support

---

**Made with 💪 for the fitness community**