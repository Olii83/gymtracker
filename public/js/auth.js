// Authentication module for Gym Tracker - Fixed Version
// Save as: public/js/auth.js (replace existing)

const Auth = {
    currentUser: null,
    authToken: null,

    // Initialize authentication
    init() {
        console.log('Auth: Initializing...');
        
        const token = localStorage.getItem('authToken');
        if (token) {
            this.authToken = token;
            this.verifyTokenAndLogin();
        } else {
            this.showLoginScreen();
        }
        
        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }
    },

    // Show login screen
    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    },

    // Verify token and login user
    async verifyTokenAndLogin() {
        try {
            const user = await Utils.apiCall('/user/profile');
            if (user) {
                this.currentUser = user;
                Utils.setCurrentUser(this.currentUser);
                this.showMainApp();
                if (App && App.loadDashboard) {
                    App.loadDashboard();
                }
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
        }
    },

    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div>';
            
            const credentials = {
                username: document.getElementById('loginUsername').value.trim(),
                password: document.getElementById('loginPassword').value
            };

            if (!credentials.username || !credentials.password) {
                throw new Error('Bitte füllen Sie alle Felder aus');
            }

            const response = await Utils.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            this.authToken = response.token;
            this.currentUser = response.user;
            
            localStorage.setItem('authToken', this.authToken);
            Utils.setCurrentUser(this.currentUser);
            
            this.showMainApp();
            
            if (App && App.loadDashboard) {
                App.loadDashboard();
            }
            
            Utils.showAlert('Erfolgreich angemeldet!', 'success');
        } catch (error) {
            Utils.showAlert(error.message || 'Anmeldung fehlgeschlagen', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Handle register
    async handleRegister(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div>';
            
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

            if (password !== passwordConfirm) {
                throw new Error('Passwörter stimmen nicht überein');
            }

            const userData = {
                username: document.getElementById('registerUsername').value.trim(),
                email: document.getElementById('registerEmail').value.trim(),
                password: password,
                first_name: document.getElementById('registerFirstName').value.trim() || null,
                last_name: document.getElementById('registerLastName').value.trim() || null
            };

            await Utils.apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            Utils.showAlert('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
            this.showTab('login');
            document.getElementById('registerForm').reset();
            document.getElementById('loginUsername').value = userData.username;
        } catch (error) {
            Utils.showAlert(error.message || 'Registrierung fehlgeschlagen', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Show auth tab
    showTab(tab) {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.add('hidden'));
        
        const activeTab = tab === 'login' ? 
            document.querySelector('.auth-tab:first-child') : 
            document.querySelector('.auth-tab:last-child');
        
        if (activeTab) activeTab.classList.add('active');
        
        const activeForm = document.getElementById(`${tab}Form`);
        if (activeForm) activeForm.classList.remove('hidden');
    },

    // Show main application
    showMainApp() {
        const loginScreen = document.getElementById('loginScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loginScreen) loginScreen.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');
        
        this.updateWelcomeMessage();
        this.updateAdminVisibility();
        
        if (Exercises && Exercises.loadAll) {
            Exercises.loadAll();
        }
    },

    // Update welcome message
    updateWelcomeMessage() {
        if (this.currentUser) {
            const displayName = this.currentUser.first_name && this.currentUser.last_name 
                ? `${this.currentUser.first_name} ${this.currentUser.last_name}`
                : this.currentUser.username;
            
            const welcomeElement = document.getElementById('userWelcome');
            if (welcomeElement) {
                welcomeElement.textContent = `Willkommen, ${displayName}!`;
            }
        }
    },

    // Update admin visibility
    updateAdminVisibility() {
        const adminButton = document.getElementById('adminButton');
        if (adminButton && this.currentUser) {
            if (this.currentUser.role === 'admin') {
                adminButton.classList.remove('hidden');
            } else {
                adminButton.classList.add('hidden');
            }
        }
    },

    // Show profile modal
    showProfileModal() {
        Utils.showAlert('Profil-Modal ist in Entwicklung', 'info');
    },

    // Logout
    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        Utils.removeLocalStorage('currentUser');
        
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        
        document.getElementById('loginForm').reset();
        this.showTab('login');
        
        if (App && App.clearCache) {
            App.clearCache();
        }
        
        Utils.showAlert('Sie wurden erfolgreich abgemeldet', 'info');
    },

    // Check if authenticated
    isAuthenticated() {
        return !!(this.authToken && this.currentUser);
    },

    // Check if admin
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
};
