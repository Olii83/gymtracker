// Utility-Funktionen für Gym Tracker - Überarbeitete Version
// Dieses Modul enthält allgemeine, wiederverwendbare Funktionen, um Redundanz zu vermeiden.

const Utils = {
    // Basis-URL für die API-Aufrufe.
    API_BASE: '/api',

    /**
     * Führt einen API-Aufruf durch und behandelt die Antwort.
     * @param {string} endpoint - Der API-Endpunkt.
     * @param {object} options - Fetch-Optionen (Methode, Body, Header, etc.).
     * @returns {Promise<object>} - Ein Promise, das die JSON-Daten der Antwort auflöst.
     * @throws {Error} - Wirft einen Fehler, wenn die API-Antwort fehlschlägt.
     */
    async apiCall(endpoint, options = {}) {
        const url = `${this.API_BASE}${endpoint}`;
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Auth.authToken}`
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            }
        };

        try {
            const response = await fetch(url, config);

            // Spezialfall für DELETE-Anfragen, die keinen Body zurückgeben
            if (response.status === 204) {
                return {};
            }

            if (!response.ok) {
                let errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || `API-Fehler: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('API-Aufruf fehlgeschlagen:', error);
            throw error;
        }
    },
    
    /**
     * Zeigt eine temporäre Benachrichtigung an.
     * @param {string} message - Die anzuzeigende Nachricht.
     * @param {string} type - Der Typ der Benachrichtigung: 'info', 'success', 'error', 'warning'.
     * @param {string} containerId - Die ID des Containers, in dem die Benachrichtigung angezeigt wird.
     */
    showAlert(message, type = 'info', containerId = 'alertContainer') {
        const alertContainer = document.getElementById(containerId);
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        // Entferne vorherige Alerts im Container
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
        
        // Automatisches Ausblenden nach 5 Sekunden
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    },

    /**
     * Formatiert ein ISO-Datum für die Anzeige.
     * @param {string} dateString - Ein ISO 8601 Datumsstring.
     * @returns {string} - Das formatierte Datum.
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    /**
     * Gibt das aktuelle Datum im YYYY-MM-DD-Format zurück.
     * @returns {string} - Das aktuelle Datum.
     */
    getCurrentDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Speichert Daten im localStorage unter einem bestimmten Schlüssel.
     * @param {string} key - Der Schlüssel.
     * @param {object|string|number} data - Die zu speichernden Daten.
     */
    setLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Fehler beim Speichern im localStorage:', error);
        }
    },

    /**
     * Ruft Daten aus dem localStorage ab und parst sie.
     * @param {string} key - Der Schlüssel.
     * @param {*} defaultValue - Der Standardwert, falls keine Daten gefunden werden.
     * @returns {*} - Die abgerufenen Daten oder der Standardwert.
     */
    getLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Fehler beim Abrufen aus localStorage:', error);
            return defaultValue;
        }
    },
    
    /**
     * Entfernt einen Eintrag aus dem localStorage.
     * @param {string} key - Der Schlüssel.
     */
    removeLocalStorage(key) {
        localStorage.removeItem(key);
    },
    
    /**
     * Lädt eine JSON-Datei herunter.
     * @param {object} data - Die herunterzuladenden Daten.
     * @param {string} filename - Der Name der Datei.
     */
    downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Hilfsfunktion für Event-Delegation.
     * @param {Element} parent - Das übergeordnete Element.
     * @param {string} eventType - Der Event-Typ (z.B. 'click').
     * @param {string} selector - Der CSS-Selektor für die Zielelemente.
     * @param {Function} handler - Die Handler-Funktion.
     */
    delegate(parent, eventType, selector, handler) {
        parent.addEventListener(eventType, function(event) {
            const target = event.target.closest(selector);
            if (target && parent.contains(target)) {
                handler.call(target, event);
            }
        });
    }
};
