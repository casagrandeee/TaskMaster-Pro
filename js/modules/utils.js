export class EventBus {
    static events = new Map();

    static on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    static off(event, callback) {
        if (!this.events.has(event)) return;

        if (callback) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        } else {
            this.events.delete(event);
        }
    }

    static emit(event, data) {
        if (!this.events.has(event)) return;

        this.events.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
}

export function debounce(func, wait, immediate = false) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };

        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) func.apply(this, args);
    };
}

export function throttle(func, limit) {
    let inThrottle;

    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export class DOMUtils {
    static $(selector, context = document) {
        return context.querySelector(selector);
    }

    static $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    static createElement(tag, {
        className,
        id,
        textContent,
        innerHTML,
        attributes = {},
        events = {}
    } = {}) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (id) element.id = id;
        if (textContent) element.textContent = textContent;
        if (innerHTML) element.innerHTML = innerHTML;

        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });

        Object.entries(events).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });

        return element;
    }

    static fadeIn(element, duration = 300) {
        return new Promise((resolve) => {
            element.style.opacity = '0';
            element.style.display = 'block';

            let start = null;

            const animate = (timestamp) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;

                element.style.opacity = Math.min(progress / duration, 1);

                if (progress < duration) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    static fadeOut(element, duration = 300) {
        return new Promise((resolve) => {
            let start = null;
            const initialOpacity = parseFloat(getComputedStyle(element).opacity);

            const animate = (timestamp) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;

                element.style.opacity = initialOpacity * (1 - progress / duration);

                if (progress < duration) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }
}

export class DateUtils {
    static formatDate(date, locale = 'en-US') {
        return new Intl.DateTimeFormat(locale).format(new Date(date));
    }

    static formatTime(date, locale = 'en-US') {
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    static getRelativeTime(date, locale = 'en-US') {
        const now = new Date();
        const target = new Date(date);
        const diffInHours = (now - target) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'Right now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) > 1 ? 's' : ''} ago`;
        } else if (diffInHours < 168) {
            const days = Math.floor(diffInHours / 24);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return this.formatDate(target, locale);
        }
    }

    static isOverdue(dueDate) {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    }

    static getDaysUntilDue(dueDate) {
        if (!dueDate) return null;
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}

export class ValidationUtils {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateRequired(value, fieldName = 'Field') {
        if (!value || value.trim() === '') {
            throw new Error(`${fieldName} is required.`);
        }
        return true;
    }

    static validateLength(value, min = 0, max = Infinity, fieldName = 'Field') {
        if (value.length < min) {
            throw new Error(`${fieldName} must be at least ${min} characters`);
        }
        if (value.length > max) {
            throw new Error(`${fieldName} must be at most ${max} characters`);
        }
        return true;
    }

    static validateDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
}

export class StorageUtils {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error setting item in localStorage: ${error}`);
        }
    }

    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error getting item from localStorage: ${error}`);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing item from localStorage: ${error}`);
        }
    }

    static clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error(`Error clearing localStorage: ${error}`);
        }
    }
}

export const exportFile = (content, fileName, type = 'application/json') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export class ThemeManager {
    static currentTheme = 'light';

    static init() {
        const savedTheme = StorageUtils.get('theme', 'light');
        this.setTheme(savedTheme);
    }

    static setTheme(theme) {
        this.currentTheme = theme;
        document.body.className = `theme-${theme}`;
        StorageUtils.set('theme', theme);
        EventBus.emit('theme:changed', { theme });
    }

    static toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    static isDark() {
        return this.currentTheme === 'dark';
    }
}

export class PerformanceUtils {
    static measure(name, fn) {
        return async (...args) => {
            const start = performance.now();
            const result = await fn(...args);
            const end = performance.now();
            console.log(`${name} took ${end - start}.toFixed(2)} ms`);
            return result;
        };
    }

    static memoize(fn) {
        const cache = new Map();

        return function memoizedFunction(...args) {
            const key = JSON.stringify(args);

            if (cache.has(key)) {
                return cache.get(key);
            }

            const result = fn.apply(this, args);
            cache.set(key, result);
            return result;
        };
    }
}