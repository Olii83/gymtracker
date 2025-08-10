// Utility functions for Gym Tracker

const Utils = {
    // API Base URL
    API_BASE: '/api',

    // Show alert message
    showAlert(message, type = 'info', containerId = 'alertContainer') {
        const alertContainer = document.getElementById(containerId) || document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    },

    // Format date for display
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Format date and time
    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Get current date in YYYY-MM-DD format
    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    },

    // API call helper
    async apiCall(endpoint, options = {}) {
        const url = `${this.API_BASE}${endpoint}`;
        const authToken = localStorage.getItem('authToken');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (response.status === 401) {
                // Token expired or invalid
                Auth.logout();
                throw new Error('Sitzung abgelaufen. Bitte melden Sie sich erneut an.');
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Show/hide loading state for buttons
    setButtonLoading(buttonId, loading = true) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        const textSpan = button.querySelector('span');
        const loadingDiv = button.querySelector('.loading');

        if (loading) {
            button.disabled = true;
            if (textSpan) textSpan.style.display = 'none';
            if (loadingDiv) loadingDiv.classList.remove('hidden');
        } else {
            button.disabled = false;
            if (textSpan) textSpan.style.display = 'inline';
            if (loadingDiv) loadingDiv.classList.add('hidden');
        }
    },

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate password strength
    validatePassword(password) {
        if (!password) return 'Passwort ist erforderlich';
        if (password.length < 6) return 'Passwort muss mindestens 6 Zeichen lang sein';
        return null;
    },

    // Sanitize input to prevent XSS
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    // Parse JSON safely
    parseJSON(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('Failed to parse JSON:', error);
            return defaultValue;
        }
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Deep clone object
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    },

    // Check if user is admin
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },

    // Get current user from localStorage or session
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.warn('Failed to get current user:', error);
            return null;
        }
    },

    // Set current user
    setCurrentUser(user) {
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('currentUser');
        }
    },

    // Toggle element visibility
    toggleElement(elementId, show = null) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (show === null) {
            element.classList.toggle('hidden');
        } else {
            if (show) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    },

    // Scroll to top smoothly
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    },

    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showAlert('Text in Zwischenablage kopiert', 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showAlert('Fehler beim Kopieren in die Zwischenablage', 'error');
        }
    },

    // Download data as JSON file
    downloadJSON(data, filename = 'gym-tracker-data.json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Get exercise categories
    getExerciseCategories() {
        return [
            'Krafttraining',
            'Cardio',
            'Stretching',
            'Functional'
        ];
    },

    // Get muscle groups
    getMuscleGroups() {
        return [
            'Brust',
            'Rücken',
            'Schultern',
            'Arme',
            'Beine',
            'Core',
            'Cardio',
            'Ganzkörper'
        ];
    },

    // Format workout duration
    formatDuration(minutes) {
        if (!minutes || minutes <= 0) return 'Dauer nicht erfasst';
        
        if (minutes < 60) {
            return `${minutes} Minuten`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            
            if (remainingMinutes === 0) {
                return `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
            } else {
                return `${hours}h ${remainingMinutes}min`;
            }
        }
    },

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Local storage helpers
    setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Failed to set localStorage:', error);
        }
    },

    getLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to get localStorage:', error);
            return defaultValue;
        }
    },

    removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove localStorage:', error);
        }
    },

    // Check if element is in viewport
    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    // Smooth scroll to element
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
};

// Event delegation helper
Utils.delegate = function(parent, eventType, selector, handler) {
    parent.addEventListener(eventType, function(event) {
        const target = event.target.closest(selector);
        if (target && parent.contains(target)) {
            handler.call(target, event);
        }
    });
};

// Initialize utility functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Close modals when clicking outside
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };

    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });

    // Add ripple effect to buttons (optional)
    Utils.delegate(document, 'click', '.btn', function(e) {
        const button = this;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        if (!document.head.querySelector('#ripple-style')) {
            const style = document.createElement('style');
            style.id = 'ripple-style';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
                .btn {
                    position: relative;
                    overflow: hidden;
                }
            `;
            document.head.appendChild(style);
        }
        
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});
