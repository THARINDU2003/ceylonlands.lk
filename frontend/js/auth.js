/**
 * auth.js - Authentication handler for CeylonTerrece.com
 */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') && window.location.port !== '5000' ? 'http://localhost:5000/api' : '/api';

const auth = {
    // Current user state
    user: null,

    /**
     * Initialize auth state on page load
     */
    init() {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            this.user = JSON.parse(userData);
            this.updateUI(true);
        } else {
            this.updateUI(false);
        }
    },

    /**
     * Update the navigation UI based on login state
     */
    updateUI(isLoggedIn) {
        // Target both desktop and mobile IDs
        const guestLinks = document.querySelectorAll('#navGuestLinks, #mobileNavGuestLinks');
        const userLinks = document.querySelectorAll('#navUserLinks, #mobileNavUserLinks');
        const userNameElems = document.querySelectorAll('#navUserName, #mobileNavUserName');

        if (isLoggedIn) {
            guestLinks.forEach(el => el.classList.add('hidden'));
            userLinks.forEach(el => el.classList.remove('hidden'));
            userNameElems.forEach(el => {
                if (this.user) el.innerText = this.user.name || 'Dashboard';
            });
        } else {
            guestLinks.forEach(el => el.classList.remove('hidden'));
            userLinks.forEach(el => el.classList.add('hidden'));
        }
    },


    /**
     * Register a new user
     */
    async register(name, email, password, account_type = 'personal', company_name = '') {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, account_type, company_name })
        });

        // Guard: if server returns HTML instead of JSON, give a clear error
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error('Backend server is not available. This site requires a live Node.js backend to register. Please contact support.');
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        return data;
    },

    /**
     * Login user
     */
    async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        // Guard: if server returns HTML instead of JSON, give a clear error
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error('Cannot connect to server. The backend is not running. Please try again later or contact support.');
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Save to localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        this.user = data.user;
        
        this.updateUI(true);
        return data;
    },

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.user = null;
        window.location.href = '/index.html';
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => auth.init());

// Export to window
window.auth = auth;
