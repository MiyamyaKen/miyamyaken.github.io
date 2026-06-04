// ==================== 数据存储 ====================
class ExpenseTracker {
    constructor() {
        this.transactions = this.loadTransactions();
        this.recurringExpenses = this.loadRecurringExpenses();
        this.editingId = null; // 当前正在编辑的记录ID
        this.init();
    }

    // 从本地存储加载数据
    loadTransactions() {
        const data = localStorage.getItem('transactions');
        return data ? JSON.parse(data) : [];
    }

    // 保存数据到本地存储
    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    // 加载固定支出
    loadRecurringExpenses() {
        const data = localStorage.getItem('recurringExpenses');
        return data ? JSON.parse(data) : [];
    }

    // 保存固定支出
    saveRecurringExpenses() {
        localStorage.setItem('recurringExpenses', JSON.stringify(this.recurringExpenses));
    }

    // 添加固定支出
    addRecurringExpense(expense) {
        expense.id = Date.now().toString();
        this.recurringExpenses.push(expense);
        this.saveRecurringExpenses();
        this.renderRecurringExpenses();
        this.showNotification('固定支出添加成功！', 'success');
    }

    // 删除固定支出
    deleteRecurringExpense(id) {
        if (confirm('确定要删除这个固定支出吗？')) {
            this.recurringExpenses = this.recurringExpenses.filter(e => e.id !== id);
            this.saveRecurringExpenses();
            this.renderRecurringExpenses();
            this.showNotification('固定支出已删除', 'info');
        }
    }

    // 计算固定支出总额
    calculateRecurringTotal() {
        return this.recurringExpenses.reduce((sum, expense) => {
            return sum + parseFloat(expense.amount);
        }, 0);
    }

    // 添加交易记录
    addTransaction(transaction) {
        transaction.id = Date.now().toString();
        this.transactions.unshift(transaction);
        this.saveTransactions();
        this.render();
        this.showNotification('记录添加成功！', 'success');
    }

