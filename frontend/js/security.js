/**
 * CeylonTerrece - Frontend Security Module
 * Validates all user inputs before submission.
 * Blocks links/URLs in posts and messages.
 */

(function() {
    'use strict';

    // URL / link detection pattern
    const URL_PATTERN = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\b\S+\.(com|lk|net|org|io|co|info|biz|me)\b)/gi;

    /**
     * Check if text contains a URL or link.
     */
    function containsLink(text) {
        if (!text) return false;
        URL_PATTERN.lastIndex = 0; // reset regex state
        return URL_PATTERN.test(text);
    }

    /**
     * Sanitize text: strip HTML tags.
     */
    function sanitize(text) {
        if (!text) return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.textContent;
    }

    /**
     * Show an inline error message under a field.
     */
    function showFieldError(field, message) {
        let err = field.parentElement.querySelector('.ct-field-error');
        if (!err) {
            err = document.createElement('p');
            err.className = 'ct-field-error';
            err.style.cssText = 'color:#dc2626;font-size:0.78rem;margin-top:4px;font-weight:600;display:flex;align-items:center;gap:4px;';
            field.parentElement.appendChild(err);
        }
        err.innerHTML = `<span>⚠</span> ${message}`;
        field.style.borderColor = '#dc2626';
        field.focus();
    }

    /**
     * Clear field error.
     */
    function clearFieldError(field) {
        const err = field.parentElement.querySelector('.ct-field-error');
        if (err) err.remove();
        field.style.borderColor = '';
    }

    /**
     * Validate a single text input or textarea in real-time.
     * Pass options: { isLinkField: false } to skip link check (e.g. web URL input).
     */
    function attachLiveValidation(field, options = {}) {
        field.addEventListener('input', function() {
            clearFieldError(this);
            const val = this.value;

            if (!options.allowLinks && containsLink(val)) {
                showFieldError(this, 'Links and website addresses are not allowed here.');
                return;
            }

            // Max length enforcement
            if (options.maxLength && val.length > options.maxLength) {
                showFieldError(this, `Maximum ${options.maxLength} characters allowed.`);
            }
        });
    }

    /**
     * Validate all text inputs in a form before submission.
     * Returns false (and shows errors) if any violation is found.
     */
    function validateFormBeforeSubmit(form, options = {}) {
        let valid = true;
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], textarea');

        inputs.forEach(field => {
            clearFieldError(field);
            const val = field.value.trim();

            // Skip email fields from link check
            if (field.type === 'email') return;

            // Block links
            if (!options.allowLinksInFields && containsLink(val)) {
                showFieldError(field, 'Links and website addresses are not allowed. Please remove them.');
                valid = false;
            }
        });

        return valid;
    }

    /**
     * Auto-protect: attach live validation to all forms with class "ct-secure-form".
     * Add data-no-links to disable only link checking on specific fields.
     */
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.ct-secure-form').forEach(form => {
            form.querySelectorAll('input[type="text"], textarea').forEach(field => {
                attachLiveValidation(field);
            });

            form.addEventListener('submit', function(e) {
                if (!validateFormBeforeSubmit(this)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            });
        });

        // Add character counter to all textareas with data-maxlength
        document.querySelectorAll('textarea[data-maxlength]').forEach(ta => {
            const max = parseInt(ta.dataset.maxlength);
            const counter = document.createElement('p');
            counter.style.cssText = 'font-size:0.75rem;color:#9ca3af;text-align:right;margin-top:2px;';
            counter.textContent = `0 / ${max}`;
            ta.parentElement.appendChild(counter);
            ta.addEventListener('input', () => {
                const len = ta.value.length;
                counter.textContent = `${len} / ${max}`;
                counter.style.color = len > max ? '#dc2626' : '#9ca3af';
            });
        });
    });

    // Expose globally for manual use
    window.ctSecurity = {
        containsLink,
        sanitize,
        validateFormBeforeSubmit,
        attachLiveValidation,
        showFieldError,
        clearFieldError
    };

})();
