/**
 * auth.js - Authentication handler for CeylonTerrace.com
 */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000' 
    ? 'http://localhost:5000/api' 
    : '/api';

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
        const guestLinks = document.getElementById('navGuestLinks');
        const userLinks = document.getElementById('navUserLinks');
        const userNameElem = document.getElementById('navUserName');

        if (isLoggedIn) {
            if (guestLinks) guestLinks.classList.add('hidden');
            if (userLinks) userLinks.classList.remove('hidden');
            if (userNameElem && this.user) {
                userNameElem.innerText = this.user.name || 'Dashboard';
            }
        } else {
            if (guestLinks) guestLinks.classList.remove('hidden');
            if (userLinks) userLinks.classList.add('hidden');
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
