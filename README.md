# 🏋️ Gym Tracker (SQLite Edition)

Ein umfassendes Fitness-Tracking-System mit SQLite-Datenbank, entwickelt für einfache Installation und Wartung.

## ✨ Features

### 🎯 Kernfunktionen
- **Workout-Tracking**: Detaillierte Erfassung von Trainingseinheiten
- **Übungsmanagement**: Umfangreiche Übungsdatenbank mit Kategorien
- **Fortschrittsverfolgung**: Dashboard mit Statistiken und Trends
- **Benutzerfreundlich**: Intuitive Web-Oberfläche
- **Responsive Design**: Funktioniert auf Desktop und Mobile

### 🔧 Technische Features
- **SQLite-Datenbank**: Keine separate DB-Installation erforderlich
- **RESTful API**: Vollständige Backend-API
- **JWT-Authentifizierung**: Sichere Benutzeranmeldung
- **Automatische Backups**: Tägliche Datenbanksicherung
- **SSL-Unterstützung**: Let's Encrypt Integration
- **Monitoring**: Grundlegende Systemüberwachung

## 🚀 Installation

### Automatische Installation (Empfohlen)

```bash
# Repository klonen
git clone https://github.com/Olii83/gymtracker.git
cd gymtracker

# Installation ausführen
sudo chmod +x install.sh
sudo ./install.sh
```

### Manuelle Installation

```bash
# 1. Abhängigkeiten installieren
sudo apt update
sudo apt install -y nodejs npm sqlite3 nginx certbot

# 2. Repository klonen
git clone https://github.com/Olii83/gymtracker.git /var/www/gym-tracker
cd /var/www/gym-tracker

# 3. Dependencies installieren
npm install

# 4. Umgebungsvariablen konfigurieren
cp .env.example .env
# .env bearbeiten und JWT_SECRET setzen

# 5. Datenbank erstellen
mkdir -p database
sqlite3 database/gym_tracker.db < database/schema.sql

# 6. Service starten
sudo systemctl enable gym-tracker
sudo systemctl start gym-tracker
```

## 📋 Systemanforderungen

### Minimum
- **OS**: Ubuntu 20.04+ / Debian 11+
- **RAM**: 512 MB
- **Storage**: 2 GB freier Speicher
- **Node.js**: Version 16+

### Empfohlen
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 1 GB
- **Storage**: 5 GB freier Speicher
- **CPU**: 1 vCPU

## 🔐 Standard-Anmeldedaten

```
Benutzername: admin
Passwort: admin123
```

**⚠️ WICHTIG**: Ändern Sie das Standard-Passwort sofort nach der ersten Anmeldung!

## 📊 Datenbank-Schema

### Tabellen
- **users**: Benutzerkonten und Authentifizierung
- **exercises**: Übungsdatenbank mit Kategorien
- **workouts**: Trainingseinheiten
- **workout_exercises**: Verknüpfung zwischen Workouts und Übungen

### Beispiel-Übungen (bereits enthalten)
- Krafttraining: Bankdrücken, Kniebeugen, Kreuzheben
- Cardio: Laufband, Fahrrad, Ellipsentrainer
- Core: Plank, Crunches, Russian Twists

## 🛠️ Verwaltung

### Service-Befehle
```bash
# Status prüfen
sudo systemctl status gym-tracker

# Service neu starten
sudo systemctl restart gym-tracker

# Logs anzeigen
sudo journalctl -u gym-tracker -f

# Nginx neu laden
sudo systemctl reload nginx
```

### Datenbank-Management
```bash
# Datenbank öffnen
sqlite3 /var/www/gym-tracker/database/gym_tracker.db

# Backup erstellen
cd /var/www/gym-tracker && node scripts/backup.js

# Alle Backups anzeigen
ls -la /var/www/gym-tracker/backups/

# Datenbank-Größe prüfen
du -h /var/www/gym-tracker/database/gym_tracker.db
```

### Monitoring
```bash
# Anwendungsstatus
curl http://localhost:3000/api/health

# System-Monitor
tail -f /var/log/gym-tracker-monitor.log

# Nginx-Logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔄 Updates

### Automatisches Update
```bash
cd /var/www/gym-tracker
sudo git pull origin main
sudo npm install
sudo systemctl restart gym-tracker
```

### Backup vor Update
```bash
# Backup erstellen
sudo -u gym-tracker node scripts/backup.js

# Oder manuell
sudo cp /var/www/gym-tracker/database/gym_tracker.db \
       /var/www/gym-tracker/backups/manual_backup_$(date +%Y%m%d).db
```

## 🔒 Sicherheit

### Firewall-Konfiguration
```bash
# Status prüfen
sudo ufw status

