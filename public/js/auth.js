// Authentication module for Gym Tracker

const Auth = {
    currentUser: null,
    authToken: null,

    // Initialize authentication
    init() {
        const token = localStorage.getItem('authToken');
        if (token) {
            this.authToken = token;
            this.verifyTokenAndLogin();
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

        // Profile forms
        const updateProfileForm = document.getElementById('updateProfileForm');
        if (updateProfileForm) {
            updateProfileForm.addEventListener('submit', this.handleUpdateProfile.bind(this));
        }

        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', this.handleChangePassword.bind(this));
        }
    },

    // Verify token and login user
    async verifyTokenAndLogin() {
        try {
            const user = await Utils.apiCall('/user/profile');
            if (user) {
                this.currentUser = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    first_name: user.first_name,
                    last_name: user.last_name
                };
                Utils.setCurrentUser(this.currentUser);
                this.showMainApp();
                App.loadDashboard();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
        }
    },

    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span style="display: none;">Anmelden</span>
                <div class="loading" style="margin-left: 10px; display: inline-block;"></div>
            `;
            
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

            if (response && response.token && response.user) {
                this.authToken = response.token;
                this.currentUser = response.user;
                
                localStorage.setItem('authToken', this.authToken);
                Utils.setCurrentUser(this.currentUser);
                
                this.showMainApp();
                App.loadDashboard();
                
                Utils.showAlert('Erfolgreich angemeldet!', 'success');
            } else {
                throw new Error('Ungültige Antwort vom Server');
            }
        } catch (error) {
            console.error('Login error:', error);
            Utils.showAlert(error.message || 'Anmeldung fehlgeschlagen', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Handle register form submission
    async handleRegister(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span style="display: none;">Registrieren</span>
                <div class="loading" style="margin-left: 10px; display: inline-block;"></div>
            `;
            
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
            const username = document.getElementById('registerUsername').value.trim();
            const email = document.getElementById('registerEmail').value.trim();

            // Validation
            if (!username || !email || !password) {
                throw new Error('Bitte füllen Sie alle Pflichtfelder aus');
            }

            if (!Utils.isValidEmail(email)) {
                throw new Error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
            }

            const passwordError = Utils.validatePassword(password);
            if (passwordError) {
                throw new Error(passwordError);
            }

            if (password !== passwordConfirm) {
                throw new Error('Passwörter stimmen nicht überein');
            }

            const userData = {
                username,
                email,
                password,
                first_name: document.getElementById('registerFirstName').value.trim() || null,
                last_name: document.getElementById('registerLastName').value.trim() || null
            };

            const response = await Utils.apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response) {
                Utils.showAlert('Registrierung erfolgreich! Sie können sich jetzt anmelden.', 'success');
                this.showTab('login');
                document.getElementById('registerForm').reset();
                
                // Pre-fill login form
                document.getElementById('loginUsername').value = username;
            }
        } catch (error) {
            console.error('Registration error:', error);
            Utils.showAlert(error.message || 'Registrierung fehlgeschlagen', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Handle profile update
    async handleUpdateProfile(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span style="display: none;">Profil aktualisieren</span>
                <div class="loading" style="margin-left: 10px; display: inline-block;"></div>
            `;
            
            const username = document.getElementById('profileUsername').value.trim();
            const email = document.getElementById('profileEmail').value.trim();

            if (!username || !email) {
                throw new Error('Benutzername und E-Mail sind erforderlich');
            }

            if (!Utils.isValidEmail(email)) {
                throw new Error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
            }

            const profileData = {
                username,
                email,
                first_name: document.getElementById('profileFirstName').value.trim() || null,
                last_name: document.getElementById('profileLastName').value.trim() || null
            };

            await Utils.apiCall('/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            // Update current user data
            this.currentUser.username = profileData.username;
            this.currentUser.email = profileData.email;
            this.currentUser.first_name = profileData.first_name;
            this.currentUser.last_name = profileData.last_name;
            Utils.setCurrentUser(this.currentUser);
            
            // Update welcome message
            this.updateWelcomeMessage();

            Utils.showAlert('Profil erfolgreich aktualisiert!', 'success');
        } catch (error) {
            console.error('Profile update error:', error);
            Utils.showAlert(error.message || 'Fehler beim Aktualisieren des Profils', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Handle password change
    async handleChangePassword(e) {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span style="display: none;">Passwort ändern</span>
                <div class="loading" style="margin-left: 10px; display: inline-block;"></div>
            `;
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            
            if (!currentPassword || !newPassword || !confirmNewPassword) {
                throw new Error('Bitte füllen Sie alle Felder aus');
            }

            const passwordError = Utils.validatePassword(newPassword);
            if (passwordError) {
                throw new Error(passwordError);
            }
            
            if (newPassword !== confirmNewPassword) {
                throw new Error('Neue Passwörter stimmen nicht überein');
            }

            await Utils.apiCall('/user/password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword, newPassword })
            });

            Utils.showAlert('Passwort erfolgreich geändert!', 'success');
            document.getElementById('changePasswordForm').reset();
        } catch (error) {
            console.error('Password change error:', error);
            Utils.showAlert(error.message || 'Fehler beim Ändern des Passworts', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    },

    // Show auth tab (login/register)
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
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        this.updateWelcomeMessage();
        this.updateAdminVisibility();
        
        // Load exercises for workout creation
        Exercises.loadAll();
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

    // Update admin button visibility
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
    async showProfileModal() {
        try {
            const profile = await Utils.apiCall('/user/profile');
            
            if (profile) {
                document.getElementById('profileUsername').value = profile.username || '';
                document.getElementById('profileEmail').value = profile.email || '';
                document.getElementById('profileFirstName').value = profile.first_name || '';
                document.getElementById('profileLastName').value = profile.last_name || '';
                document.getElementById('profileRole').textContent = profile.role === 'admin' ? 'Administrator' : 'Benutzer';
                document.getElementById('profileMemberSince').textContent = Utils.formatDate(profile.created_at);
                
                document.getElementById('profileModal').style.display = 'block';
            }
        } catch (error) {
            console.error('Profile load error:', error);
            Utils.showAlert('Fehler beim Laden des Profils: ' + error.message, 'error');
        }
    },

    // Close profile modal
    closeProfileModal() {
        document.getElementById('profileModal').style.display = 'none';
        document.getElementById('changePasswordForm').reset();
        document.getElementById('updateProfileForm').reset();
    },

    // Logout user
    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        Utils.removeLocalStorage('currentUser');
        
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        
        // Reset forms
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
        
        // Clear alerts
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
        
        this.showTab('login');
        
        // Clear any cached data
        App.clearCache();
        
        Utils.showAlert('Sie wurden erfolgreich abgemeldet', 'info');
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!(this.authToken && this.currentUser);
    },

    // Check if user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    },

    // Get auth token
    getAuthToken() {
        return this.authToken;
    }
};
