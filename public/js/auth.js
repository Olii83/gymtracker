// Authentifizierungsmodul für Gym Tracker - Überarbeitete Version
// Verwaltet die Benutzer-Authentifizierung, -Registrierung und -Sitzung.

const Auth = {
    // Zustandsvariablen
    currentUser: null,
    authToken: null,

    /**
     * Initialisiert das Authentifizierungsmodul.
     * Prüft auf einen gespeicherten Token und versucht die Anmeldung.
     */
    init() {
        console.log('Auth: Initialisiere...');
        
        this.setupEventListeners();
        this.loadTokenAndUser();
        this.updateNavUI();
    },
    
    /**
     * Lädt den gespeicherten Token und den Benutzer aus dem localStorage und verifiziert ihn.
     */
    loadTokenAndUser() {
        this.authToken = localStorage.getItem('authToken');
        this.currentUser = Utils.getLocalStorage('currentUser');
        
        if (this.authToken && this.currentUser) {
            console.log('Auth: Token und Benutzerdaten gefunden, verifiziere...');
            this.verifyTokenAndLogin();
        } else {
            console.log('Auth: Kein Token gefunden oder ungültig, zeige Login-Bildschirm');
            this.showLoginScreen();
        }
    },

    /**
     * Richtet Event-Listener für Formulare ein.
     */
    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }
        
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', this.logout.bind(this));
        }
    },

    /**
     * Verarbeitet das Login-Formular-Submit.
     * @param {Event} event - Das Formular-Submit-Event.
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await Utils.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            if (response && response.token && response.user) {
                this.handleSuccessfulAuth(response.token, response.user);
            } else {
                throw new Error('Ungültige Antwort vom Server.');
            }
        } catch (error) {
            console.error('Auth: Login-Fehler:', error);
            Utils.showAlert('Anmeldung fehlgeschlagen: ' + error.message, 'error');
        }
    },

    /**
     * Verarbeitet das Registrierungs-Formular-Submit.
     * @param {Event} event - Das Formular-Submit-Event.
     */
    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const response = await Utils.apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password })
            });
            
            if (response && response.token && response.user) {
                this.handleSuccessfulAuth(response.token, response.user);
            } else {
                throw new Error('Ungültige Antwort vom Server.');
            }
        } catch (error) {
            console.error('Auth: Registrierungs-Fehler:', error);
            Utils.showAlert('Registrierung fehlgeschlagen: ' + error.message, 'error');
        }
    },

    /**
     * Speichert den Token und die Benutzerdaten bei erfolgreicher Authentifizierung.
     * @param {string} token - Der JWT-Token.
     * @param {object} user - Das Benutzer-Objekt.
     */
    handleSuccessfulAuth(token, user) {
        this.authToken = token;
        this.currentUser = user;
        localStorage.setItem('authToken', token);
        Utils.setLocalStorage('currentUser', user);
        
        Utils.showAlert('Anmeldung erfolgreich!', 'success');
        this.updateNavUI();
        App.showSection('dashboard');
    },

    /**
     * Verifiziert den Token beim Anwendungsstart und meldet den Benutzer an.
     */
    async verifyTokenAndLogin() {
        try {
            const response = await Utils.apiCall('/auth/verify-token', {
                method: 'POST'
            });
            
            if (response && response.user) {
                this.currentUser = response.user;
                Utils.setLocalStorage('currentUser', response.user);
                this.updateNavUI();
                App.showSection('dashboard');
            } else {
                throw new Error('Token-Verifizierung fehlgeschlagen.');
            }
        } catch (error) {
            console.error('Auth: Token-Verifizierungsfehler:', error);
            this.showLoginScreen();
        }
    },
    
    /**
     * Zeigt den Anmeldebildschirm und versteckt die Hauptanwendung.
     */
    showLoginScreen() {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('appShell').classList.add('hidden');
        this.updateNavUI();
    },
    
    /**
     * Zeigt die Hauptanwendung und versteckt den Anmeldebildschirm.
     */
    showAppShell() {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('appShell').classList.remove('hidden');
    },

    /**
     * Loggt den Benutzer aus, löscht den Token und die lokalen Daten.
     */
    logout() {
        console.log('Auth: Logge aus...');
        
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        Utils.removeLocalStorage('currentUser');
        
        App.resetState(); // Setze den Anwendungszustand zurück
        this.showLoginScreen();
        
        Utils.showAlert('Sie wurden erfolgreich abgemeldet', 'info');
    },

    /**
     * Aktualisiert die Navigations-UI basierend auf dem Anmeldestatus.
     */
    updateNavUI() {
        const isAuthenticated = this.isAuthenticated();
        const isAdmin = this.isAdmin();
        
        document.getElementById('profileButton').classList.toggle('hidden', !isAuthenticated);
        document.getElementById('logoutButton').classList.toggle('hidden', !isAuthenticated);
        document.getElementById('adminButton').classList.toggle('hidden', !isAdmin);
        document.getElementById('authNav').classList.toggle('hidden', isAuthenticated);
        
        if (isAuthenticated) {
            this.showAppShell();
        } else {
            this.showLoginScreen();
        }
    },

    /**
     * Prüft, ob der Benutzer authentifiziert ist.
     * @returns {boolean} - True, wenn der Benutzer angemeldet ist.
     */
    isAuthenticated() {
        return !!(this.authToken && this.currentUser);
    },

    /**
     * Prüft, ob der Benutzer Admin-Rechte hat.
     * @returns {boolean} - True, wenn der Benutzer ein Admin ist.
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    /**
     * Gibt das aktuelle Benutzer-Objekt zurück.
     * @returns {object|null} - Das Benutzer-Objekt oder null.
     */
    getCurrentUser() {
        return this.currentUser;
    }
};
