import AuthManager from './modules/auth.js';
import TaskManager from './modules/taskManager.js';
import { NotificationManager } from './modules/notifications.js';
import { EventBus, DOMUtils, debounce, ThemeManager } from './modules/utils.js';
import { StorageManager } from './modules/storage.js';
import { DashboardManager } from './modules/dashboard.js';

class TaskMasterApp {
    constructor() {
        this.authManager = new AuthManager();
        this.taskManager = null;
        this.dashboardManager = null;
        this.currentView = 'tasks';

        this.init();
    }

    async init() {
        try {
            NotificationManager.init();
            ThemeManager.init();

            this.setupGlobalEventListeners();

            const user = this.authManager.checkSession();
            if (user) {
                await this.showMainApp(user);
            } else {
                this.showLoginScreen();
            }

        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            NotificationManager.error('Erro ao carregar aplicação');
        }
    }

    showLoginScreen() {
        this.toggleScreens('login-screen');
        this.setupAuthEventListeners();
    }

    async showMainApp(user) {
        try {
            this.taskManager = new TaskManager(user.id);
            this.dashboardManager = new DashboardManager(this.taskManager);

            this.setupMainAppEventListeners();

            this.updateUserInterface(user);

            await this.loadInitialData();

            this.toggleScreens('app-screen');

        } catch (error) {
            console.error('Erro ao carregar aplicação principal:', error);
            NotificationManager.error('Erro ao carregar dados do usuário');
        }
    }

    toggleScreens(activeScreen) {
        const screens = DOMUtils.$$('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
        });

