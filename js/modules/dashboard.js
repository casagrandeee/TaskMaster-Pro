export class DashboardManager {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.charts = {};
    }

    async loadDashboard() {
        this.updateStatsCards();
        this.renderCharts();
    }

    updateStatsCards() {
        const stats = this.taskManager.getTaskAnalytics();

        document.getElementById('total-tasks').textContent = stats.totalTasks;
        document.getElementById('completed-tasks').textContent = stats.completedTasks;
        document.getElementById('pending-tasks').textContent = stats.pendingTasks;
        document.getElementById('completion-rate').textContent = stats.completionRate + '%';
    }

    renderCharts() {
        const analytics = this.taskManager.getTaskAnalytics();

        this.initOrUpdateChart('status-chart', {
            type: 'doughnut',
            data: {
                labels: Object.keys(analytics.statusCount),
                datasets: [{
                    data: Object.values(analytics.statusCount),
                    backgroundColor: ['#3b82f6', '#f59e0b', '#10b981']
                }]
            }
        });

        this.initOrUpdateChart('category-chart', {
            type: 'bar',
            data: {
                labels: Object.keys(analytics.categoryCount),
                datasets: [{
                    label: 'Tasks',
                    data: Object.values(analytics.categoryCount),
                    backgroundColor: ['#8b5cf6', '#f59e0b', '#10b981']
                }]
            }
        });

        const weeklyLabels = Object.keys(analytics.weeklyTasks).sort();
        this.initOrUpdateChart('productivity-chart', {
            type: 'line',
            data: {
                labels: weeklyLabels,
                datasets: [
                    {
                    label: 'Created',
                    data: weeklyLabels.map(w => analytics.weeklyTasks[w] || 0),
                    borderColor: '#3b82f6',
                    backgroundColor: '#3b82f688',
                    fill: false
                },
                {
                    label: 'Completed',
                    data: weeklyLabels.map(w => analytics.weeklyCompleted[w] || 0),
                    borderColor: '#10b981',
                    backgroundColor: '#10b98188',
                    fill: false
                }
                ]
            }
        });
    }

    initOrUpdateChart(canvasId, config) {
        if (this.charts[canvasId]) {
            this.charts[canvasId].data = config.data;
            this.charts[canvasId].update();
        } else {
            const ctx = document.getElementById(canvasId).getContext('2d');
            this.charts[canvasId] = new Chart(ctx, config);
        }
    }

    updateChart() {
        this.loadDashboard();
    }

    destroy() {
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};
    }
}