    // 更新交易记录
    updateTransaction(id, updatedTransaction) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            this.transactions[index] = { ...updatedTransaction, id };
            this.saveTransactions();
            this.render();
            this.showNotification('记录更新成功！', 'success');
        }
    }

    // 开始编辑记录
    startEdit(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) return;

        this.editingId = id;
        
        // 填充表单
        document.getElementById('description').value = transaction.description;
        document.getElementById('amount').value = transaction.amount;
        document.getElementById('type').value = transaction.type;
        document.getElementById('category').value = transaction.category;
        document.getElementById('date').value = transaction.date;

        // 更改按钮文本和样式
        const submitBtn = document.querySelector('#transactionForm button[type="submit"]');
        submitBtn.innerHTML = '<span>✏️ 更新记录</span>';
        submitBtn.style.background = 'linear-gradient(135deg, #f093fb, #f5576c)';

        // 添加取消按钮
        if (!document.getElementById('cancelEditBtn')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.id = 'cancelEditBtn';
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.innerHTML = '<span>❌ 取消编辑</span>';
            cancelBtn.style.marginTop = '0.5rem';
            cancelBtn.onclick = () => this.cancelEdit();
            submitBtn.parentElement.appendChild(cancelBtn);
        }

        // 滚动到表单
        document.getElementById('transactionForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        this.showNotification('编辑模式已启动', 'info');
    }

    // 取消编辑
    cancelEdit() {
        this.editingId = null;
        
        // 重置表单
        document.getElementById('transactionForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

        // 恢复按钮
        const submitBtn = document.querySelector('#transactionForm button[type="submit"]');
        submitBtn.innerHTML = '<span>➕ 添加记录</span>';
        submitBtn.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))';

        // 移除取消按钮
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.remove();
        }

        this.showNotification('已取消编辑', 'info');
    }

    // 删除交易记录
    deleteTransaction(id) {
        if (confirm('确定要删除这条记录吗？')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveTransactions();
            this.render();
            this.showNotification('记录已删除', 'info');
        }
    }

    // 清空所有记录
    clearAll() {
        if (this.transactions.length === 0) {
            this.showNotification('没有记录可清空', 'info');
            return;
        }

        if (confirm('确定要清空所有记录吗？此操作不可恢复！')) {
            this.transactions = [];
            this.saveTransactions();
            this.render();
            this.showNotification('所有记录已清空', 'success');
        }
    }

    // 获取筛选后的交易记录
    getFilteredTransactions() {
        const typeFilter = document.getElementById('filterType').value;
        const categoryFilter = document.getElementById('filterCategory').value;
        const monthFilter = document.getElementById('filterMonth').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        return this.transactions.filter(transaction => {
            const matchType = typeFilter === 'all' || transaction.type === typeFilter;
            const matchCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
            const matchSearch = transaction.description.toLowerCase().includes(searchTerm);
            
            // 月份筛选
            let matchMonth = true;
            if (monthFilter !== 'all') {
                const transactionMonth = transaction.date.substring(0, 7); // YYYY-MM
                matchMonth = transactionMonth === monthFilter;
            }
            
            return matchType && matchCategory && matchSearch && matchMonth;
        });
    }

    // 获取所有存在的月份
    getAvailableMonths() {
        const months = new Set();
        this.transactions.forEach(transaction => {
            const month = transaction.date.substring(0, 7); // YYYY-MM
            months.add(month);
        });
        return Array.from(months).sort().reverse(); // 最新的月份在前
    }

    // 更新月份选择器
    updateMonthFilter() {
        const monthFilter = document.getElementById('filterMonth');
        const availableMonths = this.getAvailableMonths();
        
        const currentValue = monthFilter.value;
        
        monthFilter.innerHTML = '<option value="all">全部月份</option>';
        
        availableMonths.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            const [year, monthNum] = month.split('-');
            option.textContent = `${year}年${monthNum}月`;
            monthFilter.appendChild(option);
        });
        
        // 恢复之前的选择
        if (availableMonths.includes(currentValue)) {
            monthFilter.value = currentValue;
        }
    }

    // 按月份分组交易记录
    groupTransactionsByMonth(transactions) {
        const groups = {};
        
        transactions.forEach(transaction => {
            const month = transaction.date.substring(0, 7); // YYYY-MM
            if (!groups[month]) {
                groups[month] = [];
            }
            groups[month].push(transaction);
        });
        
        return groups;
    }

    // 计算统计数据（基于筛选后的交易 + 固定支出）
    calculateStats() {
        const filteredTransactions = this.getFilteredTransactions();
        
        const income = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const transactionExpense = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // 添加固定支出到总支出
        const recurringExpense = this.calculateRecurringTotal();
        const expense = transactionExpense + recurringExpense;

        const balance = income - expense;

        return { income, expense, balance, transactionExpense, recurringExpense };
    }

    // 计算分类统计（基于筛选后的交易）
    calculateCategoryStats() {
        const filteredTransactions = this.getFilteredTransactions();
        const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
        const categoryTotals = {};

        expenseTransactions.forEach(transaction => {
            const category = transaction.category;
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += parseFloat(transaction.amount);
        });

        // 转换为数组并排序
        return Object.entries(categoryTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
    }

    // 渲染统计卡片
    renderStats() {
        const { income, expense, balance } = this.calculateStats();

        // 直接显示精确值，避免动画导致的精度问题
        document.getElementById('totalIncome').textContent = `¥${income.toFixed(2)}`;
        document.getElementById('totalExpense').textContent = `¥${expense.toFixed(2)}`;
        document.getElementById('balance').textContent = `¥${balance.toFixed(2)}`;
    }

    // 渲染交易列表
    renderTransactions() {
        const transactionsList = document.getElementById('transactionsList');
        const filteredTransactions = this.getFilteredTransactions();

        if (filteredTransactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>暂无记录</p>
                    <p class="empty-hint">添加您的第一笔收支记录吧！</p>
                </div>
            `;
            return;
        }

        const categoryEmojis = {
            food: '🍔',
            transport: '🚗',
            shopping: '🛍️',
            entertainment: '🎮',
            health: '💊',
            education: '📚',
            housing: '🏠',
            travel: '✈️',
            creditcard: '💳',
            salary: '💼',
            investment: '📊',
            other: '📦'
        };

        const categoryNames = {
            food: '餐饮',
            transport: '交通',
            shopping: '购物',
            entertainment: '娱乐',
            health: '医疗',
            education: '教育',
            housing: '住房',
            travel: '旅游',
            creditcard: '信用卡还款',
            salary: '工资',
            investment: '投资',
            other: '其他'
        };

        // 按月份分组
        const groupedTransactions = this.groupTransactionsByMonth(filteredTransactions);
        const months = Object.keys(groupedTransactions).sort().reverse();

        let html = '';
        
        months.forEach(month => {
            const [year, monthNum] = month.split('-');
            const monthTransactions = groupedTransactions[month];
            
            // 计算该月的收入和支出
            const monthIncome = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            const monthExpense = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            html += `
                <div class="month-group">
                    <div class="month-header">
                        <h3>📅 ${year}年${monthNum}月</h3>
                        <div class="month-summary">
                            <span class="month-income">收入: ¥${monthIncome.toFixed(2)}</span>
                            <span class="month-expense">支出: ¥${monthExpense.toFixed(2)}</span>
                            <span class="month-balance">结余: ¥${(monthIncome - monthExpense).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="month-transactions">
            `;
            
            monthTransactions.forEach(transaction => {
                html += `
                    <div class="transaction-item ${transaction.type}">
                        <div class="transaction-info">
                            <div class="transaction-category">
                                ${categoryEmojis[transaction.category]}
                            </div>
                            <div class="transaction-details">
                                <div class="transaction-description">${transaction.description}</div>
                                <div class="transaction-meta">
                                    <span>${categoryNames[transaction.category]}</span>
                                    <span>•</span>
                                    <span>${transaction.date}</span>
                                </div>
                            </div>
                        </div>
                        <div class="transaction-amount ${transaction.type}">
                            ${transaction.type === 'income' ? '+' : '-'}¥${parseFloat(transaction.amount).toFixed(2)}
                        </div>
                        <div class="transaction-actions">
                            <button class="btn-edit" onclick="tracker.startEdit('${transaction.id}')" title="编辑">
                                ✏️
                            </button>
                            <button class="btn-delete" onclick="tracker.deleteTransaction('${transaction.id}')" title="删除">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        transactionsList.innerHTML = html;
    }

    // 渲染固定支出列表
    renderRecurringExpenses() {
        const recurringList = document.getElementById('recurringList');

        if (this.recurringExpenses.length === 0) {
            recurringList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <p>暂无固定支出</p>
                    <p class="empty-hint">添加房租、水电等每月固定支出</p>
                </div>
            `;
            return;
        }

        const categoryEmojis = {
            food: '🍔',
            transport: '🚗',
            shopping: '🛍️',
            entertainment: '🎮',
            health: '💊',
            education: '📚',
            housing: '🏠',
            travel: '✈️',
            creditcard: '💳',
            other: '📦'
        };

        const categoryNames = {
            food: '餐饮',
            transport: '交通',
            shopping: '购物',
            entertainment: '娱乐',
            health: '医疗',
            education: '教育',
            housing: '住房',
            travel: '旅游',
            creditcard: '信用卡还款',
            other: '其他'
        };

        recurringList.innerHTML = this.recurringExpenses.map(expense => `
            <div class="recurring-item">
                <div class="recurring-info">
                    <div class="recurring-icon">
                        ${categoryEmojis[expense.category]}
                    </div>
                    <div class="recurring-details">
                        <div class="recurring-description">${expense.description}</div>
                        <div class="recurring-meta">
                            <span>${categoryNames[expense.category]}</span>
                            <span>•</span>
                            <span>每月${expense.day}号</span>
                            ${expense.autoAdd ? '<span>•</span><span>自动添加</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="recurring-amount">
                    ¥${parseFloat(expense.amount).toFixed(2)}
                </div>
                <div class="recurring-actions">
                    <button class="btn-delete" onclick="tracker.deleteRecurringExpense('${expense.id}')" title="删除">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        // 更新固定支出总额
        const total = this.calculateRecurringTotal();
        document.getElementById('recurringTotal').textContent = `¥${total.toFixed(2)}`;
    }

    // 渲染分类图表
    renderCategoryChart() {
        const chartContainer = document.getElementById('categoryChart');
        const categoryStats = this.calculateCategoryStats();

        if (categoryStats.length === 0) {
            chartContainer.innerHTML = `
                <div class="empty-state">
                    <p style="color: var(--text-secondary);">暂无支出数据</p>
                </div>
            `;
            return;
        }

        // 计算总支出（仅交易记录）
        const totalExpense = categoryStats.reduce((sum, stat) => sum + stat.amount, 0);
        const maxAmount = Math.max(...categoryStats.map(c => c.amount));

        const categoryNames = {
            food: '🍔 餐饮',
            transport: '🚗 交通',
            shopping: '🛍️ 购物',
            entertainment: '🎮 娱乐',
            health: '💊 医疗',
            education: '📚 教育',
            housing: '🏠 住房',
            travel: '✈️ 旅游',
            creditcard: '💳 信用卡还款',
            salary: '💼 工资',
            investment: '📊 投资',
            other: '📦 其他'
        };

        chartContainer.innerHTML = categoryStats.map(stat => {
            // 百分比相对于总支出
            const percentage = (stat.amount / totalExpense * 100).toFixed(1);
            // 进度条宽度相对于最大金额（视觉效果更好）
            const barWidth = (stat.amount / maxAmount * 100).toFixed(1);
            return `
                <div class="category-bar">
                    <div class="category-label">${categoryNames[stat.category]}</div>
                    <div class="category-progress">
                        <div class="category-progress-bar" style="width: ${barWidth}%">
                            ${percentage}%
                        </div>
                    </div>
                    <div class="category-amount">¥${stat.amount.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    }

    // 渲染所有内容
    render() {
        this.updateMonthFilter();
        this.renderStats();
        this.renderTransactions();
        this.renderRecurringExpenses();
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        
        const colors = {
            success: '#4ade80',
            error: '#f87171',
            info: '#60a5fa'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${colors[type]};
            color: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-weight: 500;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // 初始化
    init() {
        // 设置今天的日期为默认值
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

        // 表单提交事件
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const transaction = {
                description: document.getElementById('description').value,
                amount: document.getElementById('amount').value,
                type: document.getElementById('type').value,
                category: document.getElementById('category').value,
                date: document.getElementById('date').value
            };

            // 判断是添加还是更新
            if (this.editingId) {
                this.updateTransaction(this.editingId, transaction);
                this.cancelEdit();
            } else {
                this.addTransaction(transaction);
                e.target.reset();
                document.getElementById('date').value = today;
            }
        });

        // 筛选事件
        document.getElementById('filterType').addEventListener('change', () => this.render());
        document.getElementById('filterCategory').addEventListener('change', () => this.render());
        document.getElementById('filterMonth').addEventListener('change', () => this.render());
        document.getElementById('searchInput').addEventListener('input', () => this.render());

        // 清空所有按钮
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());

        // 固定支出模态框
        const recurringModal = document.getElementById('recurringModal');
        const addRecurringBtn = document.getElementById('addRecurringBtn');
        const closeRecurringModal = document.getElementById('closeRecurringModal');

        addRecurringBtn.addEventListener('click', () => {
            recurringModal.classList.add('active');
        });

        closeRecurringModal.addEventListener('click', () => {
            recurringModal.classList.remove('active');
            document.getElementById('recurringForm').reset();
        });

        // 点击模态框外部关闭
        recurringModal.addEventListener('click', (e) => {
            if (e.target === recurringModal) {
                recurringModal.classList.remove('active');
                document.getElementById('recurringForm').reset();
            }
        });

        // 固定支出表单提交
        document.getElementById('recurringForm').addEventListener('submit', (e) => {
            e.preventDefault();

            const expense = {
                description: document.getElementById('recurringDescription').value,
                amount: document.getElementById('recurringAmount').value,
                category: document.getElementById('recurringCategory').value,
                day: document.getElementById('recurringDay').value,
                autoAdd: document.getElementById('recurringAutoAdd').checked
            };

            this.addRecurringExpense(expense);
            recurringModal.classList.remove('active');
            e.target.reset();
        });

        // 初始渲染
        this.render();

        // 添加动画样式
        this.addAnimationStyles();
    }

    // 添加动画样式
    addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ==================== 初始化应用 ====================
let tracker;

document.addEventListener('DOMContentLoaded', () => {
    tracker = new ExpenseTracker();
    console.log('💰 记账本已加载完成！');
    console.log('📊 当前记录数：', tracker.transactions.length);
});

// ==================== 导出数据功能 ====================
function exportData() {
    const dataStr = JSON.stringify(tracker.transactions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `记账数据_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    tracker.showNotification('数据导出成功！', 'success');
}

// ==================== 导入数据功能 ====================
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (Array.isArray(data)) {
                    tracker.transactions = data;
                    tracker.saveTransactions();
                    tracker.render();
                    tracker.showNotification('数据导入成功！', 'success');
                } else {
                    tracker.showNotification('数据格式错误！', 'error');
                }
            } catch (error) {
                tracker.showNotification('文件解析失败！', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// ==================== 键盘快捷键 ====================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S: 导出数据
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportData();
    }
    
    // Ctrl/Cmd + O: 导入数据
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        importData();
    }
});

console.log('💡 提示：');
console.log('  - Ctrl/Cmd + S: 导出数据');
console.log('  - Ctrl/Cmd + O: 导入数据');

// Made with Bob
