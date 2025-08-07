
# Installationsanleitung für Gym Tracker

Diese Anleitung beschreibt die Installation der Webanwendung "Gym Tracker" auf einem unprivilegierten Debian 12 LXC-Container.

## Voraussetzungen

* Ein Debian 12 LXC-Container mit Internetzugang.
* Grundkenntnisse im Umgang mit der Kommandozeile (Bash).
* Eine registrierte Domain (z.B. `gym.zhst.eu`), die auf die IP-Adresse deines Containers verweist.

## Schritt 1: System aktualisieren und Abhängigkeiten installieren

Verbinde dich via SSH mit deinem Container und führe folgende Befehle aus, um das System zu aktualisieren und die notwendigen Pakete zu installieren.

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git nginx mariadb-server nodejs npm
```

## Schritt 2: MariaDB-Datenbank einrichten

Melde dich bei der MariaDB-Konsole an und erstelle die Datenbank sowie einen neuen Benutzer.

```bash
sudo mysql
```

In der MariaDB-Konsole:

```sql
CREATE DATABASE gym_tracker;
CREATE USER "gymuser"@"localhost" IDENTIFIED BY "your_secure_password";
GRANT ALL PRIVILEGES ON gym_tracker.* TO "gymuser"@"localhost";
FLUSH PRIVILEGES;
EXIT;
```

**Wichtig:** Ersetze `your_secure_password` durch ein sicheres Passwort.

Nun importiere das Datenbankschema, das in der Backend-Sektion erstellt wurde. Speichere das Schema in einer Datei namens `schema.sql` und führe folgenden Befehl aus:

```bash
mysql -u gymuser -p gym_tracker < schema.sql
```

## Schritt 3: Backend-Applikation einrichten

Klone das Backend-Repository und installiere die Abhängigkeiten.

```bash
git clone [https://your-backend-repo-url.git](https://your-backend-repo-url.git) gym-tracker-backend
cd gym-tracker-backend
npm install
```

Erstelle die `.env`-Datei mit deinen Datenbank- und JWT-Einstellungen.

```bash
cp .env.example .env
nano .env
```

Passe die Werte in der `.env`-Datei an:

```env
DB_HOST=localhost
DB_USER=gymuser
DB_PASSWORD=your_secure_password
DB_NAME=gym_tracker
JWT_SECRET=your_super_secret_jwt_key
```

## Schritt 4: Frontend-Applikation einrichten

Klone das Frontend-Repository. Da es eine SPA ist, müssen wir es nur in das richtige Verzeichnis legen, damit Nginx es servieren kann.

```bash
git clone [https://your-frontend-repo-url.git](https://your-frontend-repo-url.git) gym-tracker-frontend
```

## Schritt 5: Nginx als Reverse Proxy und Webserver konfigurieren

Erstelle eine Nginx-Konfigurationsdatei für deine Domain.

```bash
sudo nano /etc/nginx/sites-available/gym.zhst.eu
```

Füge folgenden Inhalt ein:

```nginx
server {
    listen 80;
    server_name gym.zhst.eu;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /path/to/your/gym-tracker-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Aktiviere die Konfiguration und teste sie.

```bash
sudo ln -s /etc/nginx/sites-available/gym.zhst.eu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Schritt 6: Node.js-Anwendung als Dienst (Daemon) ausführen

Wir verwenden `systemd`, um die Node.js-Anwendung im Hintergrund laufen zu lassen und bei einem Neustart automatisch zu starten.

Erstelle die Service-Datei:

```bash
sudo nano /etc/systemd/system/gym-tracker.service
```

Füge diesen Inhalt ein (passe `WorkingDirectory` und `ExecStart` an):

```ini
[Unit]
Description=Gym Tracker Node.js App
After=network.target

[Service]
User=your_user_name
WorkingDirectory=/path/to/your/gym-tracker-backend
ExecStart=/usr/bin/node /path/to/your/gym-tracker-backend/src/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Aktiviere und starte den Dienst:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gym-tracker.service
sudo systemctl start gym-tracker.service
sudo systemctl status gym-tracker.service
```

Deine Anwendung sollte nun unter `http://gym.zhst.eu` erreichbar sein!

