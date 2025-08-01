import { StorageManager } from './storage.js';
import { NotificationManager } from './notifications.js';

export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = StorageManager.getUsers();
        this.sessionKey = 'taskmaster_session';
    }

    async login(username, password) {
        try {
            await this.delay(800);

            const user = this.users.find(u => u.username === username && u.password === password);

            if (!user) {
                throw new Error('Invalid username or password');
            }

            this.currentUser = {...user};
            delete this.currentUser.password;

            localStorage.setItem(this.sessionKey, JSON.stringify({
                user: this.currentUser,
                timestamp: Date.now()
            }));

            NotificationManager.show('Login successful', 'success');
            return this.currentUser;

        } catch (error) {
            NotificationManager.show(error.message, 'error');
            throw error;
        }
    }

    register = async ({ username, email, password }) => {
        try {
            await this.delay(600);

            const existingUser = this.users.find(u => u.username === username || u.email === email);

            if (existingUser) {
                throw new Error('Username or email already exists');
            }

            const newUser = {
                id: this.generateId(),
                username,
                email,
                password,
                createdAt: new Date().toISOString(),
                profile: {
                    theme: 'light',
                    notifications: true
                }
            };

            this.users.push(newUser);
            StorageManager.saveUsers(this.users);

            NotificationManager.show('Register successful', 'success');
            return newUser;
        } catch (error) {
            NotificationManager.show(error.message, 'error');
            throw error;
        }
    }

    logout() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.currentUser = null;
                localStorage.removeItem(this.sessionKey);
                NotificationManager.show('Logout successful', 'success');
                resolve();
            }, 300);
        });
    }

    checkSession() {
        try {
            const session = localStorage.getItem(this.sessionKey);
            if (!session) return null;

            const { user, timestamp } = JSON.parse(session);

            const sessionAge = Date.now() - timestamp;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

            if (sessionAge > maxAge) {
                localStorage.removeItem(this.sessionKey);
                return null;
            }

            this.currentUser = user;
            return user;
        } catch (error) {
            console.error('Session check failed:', error);
            localStorage.removeItem(this.sessionKey);
            return null;
        }
    }

    #hashPassword(password) {
        return btoa(password + 'salt_key');
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    get userInfo() {
        return this.currentUser ? { ...this.currentUser } : null;
    }
}

export default AuthManager;