# Regel hinzufügen
sudo ufw allow from TRUSTED_IP to any port 22
```

### SSL-Zertifikat
```bash
# Zertifikat erneuern
sudo certbot renew

# Status prüfen
sudo certbot certificates
```

### Fail2ban
```bash
# Status prüfen
sudo fail2ban-client status

# Gebannte IPs anzeigen
sudo fail2ban-client status sshd
```

## 📁 Verzeichnisstruktur

```
/var/www/gym-tracker/
├── server.js                 # Hauptanwendung
├── package.json              # Dependencies
├── .env                      # Umgebungsvariablen
├── database/
│   └── gym_tracker.db        # SQLite-Datenbank
├── public/
│   └── index.html            # Frontend
├── scripts/
│   ├── backup.js             # Backup-Script
│   └── monitor.sh            # Monitoring
├── backups/                  # Automatische Backups
├── logs/                     # Anwendungslogs
└── uploads/                  # Datei-Uploads
```

## 🌐 API-Endpunkte

### Authentifizierung
- `POST /api/auth/login` - Benutzeranmeldung
- `POST /api/auth/register` - Benutzerregistrierung

### Workouts
- `GET /api/workouts` - Alle Workouts abrufen
- `POST /api/workouts` - Neues Workout erstellen
- `GET /api/workouts/:id` - Workout-Details
- `PUT /api/workouts/:id` - Workout bearbeiten
- `DELETE /api/workouts/:id` - Workout löschen

### Übungen
- `GET /api/exercises` - Alle Übungen abrufen
- `POST /api/exercises` - Neue Übung erstellen
- `GET /api/exercises/:id` - Übungs-Details

### Dashboard
- `GET /api/dashboard/stats` - Dashboard-Statistiken

### System
- `GET /api/health` - Gesundheitsstatus

## 🧪 Entwicklung

### Lokale Entwicklung
```bash
# Repository klonen
git clone https://github.com/Olii83/gymtracker.git
cd gymtracker

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Datenbank einrichten
npm run setup
```

### Testing
```bash
# API-Tests
curl -X GET http://localhost:3000/api/health

# Authentifizierung testen
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 🔧 Konfiguration

### Umgebungsvariablen (.env)
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your_secret_here
DB_PATH=./database/gym_tracker.db
APP_URL=https://your-domain.com
```

### Nginx-Konfiguration
Die Nginx-Konfiguration befindet sich unter:
`/etc/nginx/sites-available/gym-tracker`

### Systemd-Service
Service-Datei: `/etc/systemd/system/gym-tracker.service`

## 📞 Support

### Problembehebung
1. **Service startet nicht**: Logs prüfen mit `journalctl -u gym-tracker`
2. **Datenbank-Fehler**: Berechtigungen prüfen und Backup wiederherstellen
3. **SSL-Probleme**: DNS-Einstellungen und Firewall prüfen

### Häufige Probleme

**Problem**: "EACCES: permission denied"
```bash
sudo chown -R gym-tracker:gym-tracker /var/www/gym-tracker
```

**Problem**: "Database is locked"
```bash
sudo systemctl stop gym-tracker
sudo rm -f /var/www/gym-tracker/database/gym_tracker.db-wal
sudo systemctl start gym-tracker
```

**Problem**: Nginx 502 Bad Gateway
```bash
sudo systemctl status gym-tracker
sudo systemctl restart gym-tracker
```

### Logs
- **Anwendung**: `journalctl -u gym-tracker -f`
- **Nginx**: `/var/log/nginx/error.log`
- **System**: `/var/log/syslog`
- **Monitoring**: `/var/log/gym-tracker-monitor.log`

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle einen Feature-Branch
3. Committe deine Änderungen
4. Push den Branch
5. Erstelle eine Pull-Request

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details.

## 🔗 Links

- **GitHub**: https://github.com/Olii83/gymtracker
- **Issues**: https://github.com/Olii83/gymtracker/issues
- **Releases**: https://github.com/Olii83/gymtracker/releases

## 🏗️ Roadmap

### v1.1 (geplant)
- [ ] Grafische Fortschrittsanzeige
- [ ] Export/Import von Trainingsdaten
- [ ] Erweiterte Benutzerprofile

### v1.2 (geplant)
- [ ] Mobile App (PWA)
- [ ] Soziale Features (Freunde, Gruppen)
- [ ] Erweiterte Analytik

## ⚡ Performance-Tipps

1. **Regelmäßige Backups**: Nutzen Sie die automatischen Backups
2. **Monitoring**: Überprüfen Sie regelmäßig die Logs
3. **Updates**: Halten Sie das System aktuell
4. **Festplatte**: Überwachen Sie den verfügbaren Speicherplatz
5. **SSL**: Automatische Erneuerung ist konfiguriert

---

**Entwickelt mit ❤️ für die Fitness-Community**