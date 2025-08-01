export class StorageManager {
    static USERS_KEY = 'taskmaster_users';
    static TASKS_KEY_PREFIX = 'taskmaster_tasks_user_';

    static getUsers() {
        return JSON.parse(localStorage.getItem(this.USERS_KEY) || []);
    }

    static saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }

    static getUserTasks(userId) {
        return
            JSON.parse(localStorage.getItem(this.TASKS_KEY_PREFIX + userId) || '[]');
    }

    static saveUserTasks(userId, tasks) {
        localStorage.setItem(this.TASKS_KEY_PREFIX + userId, JSON.stringify(tasks));
    }
}