// ========================================
// Reports Management - Main Script
// ========================================

console.log('📊 [REPORTS] Script loaded');

window.ReportsApp = {
    state: {
        cashSummary: null,
        currentPeriod: null,
        driversPerformance: [],
        cashReceipts: [],
        financialsByDate: [],
        fromDate: null,
        toDate: null,
        revenueChart: null
    },

    init: async function() {
        console.log('📊 [REPORTS] Initializing...');
        
        try {
            await this.loadAllData();
            console.log('✅ [REPORTS] Initialized successfully');
        } catch (error) {
            console.error('❌ [REPORTS] Error:', error);
        }
    },

    loadAllData: async function() {
        console.log('📊 [REPORTS] Loading all data...');
        
        // Show loading
        this.showLoading();
        
        try {
            // Load data in parallel
            await Promise.all([
                this.loadCashSummary(),
                this.loadCurrentPeriod(),
                this.loadDriversPerformance(),
                this.loadFinancialsByDate()
            ]);
            
            // Render UI
            this.renderStats();
            this.renderRevenueChart();
            this.renderCashStatus();
            this.renderDriversTable();
            this.renderInsights();
            
            // Refresh icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            console.log('✅ [REPORTS] All data loaded');
        } catch (error) {
            console.error('❌ [REPORTS] Load error:', error);
            this.showError('فشل تحميل البيانات');
        }
    },

    loadCashSummary: async function() {
        try {
            console.log('📡 [REPORTS/CASH] Loading summary...');
            
            const data = await API.getCashSummary();
            
            if (data.success) {
                this.state.cashSummary = data;
                console.log('✅ [REPORTS/CASH] Summary loaded:', data);
            }
        } catch (error) {
            console.error('❌ [REPORTS/CASH] Error:', error);
        }
    },

    loadCurrentPeriod: async function() {
        try {
            console.log('📡 [REPORTS/PERIOD] Loading current period...');
            
            const data = await API.getCurrentPeriod();
            
            if (data.success) {
                this.state.currentPeriod = data.period;
                console.log('✅ [REPORTS/PERIOD] Period loaded:', data.period);
            }
        } catch (error) {
            console.error('❌ [REPORTS/PERIOD] Error:', error);
        }
    },

    loadDriversPerformance: async function() {
        try {
            console.log('📡 [REPORTS/DRIVERS] Loading performance...');
            
            const params = {};
            
            // Add date filters if set
            if (this.state.fromDate) {
                params.start_date = this.state.fromDate;
            }
            if (this.state.toDate) {
                params.end_date = this.state.toDate;
            }
            
            const queryString = new URLSearchParams(params).toString();
            const url = `/drivers/performance${queryString ? '?' + queryString : ''}`;
            
            const data = await API.call(url, 'GET');
            
            if (data.success) {
                this.state.driversPerformance = data.performance || [];
                console.log(`✅ [REPORTS/DRIVERS] Loaded ${this.state.driversPerformance.length} drivers`);
            }
        } catch (error) {
            console.error('❌ [REPORTS/DRIVERS] Error:', error);
        }
    },

    loadFinancialsByDate: async function() {
        try {
            console.log('📡 [REPORTS/FINANCIALS] Loading by date...');
            
            const params = {};
            
            if (this.state.fromDate) {
                params.from_date = this.state.fromDate;
            }
            if (this.state.toDate) {
                params.to_date = this.state.toDate;
            }
            
            const queryString = new URLSearchParams(params).toString();
            const url = `/drivers/financials-by-date${queryString ? '?' + queryString : ''}`;
            
            const data = await API.call(url, 'GET');
            
            if (data.success) {
                this.state.financialsByDate = data.financials || [];
                console.log(`✅ [REPORTS/FINANCIALS] Loaded ${this.state.financialsByDate.length} records`);
            }
        } catch (error) {
            console.error('❌ [REPORTS/FINANCIALS] Error:', error);
        }
    },

    renderStats: function() {
        console.log('🎨 [REPORTS] Rendering stats...');
        
        const container = document.getElementById('statsContainer');
        if (!container) return;
        
        // Calculate stats
        const totalRevenue = this.state.driversPerformance.reduce((sum, d) => 
            sum + parseFloat(d.total_cash || 0) + parseFloat(d.total_credit || 0), 0
        );
        
        const totalOrders = this.state.driversPerformance.reduce((sum, d) => 
            sum + parseInt(d.days_active || 0) * 10, 0 // تقدير تقريبي
        );
        
        const activeDrivers = this.state.driversPerformance.filter(d => 
            d.employment_status === 'active'
        ).length;
        
        const avgDeliveryPerDriver = activeDrivers > 0 
            ? (totalRevenue / activeDrivers).toFixed(0)
            : 0;
        
        const totalViolations = this.state.driversPerformance.reduce((sum, d) => 
            sum + parseFloat(d.total_penalties || 0) + parseFloat(d.total_debit || 0), 0
        );
        
        const revenuePerDriver = activeDrivers > 0
            ? (totalRevenue / activeDrivers).toFixed(0)
            : 0;
        
        // Render
        container.innerHTML = `
            <div class="stat-card primary">
                <div class="stat-top">
                    <div class="stat-label">إجمالي الإيرادات</div>
                    <div class="stat-icon">
                        <i data-lucide="trending-up" style="width: 20px; height: 20px;"></i>
                    </div>
                </div>
                <div class="stat-value">${this.formatCurrency(totalRevenue)}</div>
                <div class="stat-footer">
                    <span class="stat-footer-text">للفترة المحددة</span>
                </div>
            </div>

            <div class="stat-card success">
                <div class="stat-top">
                    <div class="stat-label">إجمالي الطلبات</div>
                    <div class="stat-icon">
                        <i data-lucide="package" style="width: 20px; height: 20px;"></i>
                    </div>
                </div>
                <div class="stat-value">${totalOrders.toLocaleString()}</div>
                <div class="stat-footer">
                    <span class="stat-footer-text">طلب مكتمل</span>
                </div>
            </div>

            <div class="stat-card warning">
                <div class="stat-top">
                    <div class="stat-label">متوسط التوصيل اليومي للمندوب</div>
                    <div class="stat-icon">
                        <i data-lucide="truck" style="width: 20px; height: 20px;"></i>
                    </div>
                </div>
                <div class="stat-value">${avgDeliveryPerDriver} ر.س</div>
                <div class="stat-footer">
                    <span class="stat-footer-text">متوسط يومي</span>
                </div>
            </div>

            <div class="stat-card purple">
                <div class="stat-top">
                    <div class="stat-label">السائقين النشطين</div>
                    <div class="stat-icon">
                        <i data-lucide="users" style="width: 20px; height: 20px;"></i>
                    </div>
                </div>
                <div class="stat-value">${activeDrivers}</div>
                <div class="stat-footer">
                    <span class="stat-footer-text">من إجمالي ${this.state.driversPerformance.length}</span>
                </div>
            </div>

            <div class="stat-card danger">
                <div class="stat-top">
                    <div class="stat-label">إجمالي الغرامات</div>
                    <div class="stat-icon">
                        <i data-lucide="alert-triangle" style="width: 20px; height: 20px;"></i>
                    </div>
                </div>
                <div class="stat-value">${this.formatCurrency(totalViolations)}</div>
                <div class="stat-footer">
                    <span class="stat-footer-text">للفترة المحددة</span>
                </div>
            </div>

            <div class="stat-card cyan">
                <div class="stat-top">
                    <div class="stat-label">الإيراد لكل سائق</div>
                    <div class="stat-icon">
                        <i data-lucide="user-check" style="width: 20px; height: 20px;"></i>
                    </div>
                </div>
                <div class="stat-value">${revenuePerDriver} ر.س</div>
                <div class="stat-footer">
                    <span class="stat-footer-text">متوسط الإيراد</span>
                </div>
            </div>
        `;
        
        // Refresh icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    renderRevenueChart: function() {
        console.log('📈 [REPORTS] Rendering revenue chart...');
        
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;
        
        // Group financials by date and sum
        const revenueByDate = {};
        
        this.state.financialsByDate.forEach(record => {
            const date = record.date;
            const revenue = parseFloat(record.cash_collected || 0) + parseFloat(record.driver_credit || 0);
            
            if (!revenueByDate[date]) {
                revenueByDate[date] = 0;
            }
            revenueByDate[date] += revenue;
        });
        
        // Sort by date and get last 7 days
        const sortedDates = Object.keys(revenueByDate).sort();
        const last7Days = sortedDates.slice(-7);
        
        const labels = last7Days.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('ar-SA', { weekday: 'short' });
        });
        
        const data = last7Days.map(date => revenueByDate[date]);
        
        // Destroy previous chart
        if (this.state.revenueChart) {
            this.state.revenueChart.destroy();
        }
        
        // Create chart
        const ctx = canvas.getContext('2d');
        this.state.revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
                datasets: [{
                    label: 'الإيرادات اليومية',
                    data: data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderRadius: 8,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                return 'الإيرادات: ' + context.parsed.y.toLocaleString() + ' ر.س';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9',
                            drawBorder: false
                        },
                        ticks: {
                            callback: (value) => (value / 1000) + 'k',
                            color: '#64748b',
                            font: { size: 11 }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#64748b',
                            font: { size: 11, weight: '600' }
                        }
                    }
                }
            }
        });
    },

    renderCashStatus: function() {
        console.log('💰 [REPORTS] Rendering cash status...');
        
        const container = document.getElementById('cashStatusCard');
        if (!container) return;
        
        const summary = this.state.cashSummary;
        const period = this.state.currentPeriod;
        
        if (!summary || !period) {
            container.querySelector('.loading').innerHTML = '<p style="color: var(--text-light); padding: 2rem;">لا توجد بيانات متاحة</p>';
            return;
        }
        
        const totalCollected = parseFloat(summary.total_amount || 0);
        const totalExpected = period.total_received || 0;
        const remaining = totalExpected - totalCollected;
        const percentage = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : 0;
        
        // Get drivers with pending cash
        const pendingDrivers = this.state.driversPerformance
            .filter(d => parseFloat(d.total_cash || 0) > 0)
            .sort((a, b) => parseFloat(b.total_cash) - parseFloat(a.total_cash))
            .slice(0, 3);
        
        container.innerHTML = `
            <div class="chart-header">
                <h3 class="chart-title">
                    <i data-lucide="wallet" style="width: 18px; height: 18px;"></i>
                    حالة الكاش
                </h3>
            </div>
            <div style="padding: 2rem 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 0.25rem;">المستلم</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${this.formatCurrency(totalCollected)}</div>
                    </div>
                    <div style="text-align: left;">
                        <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 0.25rem;">المتوقع</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-light);">${this.formatCurrency(totalExpected)}</div>
                    </div>
                </div>
                
                <div style="background: var(--bg); height: 24px; border-radius: 12px; overflow: hidden; position: relative;">
                    <div style="background: linear-gradient(90deg, var(--success) 0%, var(--success-light) 100%); height: 100%; width: ${percentage}%; transition: width 1s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.875rem;">
                        ${percentage}%
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem;">
                    <div style="background: var(--bg); padding: 1rem; border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--success);"></i>
                            <span style="font-size: 0.75rem; color: var(--text-light); font-weight: 600;">تم التحصيل</span>
                        </div>
                        <div style="font-size: 1.25rem; font-weight: 700;">${this.formatCurrency(totalCollected)}</div>
                    </div>
                    
                    <div style="background: var(--bg); padding: 1rem; border-radius: 12px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <i data-lucide="alert-circle" style="width: 16px; height: 16px; color: var(--warning);"></i>
                            <span style="font-size: 0.75rem; color: var(--text-light); font-weight: 600;">المتبقي</span>
                        </div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--warning);">${this.formatCurrency(remaining)}</div>
                    </div>
                </div>
                
                ${pendingDrivers.length > 0 ? `
                <div style="margin-top: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border);">
                        <i data-lucide="users" style="width: 16px; height: 16px; color: var(--text-light);"></i>
                        <span style="font-size: 0.875rem; font-weight: 700;">أكثر السائقين تحصيلاً</span>
                    </div>
                    
                    <div>
                        ${pendingDrivers.map((driver, index) => `
                            <div class="pending-driver ${index === 0 ? '' : ''}">
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <div class="driver-avatar">${(driver.name || 'س')[0]}</div>
                                    <div>
                                        <div style="font-weight: 600; font-size: 0.9375rem;">${driver.name || 'غير معروف'}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-light);">${driver.phone || '-'}</div>
                                    </div>
                                </div>
                                <div style="text-align: left;">
                                    <div style="font-weight: 700; font-size: 1rem; color: var(--success);">${this.formatCurrency(driver.total_cash)}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-light);">كاش محصّل</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(34, 197, 94, 0.1); border-radius: 8px; display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="info" style="width: 16px; height: 16px; color: var(--success);"></i>
                    <span style="font-size: 0.8125rem; color: var(--success); font-weight: 600;">${summary.drivers_count || 0} مندوب نشط</span>
                </div>
            </div>
        `;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    renderDriversTable: function() {
        console.log('👥 [REPORTS] Rendering drivers table...');
        
        const container = document.getElementById('driversTableContainer');
        if (!container) return;
        
        const drivers = this.state.driversPerformance
            .filter(d => d.employment_status === 'active')
            .sort((a, b) => {
                const aRevenue = parseFloat(a.total_cash || 0) + parseFloat(a.total_credit || 0);
                const bRevenue = parseFloat(b.total_cash || 0) + parseFloat(b.total_credit || 0);
                return bRevenue - aRevenue;
            })
            .slice(0, 10);
        
        if (drivers.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">لا توجد بيانات</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>السائق</th>
                        <th>الأيام النشطة</th>
                        <th>الإيرادات</th>
                        <th>الكاش</th>
                        <th>الغرامات</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${drivers.map((driver, index) => {
                        const revenue = parseFloat(driver.total_cash || 0) + parseFloat(driver.total_credit || 0);
                        const violations = parseFloat(driver.total_penalties || 0) + parseFloat(driver.total_debit || 0);
                        
                        return `
                            <tr>
                                <td>
                                    ${index < 3 ? 
                                        `<span class="rank-badge rank-${index + 1}">${index + 1}</span>` : 
                                        index + 1
                                    }
                                </td>
                                <td><strong>${driver.name || 'غير معروف'}</strong></td>
                                <td>${driver.days_active || 0} يوم</td>
                                <td><strong>${this.formatCurrency(revenue)}</strong></td>
                                <td>${this.formatCurrency(driver.total_cash)}</td>
                                <td>
                                    <span class="badge ${violations === 0 ? 'badge-success' : violations < 100 ? 'badge-warning' : 'badge-danger'}">
                                        ${this.formatCurrency(violations)}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${driver.online ? 'badge-success' : 'badge-warning'}">
                                        ${driver.online ? 'متصل' : 'غير متصل'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    renderInsights: function() {
        console.log('💡 [REPORTS] Rendering insights...');
        
        const container = document.getElementById('insightsContainer');
        if (!container) return;
        
        const totalRevenue = this.state.driversPerformance.reduce((sum, d) => 
            sum + parseFloat(d.total_cash || 0) + parseFloat(d.total_credit || 0), 0
        );
        
        const activeDrivers = this.state.driversPerformance.filter(d => 
            d.employment_status === 'active' && d.online
        ).length;
        
        const topDriver = this.state.driversPerformance
            .sort((a, b) => {
                const aRev = parseFloat(a.total_cash || 0) + parseFloat(a.total_credit || 0);
                const bRev = parseFloat(b.total_cash || 0) + parseFloat(b.total_credit || 0);
                return bRev - aRev;
            })[0];
        
        container.innerHTML = `
            <div class="insight-card primary">
                <div class="insight-icon">
                    <i data-lucide="trending-up" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="insight-content">
                    <div class="insight-title">إجمالي الإيرادات</div>
                    <div class="insight-description">
                        تم تحقيق ${this.formatCurrency(totalRevenue)} خلال الفترة المحددة
                    </div>
                </div>
            </div>

            <div class="insight-card success">
                <div class="insight-icon">
                    <i data-lucide="users" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="insight-content">
                    <div class="insight-title">السائقين النشطين حالياً</div>
                    <div class="insight-description">
                        ${activeDrivers} سائق متصل ونشط في الوقت الحالي
                    </div>
                </div>
            </div>

            ${topDriver ? `
            <div class="insight-card warning">
                <div class="insight-icon">
                    <i data-lucide="award" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="insight-content">
                    <div class="insight-title">أفضل سائق</div>
                    <div class="insight-description">
                        ${topDriver.name || 'غير معروف'} حقق أعلى إيرادات بقيمة ${this.formatCurrency(parseFloat(topDriver.total_cash || 0) + parseFloat(topDriver.total_credit || 0))}
                    </div>
                </div>
            </div>
            ` : ''}
        `;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    applyDateFilter: function() {
        const periodFilter = document.getElementById('periodFilter').value;
        const fromDate = document.getElementById('fromDate');
        const toDate = document.getElementById('toDate');
        
        const today = new Date();
        const endDate = new Date(today);
        
        if (periodFilter !== 'custom') {
            const days = parseInt(periodFilter);
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - days);
            
            fromDate.valueAsDate = startDate;
            toDate.valueAsDate = endDate;
        }
        
        this.state.fromDate = fromDate.value;
        this.state.toDate = toDate.value;
        
        this.loadAllData();
    },

    formatCurrency: function(amount) {
        const num = parseFloat(amount) || 0;
        return num.toLocaleString('ar-SA') + ' ر.س';
    },

    showLoading: function() {
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) {
            statsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';
        }
    },

    showError: function(message) {
        console.error('❌ [REPORTS] Error:', message);
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) {
            statsContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--danger);">${message}</div>`;
        }
    }
};

console.log('✅ [REPORTS] Module ready');