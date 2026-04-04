/**
 * theme.js - Dark Mode Manager for CeylonLands.lk
 */

const themeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        // Initialize all lamp toggles on the page
        const toggles = document.querySelectorAll('.lamp-toggle-container');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => this.toggleTheme());
        });
    },

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // Play a subtle sound or add a visual feedback if desired
        console.log('Theme toggled:', isDark ? 'Dark' : 'Light');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => themeManager.init());

// Export for manual use
window.themeManager = themeManager;