        const active = DOMUtils.$(`#${activeScreen}`);
        if (active) {
            active.classList.add('active');
        }
    }

    setupAuthEventListeners() {
        const loginForm = DOMUtils.$('#login-form');
        const showRegisterBtn = DOMUtils.$('#show-register');

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const username = formData.get('username') || DOMUtils.$('#username').value;
            const password = formData.get('password') || DOMUtils.$('#password').value;

            try {
                const user = await this.authManager.login(username, password);
                await this.showMainApp(user);
            } catch (error) {
            }
        });

        showRegisterBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });
    }

    setupMainAppEventListeners() {
        const navLinks = DOMUtils.$$('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        const addTaskBtn = DOMUtils.$('#add-task-btn');
        addTaskBtn?.addEventListener('click', () => {
            this.showTaskModal();
        });

        const searchInput = DOMUtils.$('#search-tasks');
        if (searchInput) {
            const debouncedSearch = debounce((e) => {
                this.taskManager.updateFilters({ search: e.target.value });
            }, 300);

            searchInput.addEventListener('input', debouncedSearch);
        }

        const filterSelects = DOMUtils.$$('.filters-container select');
        filterSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const filterType = e.target.id.replace('filter-', '');
                this.taskManager.updateFilters({
                    [filterType]: e.target.value
                });
            });
        });

        const themeToggle = DOMUtils.$('#theme-toggle');
        themeToggle?.addEventListener('click', () => {
            ThemeManager.toggleTheme();
            this.updateThemeIcon();
        });

        const userMenuBtn = DOMUtils.$('#user-menu-btn');
        const userDropdown = DOMUtils.$('#user-dropdown');

        userMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown?.classList.toggle('show');
        });

        const exportBtn = DOMUtils.$('#export-data');
        exportBtn?.addEventListener('click', () => {
            this.exportUserData();
        });

        const logoutBtn = DOMUtils.$('#logout');
        logoutBtn?.addEventListener('click', async () => {
            await this.logout();
        });

        this.setupTaskEventListeners();

        this.setupModalEventListeners();
    }

    setupTaskEventListeners() {
        EventBus.on('task:created', ({ task }) => {
            this.renderTasks();
            this.dashboardManager?.updateCharts();
        });

        EventBus.on('task:updated', ({ task }) => {
            this.renderTasks();
            this.dashboardManager?.updateCharts();
        });

        EventBus.on('task:deleted', ({ task }) => {
            this.renderTasks();
            this.dashboardManager?.updateCharts();
        });

        EventBus.on('tasks:filtered', ({ tasks }) => {
            this.renderFilteredTasks(tasks);
        });

        const tasksGrid = DOMUtils.$('#tasks-grid');
        tasksGrid?.addEventListener('click', (e) => {
            this.handleTaskCardClick(e);
        });
    }

    handleTaskCardClick(e) {
        const taskCard = e.target.closest('.task-card');
        if (!taskCard) return;

        const taskId = taskCard.dataset.taskId;
        const action = e.target.dataset.action;

        switch (action) {
            case 'edit':
                this.editTask(taskId);
                break;
            case 'delete':
                this.deleteTask(taskId);
                break;
            case 'toggle-status':
                this.toggleTaskStatus(taskId);
                break;
            case 'toggle-favorite':
                this.toggleTaskFavorite(taskId);
                break;
        }
    }

    setupModalEventListeners() {
        const modal = DOMUtils.$('#task-modal');
        const taskForm = DOMUtils.$('#task-form');
        const cancelBtn = DOMUtils.$('#cancel-task');
        const closeBtn = DOMUtils.$('.modal-close');

        taskForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleTaskFormSubmit(e);
        });

        [cancelBtn, closeBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                this.hideTaskModal();
            });
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideTaskModal();
            }
        });
    }

    setupGlobalEventListeners() {
        document.addEventListener('click', () => {
            const dropdowns = DOMUtils.$$('.dropdown-menu.show');
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        EventBus.on('theme:changed', ({ theme }) => {
            this.updateThemeIcon();
        });
    }

    handleKeyboardShortcuts(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showTaskModal();
        }

        if (e.key === 'Escape') {
            this.hideTaskModal();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            DOMUtils.$('#search-tasks')?.focus();
        }
    }

    switchView(viewName) {
        const navLinks = DOMUtils.$$('.nav-link');
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        const views = DOMUtils.$$('.view');
        views.forEach(view => {
            view.classList.remove('active');
        });

        const targetView = DOMUtils.$(`#${viewName}-view`);
        targetView?.classList.add('active');

        this.currentView = viewName;

        this.loadViewData(viewName);
    }

    async loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                await this.dashboardManager?.loadDashboard();
                break;
            case 'tasks':
                this.renderTasks();
                break;
            case 'calendar':
                break;
        }
    }

    async showTaskModal(taskId = null) {
        const modal = DOMUtils.$('#task-modal');
        const modalTitle = DOMUtils.$('#modal-title');
        const form = DOMUtils.$('#task-form');

        if (taskId) {
            modalTitle.textContent = 'Editar Tarefa';
            await this.populateTaskForm(taskId);
        } else {
            modalTitle.textContent = 'Nova Tarefa';
            form?.reset();
        }

        modal?.classList.add('show');
        DOMUtils.$('#task-title')?.focus();
    }

    hideTaskModal() {
        const modal = DOMUtils.$('#task-modal');
        modal?.classList.remove('show');
    }

    async handleTaskFormSubmit(e) {
        try {
            const formData = new FormData(e.target);
            const taskData = {
                title: formData.get('title'),
                description: formData.get('description'),
                category: formData.get('category'),
                priority: formData.get('priority'),
                status: formData.get('status'),
                dueDate: formData.get('dueDate') || null
            };

            const taskId = e.target.dataset.taskId;

            if (taskId) {
                await this.taskManager.updateTask(taskId, taskData);
            } else {
                await this.taskManager.createTask(taskData);
            }

            this.hideTaskModal();

        } catch (error) {
            console.error('Erro ao salvar tarefa:', error);
        }
    }

    renderTasks() {
        const tasksGrid = DOMUtils.$('#tasks-grid');
        if (!tasksGrid || !this.taskManager) return;

        const tasks = this.taskManager.getFilteredTasks();
        const sortedTasks = this.taskManager.sortTasks(tasks);

        if (sortedTasks.length === 0) {
            tasksGrid.innerHTML = this.getEmptyTasksHTML();
            return;
        }

        tasksGrid.innerHTML = sortedTasks
            .map(task => this.createTaskCardHTML(task))
            .join('');
    }

    renderFilteredTasks(tasks) {
        const tasksGrid = DOMUtils.$('#tasks-grid');
        if (!tasksGrid) return;

        if (tasks.length === 0) {
            tasksGrid.innerHTML = this.getEmptyTasksHTML();
            return;
        }

        tasksGrid.innerHTML = tasks
            .map(task => this.createTaskCardHTML(task))
            .join('');
    }

    createTaskCardHTML(task) {
        const { id, title, description, category, priority, status, dueDate, createdAt } = task;

        const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'concluida';
        const dueDateText = dueDate ? this.formatDueDate(dueDate) : '';

        return `
            <div class="task-card ${status} priority-${priority} ${isOverdue ? 'overdue' : ''}" 
                 data-task-id="${id}">
                <div class="task-header">
                    <div class="task-category">${this.getCategoryIcon(category)} ${category}</div>
                    <div class="task-actions">
                        <button class="btn-icon" data-action="toggle-favorite" title="Favoritar">
                            <i class="far fa-star"></i>
                        </button>
                        <button class="btn-icon" data-action="edit" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" data-action="delete" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="task-content">
                    <h3 class="task-title">${title}</h3>
                    ${description ? `<p class="task-description">${description}</p>` : ''}
                </div>
                
                <div class="task-footer">
                    <div class="task-meta">
                        <span class="task-priority priority-${priority}">
                            ${this.getPriorityIcon(priority)} ${priority}
                        </span>
                        ${dueDateText ? `<span class="task-due-date">${dueDateText}</span>` : ''}
                    </div>
                    
                    <div class="task-status-toggle">
                        <button class="btn-status" data-action="toggle-status">
                            ${this.getStatusIcon(status)} ${status}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyTasksHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>Nenhuma tarefa encontrada</h3>
                <p>Comece criando sua primeira tarefa!</p>
                <button class="btn btn-primary" onclick="app.showTaskModal()">
                    <i class="fas fa-plus"></i> Nova Tarefa
                </button>
            </div>
        `;
    }

    getCategoryIcon(category) {
        const icons = {
            trabalho: '<i class="fas fa-briefcase"></i>',
            pessoal: '<i class="fas fa-user"></i>',
            estudos: '<i class="fas fa-graduation-cap"></i>'
        };
        return icons[category] || '<i class="fas fa-folder"></i>';
    }

    getPriorityIcon(priority) {
        const icons = {
            alta: '<i class="fas fa-arrow-up text-red"></i>',
            media: '<i class="fas fa-minus text-yellow"></i>',
            baixa: '<i class="fas fa-arrow-down text-green"></i>'
        };
        return icons[priority] || '';
    }

    getStatusIcon(status) {
        const icons = {
            pendente: '<i class="far fa-circle"></i>',
            'em-andamento': '<i class="fas fa-circle-notch"></i>',
            concluida: '<i class="fas fa-check-circle"></i>'
        };
        return icons[status] || '';
    }

    formatDueDate(dueDate) {
        const now = new Date();
        const due = new Date(dueDate);
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `Atrasada ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''}`;
        } else if (diffDays === 0) {
            return 'Vence hoje';
        } else if (diffDays === 1) {
            return 'Vence amanhã';
        } else {
            return `Vence em ${diffDays} dias`;
        }
    }

    async loadInitialData() {
        try {
            this.renderTasks();
            if (this.currentView === 'dashboard') {
                await this.dashboardManager?.loadDashboard();
            }
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }

    updateUserInterface(user) {
        const currentUserElement = DOMUtils.$('#current-user');
        if (currentUserElement) {
            currentUserElement.textContent = user.username;
        }
    }

    updateThemeIcon() {
        const themeToggle = DOMUtils.$('#theme-toggle i');
        if (themeToggle) {
            if (ThemeManager.isDark) {
                themeToggle.className = 'fas fa-sun';
            } else {
                themeToggle.className = 'fas fa-moon';
            }
        }
    }

    exportUserData() {
        try {
            const data = this.taskManager.exportTasks('json');
            const filename = `taskmaster_backup_${new Date().toISOString().split('T')[0]}.json`;

            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            NotificationManager.success('Dados exportados com sucesso!');
        } catch (error) {
            NotificationManager.error('Erro ao exportar dados');
        }
    }

    async logout() {
        try {
            await this.authManager.logout();

            // Cleanup
            this.taskManager?.destroy();
            this.dashboardManager?.destroy();

            this.taskManager = null;
            this.dashboardManager = null;

            this.showLoginScreen();
        } catch (error) {
            console.error('Erro no logout:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new TaskMasterApp();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}