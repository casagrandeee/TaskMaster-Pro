import { DOMUtils } from "./utils";

export class NotificationsManager {
    static container = null;
    static notifications = new Map();
    static autoHideTimeout = 5000;

    static init() {
        this.container = DOMUtils.$("#notifications-container");
        if (!this.container) {
            this.container = DOMUtils.createElement('div', {
                id: 'notifications-container'
            });
            document.body.appendChild(this.container);
        }
    }

    static show (message, type = 'info', {
        autoHide = true,
        duration = this.autoHideTimeout,
        actions = []
    } = {}) {
        if (!this.container) this.init();

        const id = this.generateId();
        const notification = this.createNotification(id, message, type, actions);

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        if (autoHide) {
            setTimeout(() => this.hide(id), duration);
        }

        return id;
    }

    static success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    static error(message, options = {}) {
        return this.show(message, 'error', {...options, autoHide: false});
    }

    static warning (message, options = {}) {
        return this.show(message, 'warning', options);
    }

    static info (message, options = {}) {
        return this.show(message, 'info', options);
    }

    static createNotification(id, message, type, actions) {
        const notification = DOMUtils.createElement('div', {
            class: `notification notification-${type}`,
            attributes: { 'data-id': id }
        });

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="${icons[type]}"></i>
                <span class="notification-message">${message}</span>
            </div>
            <div class="notification-actions">
                ${actions.map(action => `
                    <button class="notification-btn" data-action="${action.action}">
                        ${action.label}
                    </button>
                `).join('')}
                <button class="notification-close" data-action="close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        notification.addEventListener('click', (e) => {
            const action = e.target.dataset.action;

            if (action === 'close') {
                this.hide(id);
            } else if (action) {
                const actionHandler = actions.find(a => a.action === action);
                if (actionHandler && actionHandler.handler) {
                    actionHandler.handler();
                    this.hide(id);
                }
            }
        });

        return notification;
    }

    static async hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.classList.add('hide');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300);
    }

    static clearAll() {
        this.notifications.forEach((notification, id) => {
            this.hide(id);
        });
    }

    static showProgress(message, promise) {
        const id = this.generateId();
        const notification = DOMUtils.createElement('div', {
            className: 'notification notification-progress',
            attributes: { 'data-id': id }
        });

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span class="notification-message">${message}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        `;

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        promise
            .then(() => {
                this.hide(id);
                this.error(`Error: ${error.message}`);
            });

        return id;
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static getActiveCount() {
        return this.notifications.size;
    }

    static hasActiveNotifications() {
        return this.notifications.size > 0;
    }
}

export default NotificationManager;