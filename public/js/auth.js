// Authentifizierungsmodul für Gym Tracker - Überarbeitete und vollständige Version

const Auth = {
    // Zustandsvariablen für den aktuellen Benutzer und den Authentifizierungs-Token
    currentUser: null,
    authToken: null,

    /**
     * Initialisiert das Authentifizierungsmodul.
     * Prüft beim Start, ob ein gespeicherter Token vorhanden ist.
     */
    init() {
        console.log('Auth: Initialisiere...');
        this.setupEventListeners();
        this.loadTokenAndUser(); // Trennung der Initialisierungslogik
    },

    /**
     * Lädt den gespeicherten Token und Benutzerdaten aus dem lokalen Speicher und verifiziert sie.
     */
    async loadTokenAndUser() {
        const token = localStorage.getItem('authToken');
        const userJson = Utils.getLocalStorage('currentUser');
        
        if (token && userJson) {
            console.log('Auth: Token und Benutzerdaten gefunden, verifiziere...');
            this.authToken = token;
            this.currentUser = userJson;
            await this.verifyTokenAndLogin();
        } else {
            console.log('Auth: Kein gültiger Token oder Benutzer gefunden, zeige Login-Bildschirm.');
            this.showLoginScreen();
        }
    },

    /**
     * Richtet alle Event-Listener für Formulare (Login und Registrierung) ein.
     */
    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
            console.log('Auth: Login-Formular Event-Listener hinzugefügt');
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
            console.log('Auth: Registrierungs-Formular Event-Listener hinzugefügt');
        }
    },

    /**
     * Zeigt den Login-Bildschirm an.
     * Stellt sicher, dass das entsprechende HTML-Element existiert, bevor es verwendet wird.
     */
    showLoginScreen() {
        console.log('Auth: Zeige Login-Bildschirm');
        const loginScreen = document.getElementById('loginScreen');
        const appContainer = document.getElementById('appContainer');
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
        }
        if (appContainer) {
            appContainer.classList.add('hidden');
        }
        if (typeof App !== 'undefined' && App.showSection) {
            App.showSection('login');
        }
        this.updateNavUI(); // UI aktualisieren
    },

    /**
     * Zeigt den Haupt-App-Container an.
     * Stellt sicher, dass das entsprechende HTML-Element existiert, bevor es verwendet wird.
     */
    showAppContainer() {
        console.log('Auth: Zeige App-Container');
        const loginScreen = document.getElementById('loginScreen');
        const appContainer = document.getElementById('appContainer');
        if (loginScreen) {
            loginScreen.classList.add('hidden');
        }
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }
    },

    /**
     * Zeigt den entsprechenden Anmelde- oder Registrierungs-Tab an.
     * @param {string} tabName - Der Name des Tabs ('login' oder 'register')
     */
    showTab(tabName) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const loginTabButton = document.querySelector('.auth-tab[onclick*="login"]');
        const registerTabButton = document.querySelector('.auth-tab[onclick*="register"]');

        if (tabName === 'login') {
            loginForm?.classList.remove('hidden');
            registerForm?.classList.add('hidden');
            loginTabButton?.classList.add('active');
            registerTabButton?.classList.remove('active');
        } else if (tabName === 'register') {
            loginForm?.classList.add('hidden');
            registerForm?.classList.remove('hidden');
            loginTabButton?.classList.remove('active');
            registerTabButton?.classList.add('active');
        }
    },

    /**
     * Behandelt das Login-Formular.
     * Fügt Null-Checks für die Formularfelder hinzu, um Fehler zu vermeiden.
     * @param {Event} event - Das Submit-Event
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');

        if (!usernameInput || !passwordInput) {
            Utils.showAlert('Login-Formular nicht gefunden.', 'error');
            return;
        }

        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            Utils.showAlert('Bitte Benutzername und Passwort eingeben.', 'warning');
            return;
        }
        
        try {
            if (typeof App !== 'undefined' && App.showLoading) {
                App.showLoading();
            }
            const response = await Utils.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            this.authToken = response.token;
            this.currentUser = response.user;
            
            // Token und Benutzerdaten im Local Storage speichern
            localStorage.setItem('authToken', this.authToken);
            Utils.setLocalStorage('currentUser', this.currentUser);

            this.updateNavUI();
            
            // Dashboard laden und anzeigen
            this.showAppContainer();
            if (typeof App !== 'undefined' && App.showSection) {
                App.showSection('dashboard');
            }
            Utils.showAlert('Anmeldung erfolgreich!', 'success');
        } catch (error) {
            console.error('Auth: Login-Fehler:', error);
            Utils.showAlert('Login fehlgeschlagen: ' + error.message, 'error');
        } finally {
            if (typeof App !== 'undefined' && App.hideLoading) {
                 App.hideLoading();
            }
        }
    },

    /**
     * Behandelt das Registrierungs-Formular.
     * @param {Event} event - Das Submit-Event
     */
    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('registerUsername')?.value;
        const email = document.getElementById('registerEmail')?.value;
        const password = document.getElementById('registerPassword')?.value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm')?.value;

        if (!username || !email || !password || !passwordConfirm) {
            Utils.showAlert('Bitte alle Felder ausfüllen.', 'warning');
            return;
        }

        if (password !== passwordConfirm) {
            Utils.showAlert('Passwörter stimmen nicht überein.', 'warning');
            return;
        }

        try {
            if (typeof App !== 'undefined' && App.showLoading) {
                App.showLoading();
            }
            await Utils.apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password })
            });
            
            Utils.showAlert('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
            this.showTab('login');
        } catch (error) {
            console.error('Auth: Registrierungs-Fehler:', error);
            Utils.showAlert('Registrierung fehlgeschlagen: ' + error.message, 'error');
        } finally {
            if (typeof App !== 'undefined' && App.hideLoading) {
                App.hideLoading();
            }
        }
    },

    /**
     * Verifiziert den Token und loggt den Benutzer ein, falls der Token gültig ist.
     */
    async verifyTokenAndLogin() {
        try {
            if (typeof App !== 'undefined' && App.showLoading) {
                 App.showLoading();
            }
            const response = await Utils.apiCall('/auth/verify-token', {
                method: 'POST',
                body: JSON.stringify({ token: this.authToken })
            });

            if (response.isValid) {
                this.updateNavUI();
                this.showAppContainer();
                if (typeof App !== 'undefined' && App.showSection) {
                    App.showSection('dashboard');
                }
                Utils.showAlert('Anmeldung erfolgreich fortgesetzt!', 'success');
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Auth: Token-Verifizierungsfehler:', error);
            this.logout();
        } finally {
            if (typeof App !== 'undefined' && App.hideLoading) {
                App.hideLoading();
            }
        }
    },

    /**
     * Aktualisiert die Navigationsleiste basierend auf dem Anmeldestatus und der Benutzerrolle.
     * Fügt Null-Checks hinzu, um Fehler zu vermeiden, wenn Elemente nicht existieren.
     */
    updateNavUI() {
        const navButtons = {
            loginButton: document.getElementById('navLoginButton'),
            registerButton: document.getElementById('navRegisterButton'),
            adminButton: document.getElementById('navAdminButton'),
            logoutButton: document.getElementById('navLogoutButton'),
            profileButton: document.getElementById('navProfileButton'),
            workoutsButton: document.getElementById('navWorkoutsButton'),
            exercisesButton: document.getElementById('navExercisesButton'),
            templatesButton: document.getElementById('navTemplatesButton'),
            statsButton: document.getElementById('navStatsButton'),
            settingsButton: document.getElementById('navSettingsButton')
        };
    
        if (this.isAuthenticated()) {
            navButtons.loginButton?.classList.add('hidden');
            navButtons.registerButton?.classList.add('hidden');
            navButtons.logoutButton?.classList.remove('hidden');
            
            // Zeige Dashboard-Buttons
            navButtons.profileButton?.classList.remove('hidden');
            navButtons.workoutsButton?.classList.remove('hidden');
            navButtons.exercisesButton?.classList.remove('hidden');
            navButtons.templatesButton?.classList.remove('hidden');
            navButtons.statsButton?.classList.remove('hidden');
            navButtons.settingsButton?.classList.remove('hidden');

            if (this.isAdmin()) {
                navButtons.adminButton?.classList.remove('hidden');
            } else {
                navButtons.adminButton?.classList.add('hidden');
            }
        } else {
            navButtons.loginButton?.classList.remove('hidden');
            navButtons.registerButton?.classList.remove('hidden');
            navButtons.logoutButton?.classList.add('hidden');
            navButtons.adminButton?.classList.add('hidden');
            
            // Verstecke alle Dashboard-Buttons
            navButtons.profileButton?.classList.add('hidden');
            navButtons.workoutsButton?.classList.add('hidden');
            navButtons.exercisesButton?.classList.add('hidden');
            navButtons.templatesButton?.classList.add('hidden');
            navButtons.statsButton?.classList.add('hidden');
            navButtons.settingsButton?.classList.add('hidden');
        }
    },

    /**
     * Loggt den Benutzer aus und löscht lokale Daten.
     */
    logout() {
        console.log('Auth: Logge aus...');
        
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        Utils.removeLocalStorage('currentUser');
        
        this.showLoginScreen();
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
        
        // App-Cache löschen, falls die Funktion existiert
        if (typeof App !== 'undefined' && App.resetState) {
            App.resetState();
        }
        
        Utils.showAlert('Sie wurden erfolgreich abgemeldet', 'info');
    },

    /**
     * Prüft, ob der Benutzer authentifiziert ist.
     * @returns {boolean} - Authentifiziert oder nicht
     */
    isAuthenticated() {
        return !!(this.authToken && this.currentUser);
    },

    /**
     * Prüft, ob der Benutzer Admin-Rechte hat.
     * @returns {boolean} - Admin oder nicht
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    /**
     * Gibt den aktuellen Benutzer zurück.
     * @returns {object|null} - Benutzerdaten oder null
     */
    getCurrentUser() {
        return this.currentUser;
    }
};
