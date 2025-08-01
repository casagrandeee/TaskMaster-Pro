import { StorageManager } from './storage'
import { NotificationManager } from './notifications'
import { EventBus } from './utils'

export class TaskManager {
    constructor(userId) {
        this.userId = userId;
        this.tasks = StorageManager.getUserTasks(userId);
        this.filters = {
            category: '',
            status: 'all',
            priority: 'all',
            search: ''
        };

        this.setupEventListeners();
    }

    async createTask(taskData) {
        try {
            const task = {
                id: this.generateId(),
                ...taskData,
                userId: this.userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                completedAt: null
            };

            this.tasks.push(task);
            await this.saveTasks();

            EventBus.emit('taskCreated', { task });
            NotificationManager.show('Task created successfully', 'success');
            return task;
        } catch (error) {
            NotificationManager.show('Error creating task', 'error');
            throw error;
        }
    }

    async updateTask(taskId, updates) {
        try {
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) {
                throw new Error('Task not found');
            }

            const oldTask = { ...this.tasks[taskIndex] };

            this.tasks[taskIndex] = {
                ...this.tasks[taskIndex],
                ...updates,
                updatedAt: new Date().toISOString(),
                ...(updates.status === 'completed' && { completedAt: new Date().toISOString() })
            };

            await this.saveTasks();

            EventBus.emit('taskUpdated', {
                task: this.tasks[taskIndex],
                oldTask
            });

            NotificationManager.show('Task updated successfully', 'success');
            return this.tasks[taskIndex];
        } catch (error) {
            NotificationManager.show('Error updating task', 'error');
            throw error;
        }
    }

    async deleteTask(taskId) {
        try {
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);

            if (taskIndex === -1) {
                throw new Error('Task not found');
            }

            const deletedTask = this.tasks.splice(taskIndex, 1)[0];
            await this.saveTasks();

            EventBus.emit('task:deleted', { task: deletedTask });
            NotificationManager.show('Task deleted successfully', 'info');
            return deletedTask;
        } catch (error) {
            NotificationManager.show('Error deleting task', 'error');
            throw error;
        }
    }

    getFilteredTasks() {
        return this.tasks.filter(task => {
            const { category, status, priority, search } = this.filters;
            const matchesCategory = !category || task.category === category;
            const matchesStatus = status === 'all' || task.status === status;
            const matchesPriority = priority === 'all' || task.priority === priority;
            const matchesSearch = !search || task.title.toLowerCase().includes(search.toLowerCase());

            return matchesCategory && matchesStatus && matchesPriority && matchesSearch;
        });
    }

    sortTasks(tasks, sortBy = 'createdAt', order = 'desc') {
        return [...tasks].sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'dueDate':
                    const dateA = new Date(a.dueDate || '9999-12-31');
                    const dateB = new Date(b.dueDate || '9999-12-31');
                    comparison = dateA - dateB;
                    break;
                case 'priority':
                    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                    comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
                    break;
                default:
                    comparison = new Date(a[sortBy]) - new Date(b[sortBy]);
            }

            return order === 'desc' ? -comparison : comparison;
        });
    }

    getTaskAnalytics() {
        const analytics = this.tasks.reduce((acc, task) => {
            acc.statusCount[task.status] = (acc.statusCount[task.status] || 0) + 1;

            acc.categoryCount[task.category] = (acc.categoryCount[task.category] || 0) + 1;

            acc.priorityCount[task.priority] = (acc.priorityCount[task.priority] || 0) + 1;

            const taskDate = new Date(task.createdAt);
            const weekKey = this.getWeekKey(taskDate);
            acc.weeklyTasks[weekKey] = (acc.weeklyTasks[weekKey] || 0) + 1;

            if (task.status === 'completed') {
                acc.weeklyCompleted[weekKey] = (acc.weeklyCompleted[weekKey] || 0) + 1;
            }

            return acc;
        }, {
            statusCount: {},
            categoryCount: {},
            priorityCount: {},
            weeklyTasks: {},
            weeklyCompleted: {}
        });

        const totalTasks = this.tasks.length;
        const completedTasks = analytics.statusCount['completed'] || 0;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            ...analytics,
            totalTasks,
            completedTasks,
            completionRate,
            pendingTasks: totalTasks - completedTasks
        };
    }

    getWeekKey(date) {
        const startOfWeek = new Date(date);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toISOString().split('T')[0];
    }

    exportTasks(format = 'json') {
        const exportData = {
            user: this.userId,
            exportedDate: new Date().toISOString(),
            tasks: this.tasks,
            analytics: this.getTaskAnalytics()
        };

        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(this.tasks);
        }
    }

    convertToCSV(tasks) {
        const headers = ['ID', 'Title', 'Description', 'Category', 'Priority', 'Status', 'Created At', 'Due Date'];
        const csvContent = [
            headers.join(','),
            ...tasks.map(task => [
                task.id,
                `"${task.title}"`,
                `"${task.description || ''}"`,
                task.category,
                task.priority,
                task.status,
                task.createdAt,
                task.dueDate || ''
            ].join(','))
        ].join('\n');

        return csvContent;
    }

    async saveTasks() {
        try {
            StorageManager.saveUserTasks(this.userId, this.tasks);
        } catch (error) {
            console.error('Error saving tasks:', error);
            throw error;
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    setupEventListeners() {
    }

    destroy() {
        EventBus.off('taskCreated');
        EventBus.off('taskUpdated');
        EventBus.off('task:deleted');
    }
}

export default TaskManager;