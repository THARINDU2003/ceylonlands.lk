/**
 * theme.js - Dark Mode Manager for CeylonTerrace.com
 *
 * Applies .dark-theme to <body> (and removes it for light mode).
 * Flash prevention is handled by an inline <script> in each page's <head>
 * that calls: if(localStorage.getItem('theme')==='dark') document.documentElement.classList.add('dark-theme');
 */

const themeManager = {
    init() {
        // Apply saved theme to body (html element handled by inline head script)
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        // Wire up all dark mode toggles on the page
        const toggles = document.querySelectorAll('.dark-mode-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => this.toggleTheme());
        });

        // Reflect current state visually on the toggle icon
        this._updateToggleState();
    },

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this._updateToggleState();
    },

    _updateToggleState() {
        const isDark = document.body.classList.contains('dark-theme');
        // Update toggle icon and title
        document.querySelectorAll('.dark-mode-toggle').forEach(el => {
            el.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
            const icon = el.querySelector('i');
            if (icon) {
                icon.className = isDark ? 'fas fa-sun text-yellow-400' : 'fas fa-moon';
            }
        });
    }
};

// Apply to body as soon as DOM is ready
document.addEventListener('DOMContentLoaded', () => themeManager.init());

// Export for manual use
window.themeManager = themeManager;
