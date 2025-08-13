// Authentifizierungsmodul für Gym Tracker

const Auth = {
    currentUser: null,
    authToken: null,

    /**
     * Initialisiert das Authentifizierungsmodul
     */
    init() {
        console.log('Auth: Initialisiere...');
        
        // Prüfe auf gespeicherten Token
        const token = localStorage.getItem('authToken');
        if (token) {
            console.log('Auth: Token gefunden, verifiziere...');
            this.authToken = token;
            this.verifyTokenAndLogin();
        } else {
            console.log('Auth: Kein Token gefunden, zeige Login-Bildschirm');
            this.showLoginScreen();
        }
        
        this.setupEventListeners();
    },

    /**
     * Richtet Event-Listener für Formulare ein
     */
    setupEventListeners() {
        // Login-Formular
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
            console.log('Auth: Login-Formular Event-Listener hinzugefügt');
        }

        // Registrierungs-Formular
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
            console.log('Auth: Registrierungs-Formular Event-Listener hinzugefügt');
        }
    },

    /**
     * Zeigt den Login-Bildschirm an
     */
    showLoginScreen() {
        console.log('Auth: Zeige Login-Bildschirm');
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
            console.log('Auth: Login-Bildschirm sichtbar');
        }
        if (mainApp) {
            mainApp.classList.add('hidden');
            console.log('Auth: Hauptanwendung versteckt');
        }
    },

    /**
     * Verifiziert den gespeicherten Token und loggt den Benutzer ein
     */
    async verifyTokenAndLogin() {
        console.log('Auth: Verifiziere Token...');
        try {
            const user = await Utils.apiCall('/user/profile');
            if (user) {
                console.log('Auth: Token gültig, Benutzer:', user.username);
                this.currentUser = user;
                Utils.setCurrentUser(this.currentUser);
                this.showMainApp();
                
                // Dashboard nach erfolgreichem Login laden
                setTimeout(() => {
                    if (App && App.loadDashboard) {
                        App.loadDashboard();
                    }
                }, 100);
            }
        } catch (error) {
            console.log('Auth: Token ungültig, zeige Login:', error.message);
            this.logout();
        }
    },

    /**
     * Behandelt Login-Formular-Einreichung
     */
    async handleLogin(e) {
        e.preventDefault();
        console.log('Auth: Behandle Login...');
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            // Button-Zustand während Request ändern
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div>';
            
            // Formulardaten sammeln
            const credentials = {
                username: document.getElementById('loginUsername').value.trim(),
                password: document.getElementById('loginPassword').value
            };

            // Eingabevalidierung
            if (!credentials.username || !credentials.password) {
                throw new Error('Bitte füllen Sie alle Felder aus');
            }

            console.log('Auth: Sende Login-Request...');
            const response = await Utils.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            console.log('Auth: Login erfolgreich');
            
            // Token und Benutzerdaten speichern
            this.authToken = response.token;
            this.currentUser = response.user;
            
            localStorage.setItem('authToken', this.authToken);
            Utils.setCurrentUser(this.currentUser);
            
            this.showMainApp();
            
            // Dashboard laden
            setTimeout(() => {
                if (App && App.loadDashboard) {
                    App.loadDashboard();
                }
            }, 100);
            
            Utils.showAlert('Erfolgreich angemeldet!', 'success');
        } catch (error) {
            console.error('Auth: Login fehlgeschlagen:', error);
            Utils.showAlert(error.message || 'Anmeldung fehlgeschlagen', 'error');
        } finally {
            // Button-Zustand zurücksetzen
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    /**
     * Behandelt Registrierungs-Formular-Einreichung
     */
    async handleRegister(e) {
        e.preventDefault();
        console.log('Auth: Behandle Registrierung...');
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            // Button-Zustand während Request ändern
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div>';
            
            // Passwort-Übereinstimmung prüfen
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

            if (password !== passwordConfirm) {
                throw new Error('Passwörter stimmen nicht überein');
            }

            // Formulardaten sammeln
            const userData = {
                username: document.getElementById('registerUsername').value.trim(),
                email: document.getElementById('registerEmail').value.trim(),
                password: password,
                first_name: document.getElementById('registerFirstName').value.trim() || null,
                last_name: document.getElementById('registerLastName').value.trim() || null
            };

            // Registrierungs-Request senden
            await Utils.apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            Utils.showAlert('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
            
            // Zur Login-Ansicht wechseln und Benutzername vorausfüllen
            this.showTab('login');
            document.getElementById('registerForm').reset();
            document.getElementById('loginUsername').value = userData.username;
        } catch (error) {
            console.error('Auth: Registrierung fehlgeschlagen:', error);
            Utils.showAlert(error.message || 'Registrierung fehlgeschlagen', 'error');
        } finally {
            // Button-Zustand zurücksetzen
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    /**
     * Wechselt zwischen Login- und Registrierungs-Tab
     * @param {string} tab - 'login' oder 'register'
     */
    showTab(tab) {
        console.log('Auth: Wechsle zu Tab:', tab);
        
        // Alle Tabs und Formulare zurücksetzen
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.add('hidden'));
        
        // Aktiven Tab markieren
        const activeTab = tab === 'login' ? 
            document.querySelector('.auth-tab:first-child') : 
            document.querySelector('.auth-tab:last-child');
        
        if (activeTab) activeTab.classList.add('active');
        
        // Entsprechendes Formular anzeigen
        const activeForm = document.getElementById(`${tab}Form`);
        if (activeForm) activeForm.classList.remove('hidden');
    },

    /**
     * Zeigt die Hauptanwendung an
     */
    showMainApp() {
        console.log('Auth: Zeige Hauptanwendung');
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) {
            loginScreen.classList.add('hidden');
            console.log('Auth: Login-Bildschirm versteckt');
        }
        if (mainApp) {
            mainApp.classList.remove('hidden');
            console.log('Auth: Hauptanwendung sichtbar');
        }
        
        this.updateWelcomeMessage();
        this.updateAdminVisibility();
        
        // Übungen für Workout-Erstellung laden
        setTimeout(() => {
            if (Exercises && Exercises.loadAll) {
                Exercises.loadAll();
            }
        }, 200);
    },

    /**
     * Aktualisiert die Begrüßungsnachricht im Header
     */
    updateWelcomeMessage() {
        if (this.currentUser) {
            // Anzeigename bestimmen (Vollname oder Benutzername)
            const displayName = this.currentUser.first_name && this.currentUser.last_name 
                ? `${this.currentUser.first_name} ${this.currentUser.last_name}`
                : this.currentUser.username;
            
            const welcomeElement = document.getElementById('userWelcome');
            if (welcomeElement) {
                welcomeElement.textContent = `Willkommen, ${displayName}!`;
                console.log('Auth: Begrüßungsnachricht aktualisiert');
            }
        }
    },

    /**
     * Zeigt/versteckt Admin-Button basierend auf Benutzerrolle
     */
    updateAdminVisibility() {
        const adminButton = document.getElementById('adminButton');
        if (adminButton && this.currentUser) {
            if (this.currentUser.role === 'admin') {
                adminButton.classList.remove('hidden');
                console.log('Auth: Admin-Button angezeigt');
            } else {
                adminButton.classList.add('hidden');
                console.log('Auth: Admin-Button versteckt');
            }
        }
    },

    /**
     * Loggt den Benutzer aus
     */
    logout() {
        console.log('Auth: Logge aus...');
        
        // Lokale Daten löschen
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        Utils.removeLocalStorage('currentUser');
        
        // Zur Login-Ansicht wechseln
        this.showLoginScreen();
        
        // Formulare zurücksetzen
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
        
        this.showTab('login');
        
        // App-Cache löschen
        if (App && App.clearCache) {
            App.clearCache();
        }
        
        Utils.showAlert('Sie wurden erfolgreich abgemeldet', 'info');
    },

    /**
     * Prüft ob Benutzer authentifiziert ist
     * @returns {boolean} - Authentifiziert oder nicht
     */
    isAuthenticated() {
        return !!(this.authToken && this.currentUser);
    },

    /**
     * Prüft ob Benutzer Admin-Rechte hat
     * @returns {boolean} - Admin oder nicht
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    /**
     * Gibt aktuellen Benutzer zurück
     * @returns {object|null} - Benutzerdaten oder null
     */
    getCurrentUser() {
        return this.currentUser;
    }
};