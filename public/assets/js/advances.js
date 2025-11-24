// ========================================
// 💰 Advances Management System
// ========================================

const AdvancesApp = {
    // State
    state: {
        advances: [],
        drivers: [],
        selectedAdvance: null,
        filters: {
            status: 'active'
        }
    },

    // ========================================
    // 🚀 Initialize
    // ========================================
    
    init: async function() {
        console.log('💰 [Advances] Initializing...');
        
        try {
            // Load drivers for dropdown
            await this.loadDrivers();
            
            // Load advances list
            await this.loadAdvances();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize Select2
            this.initSelect2();
            
            console.log('✅ [Advances] Initialized successfully');
        } catch (error) {
            console.error('❌ [Advances] Init error:', error);
        }
    },

    // ========================================
    // 📊 Load Data
    // ========================================
    
    loadDrivers: async function() {
        try {
            const result = await API.getDrivers();
            
            if (result.success && result.drivers) {
                this.state.drivers = result.drivers;
                this.populateDriverDropdown();
            }
        } catch (error) {
            console.error('❌ [Advances] Error loading drivers:', error);
        }
    },
    
    populateDriverDropdown: function() {
        const select = document.getElementById('driverId');
        if (!select) return;
        
        select.innerHTML = '<option value="">اختر المندوب...</option>';
        
        this.state.drivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.driver_id;
            option.textContent = driver.name || 'غير محدد';
            option.dataset.phone = driver.phone || '';
            select.appendChild(option);
        });
    },
    
    loadAdvances: async function() {
        const container = document.getElementById('advancesTableContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>جاري تحميل السُلف...</p>
            </div>
        `;
        
        try {
            const status = this.state.filters.status === 'all' ? null : this.state.filters.status;
            const result = await API.call(`/advances${status ? '?status=' + status : ''}`, 'GET');
            
            if (result.success) {
                this.state.advances = result.advances || [];
                this.renderAdvancesTable();
                this.updateStats();
            } else {
                throw new Error(result.message || 'فشل تحميل البيانات');
            }
        } catch (error) {
            console.error('❌ [Advances] Error loading advances:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="alert-circle"></i>
                    <p>حدث خطأ في تحميل البيانات</p>
                    <button class="btn btn-secondary" onclick="AdvancesApp.loadAdvances()">
                        <i data-lucide="refresh-cw"></i>
                        إعادة المحاولة
                    </button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    // ========================================
    // 📊 Update Statistics
    // ========================================
    
    updateStats: function() {
        const activeAdvances = this.state.advances.filter(a => a.status === 'active');
        
        const totalAdvances = activeAdvances.reduce((sum, a) => sum + parseFloat(a.total_amount || 0), 0);
        const totalRemaining = activeAdvances.reduce((sum, a) => sum + parseFloat(a.remaining_amount || 0), 0);
        const totalPaid = activeAdvances.reduce((sum, a) => sum + parseFloat(a.paid_amount || 0), 0);
        const activeCount = activeAdvances.length;
        
        document.getElementById('statTotalAdvances').textContent = this.formatCurrency(totalAdvances);
        document.getElementById('statTotalRemaining').textContent = this.formatCurrency(totalRemaining);
        document.getElementById('statTotalPaid').textContent = this.formatCurrency(totalPaid);
        document.getElementById('statActiveCount').textContent = activeCount;
    },

    // ========================================
    // 🎨 Render Table
    // ========================================
    
    renderAdvancesTable: function() {
        const container = document.getElementById('advancesTableContainer');
        if (!container) return;
        
        if (this.state.advances.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="inbox"></i>
                    <p>لا توجد سُلف ${this.state.filters.status === 'active' ? 'نشطة' : ''}</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }
        
        const html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>المندوب</th>
                            <th>مبلغ السلفة</th>
                            <th>القسط الشهري</th>
                            <th>المسدد</th>
                            <th>المتبقي</th>
                            <th>التقدم</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.state.advances.map(advance => this.renderAdvanceRow(advance)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    
    renderAdvanceRow: function(advance) {
        const progress = advance.total_amount > 0 
            ? Math.round((advance.paid_amount / advance.total_amount) * 100) 
            : 0;
        
        const statusBadge = this.getStatusBadge(advance.status);
        const initial = advance.driver_name ? advance.driver_name.charAt(0) : '?';
        
        return `
            <tr data-id="${advance.id}">
                <td>
                    <div class="driver-info">
                        <div class="driver-avatar">${initial}</div>
                        <div class="driver-details">
                            <span class="driver-name">${advance.driver_name || 'غير محدد'}</span>
                            <span class="driver-phone">${advance.driver_id}</span>
                        </div>
                    </div>
                </td>
                <td class="amount-cell">${this.formatCurrency(advance.total_amount)}</td>
                <td class="amount-cell">${this.formatCurrency(advance.monthly_deduction)}</td>
                <td class="amount-cell amount-positive">${this.formatCurrency(advance.paid_amount)}</td>
                <td class="amount-cell amount-negative">${this.formatCurrency(advance.remaining_amount)}</td>
                <td style="min-width: 150px;">
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>${progress}%</span>
                        <span>${advance.paid_months || 0}/${advance.total_months} شهر</span>
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-btns">
                        ${advance.status === 'active' ? `
                            <button class="action-btn payment" onclick="AdvancesApp.openPaymentModal(${advance.id})" title="تسجيل سداد">
                                <i data-lucide="credit-card"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn edit" onclick="AdvancesApp.openEditModal(${advance.id})" title="تعديل">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="action-btn" onclick="AdvancesApp.openDetailsModal(${advance.id})" title="التفاصيل">
                            <i data-lucide="info"></i>
                        </button>
                        <button class="action-btn danger" onclick="AdvancesApp.openDeleteModal(${advance.id})" title="حذف">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },
    
    getStatusBadge: function(status) {
        const badges = {
            'active': '<span class="badge badge-warning"><i data-lucide="clock" style="width:14px;height:14px;"></i> نشطة</span>',
            'completed': '<span class="badge badge-success"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> مكتملة</span>',
            'cancelled': '<span class="badge badge-danger"><i data-lucide="x-circle" style="width:14px;height:14px;"></i> ملغية</span>'
        };
        return badges[status] || badges['active'];
    },

    // ========================================
    // 📝 Form Submission
    // ========================================
    
    setupEventListeners: function() {
        // Add advance form
        const form = document.getElementById('advanceForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddAdvance(e));
        }
        
        // Filter change
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => {
                this.state.filters.status = e.target.value;
                this.loadAdvances();
            });
        }
        
        // Payment modal buttons
        document.getElementById('confirmPaymentBtn')?.addEventListener('click', () => this.handlePayment());
        document.getElementById('cancelPaymentBtn')?.addEventListener('click', () => this.closeModal('paymentModal'));
        
        // Edit modal buttons
        document.getElementById('saveEditBtn')?.addEventListener('click', () => this.handleEdit());
        document.getElementById('cancelEditBtn')?.addEventListener('click', () => this.closeModal('editAdvanceModal'));
        
        // Delete modal buttons
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => this.handleDelete());
        document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => this.closeModal('deleteAdvanceModal'));
        
        // Details modal
        document.getElementById('closeDetailsBtn')?.addEventListener('click', () => this.closeModal('detailsModal'));
    },
    
    handleAddAdvance: async function(e) {
        e.preventDefault();
        
        const btn = document.getElementById('submitAdvanceBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader"></i> جاري الحفظ...';
        
        try {
            const driverId = document.getElementById('driverId').value;
            const driverSelect = document.getElementById('driverId');
            const driverName = driverSelect.options[driverSelect.selectedIndex]?.text || '';
            const totalAmount = parseFloat(document.getElementById('totalAmount').value);
            const totalMonths = parseInt(document.getElementById('totalMonths').value);
            const advanceDate = document.getElementById('advanceDate').value;
            const notes = document.getElementById('notes').value;
            
            if (!driverId || !totalAmount || !totalMonths || !advanceDate) {
                throw new Error('يرجى تعبئة جميع الحقول المطلوبة');
            }
            
            const monthlyDeduction = (totalAmount / totalMonths).toFixed(2);
            
            const result = await API.call('/advances', 'POST', {
                driver_id: driverId,
                driver_name: driverName,
                total_amount: totalAmount,
                monthly_deduction: parseFloat(monthlyDeduction),
                total_months: totalMonths,
                advance_date: advanceDate,
                notes: notes
            });
            
            if (result.success) {
                // Reset form
                document.getElementById('advanceForm').reset();
                document.getElementById('monthlyDeduction').value = '';
                document.getElementById('advanceDate').value = new Date().toISOString().split('T')[0];
                
                // Reset Select2
                if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
                    jQuery('#driverId').val('').trigger('change');
                }
                
                // Reload data
                await this.loadAdvances();
                
                alert('✅ تم إضافة السلفة بنجاح');
            } else {
                throw new Error(result.message || 'فشل في إضافة السلفة');
            }
        } catch (error) {
            console.error('❌ [Advances] Add error:', error);
            alert('❌ ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    // ========================================
    // 💳 Payment Modal
    // ========================================
    
    openPaymentModal: function(advanceId) {
        const advance = this.state.advances.find(a => a.id === advanceId);
        if (!advance) return;
        
        this.state.selectedAdvance = advance;
        
        document.getElementById('paymentDriverName').textContent = advance.driver_name || 'غير محدد';
        document.getElementById('paymentRemaining').textContent = this.formatCurrency(advance.remaining_amount);
        document.getElementById('paymentMonthly').textContent = this.formatCurrency(advance.monthly_deduction);
        document.getElementById('paymentAmount').value = advance.monthly_deduction;
        document.getElementById('paymentNotes').value = '';
        
        document.getElementById('paymentModal').classList.add('show');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    
    handlePayment: async function() {
        const advance = this.state.selectedAdvance;
        if (!advance) return;
        
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const notes = document.getElementById('paymentNotes').value;
        
        if (!amount || amount <= 0) {
            alert('يرجى إدخال مبلغ صحيح');
            return;
        }
        
        if (amount > advance.remaining_amount) {
            alert('المبلغ أكبر من المتبقي!');
            return;
        }
        
        const btn = document.getElementById('confirmPaymentBtn');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader"></i> جاري التسجيل...';
        
        try {
            const result = await API.call(`/advances/${advance.id}/payment`, 'POST', {
                amount: amount,
                notes: notes
            });
            
            if (result.success) {
                this.closeModal('paymentModal');
                await this.loadAdvances();
                alert('✅ تم تسجيل السداد بنجاح');
            } else {
                throw new Error(result.message || 'فشل في تسجيل السداد');
            }
        } catch (error) {
            console.error('❌ [Advances] Payment error:', error);
            alert('❌ ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="check"></i> تأكيد السداد';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    // ========================================
    // ✏️ Edit Modal
    // ========================================
    
    openEditModal: function(advanceId) {
        const advance = this.state.advances.find(a => a.id === advanceId);
        if (!advance) return;
        
        this.state.selectedAdvance = advance;
        
        document.getElementById('editAdvanceId').value = advance.id;
        document.getElementById('editDriverName').textContent = advance.driver_name || 'غير محدد';
        document.getElementById('editPaidAmount').value = advance.paid_amount || 0;
        document.getElementById('editRemainingAmount').value = advance.remaining_amount || 0;
        document.getElementById('editStatus').value = advance.status || 'active';
        document.getElementById('editNotes').value = advance.notes || '';
        
        document.getElementById('editAdvanceModal').classList.add('show');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    
    handleEdit: async function() {
        const advanceId = document.getElementById('editAdvanceId').value;
        
        const paidAmount = parseFloat(document.getElementById('editPaidAmount').value) || 0;
        const remainingAmount = parseFloat(document.getElementById('editRemainingAmount').value) || 0;
        const status = document.getElementById('editStatus').value;
        const notes = document.getElementById('editNotes').value;
        
        const btn = document.getElementById('saveEditBtn');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader"></i> جاري الحفظ...';
        
        try {
            const result = await API.call(`/advances/${advanceId}`, 'PUT', {
                paid_amount: paidAmount,
                remaining_amount: remainingAmount,
                status: status,
                notes: notes
            });
            
            if (result.success) {
                this.closeModal('editAdvanceModal');
                await this.loadAdvances();
                alert('✅ تم تحديث السلفة بنجاح');
            } else {
                throw new Error(result.message || 'فشل في تحديث السلفة');
            }
        } catch (error) {
            console.error('❌ [Advances] Edit error:', error);
            alert('❌ ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="save"></i> حفظ التعديلات';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    // ========================================
    // 🗑️ Delete Modal
    // ========================================
    
    openDeleteModal: function(advanceId) {
        const advance = this.state.advances.find(a => a.id === advanceId);
        if (!advance) return;
        
        this.state.selectedAdvance = advance;
        
        document.getElementById('deleteDriverName').textContent = advance.driver_name || 'غير محدد';
        document.getElementById('deleteAmount').textContent = this.formatCurrency(advance.total_amount);
        
        document.getElementById('deleteAdvanceModal').classList.add('show');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    
    handleDelete: async function() {
        const advance = this.state.selectedAdvance;
        if (!advance) return;
        
        const btn = document.getElementById('confirmDeleteBtn');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader"></i> جاري الحذف...';
        
        try {
            const result = await API.call(`/advances/${advance.id}`, 'DELETE');
            
            if (result.success) {
                this.closeModal('deleteAdvanceModal');
                await this.loadAdvances();
                alert('✅ تم حذف السلفة بنجاح');
            } else {
                throw new Error(result.message || 'فشل في حذف السلفة');
            }
        } catch (error) {
            console.error('❌ [Advances] Delete error:', error);
            alert('❌ ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="trash-2"></i> نعم، حذف السلفة';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    // ========================================
    // 📋 Details Modal
    // ========================================
    
    openDetailsModal: async function(advanceId) {
        const advance = this.state.advances.find(a => a.id === advanceId);
        if (!advance) return;
        
        const progress = advance.total_amount > 0 
            ? Math.round((advance.paid_amount / advance.total_amount) * 100) 
            : 0;
        
        let paymentsHtml = '';
        
        // Try to load payment history
        try {
            const result = await API.call(`/advances/${advanceId}/payments`, 'GET');
            if (result.success && result.payments && result.payments.length > 0) {
                paymentsHtml = `
                    <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: var(--gray-700);">
                        <i data-lucide="history" style="width:18px;height:18px;"></i>
                        سجل الأقساط
                    </h4>
                    <table style="font-size: 0.875rem;">
                        <thead>
                            <tr>
                                <th>التاريخ</th>
                                <th>المبلغ</th>
                                <th>النوع</th>
                                <th>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.payments.map(p => `
                                <tr>
                                    <td>${this.formatDate(p.payment_date)}</td>
                                    <td class="amount-cell amount-positive">${this.formatCurrency(p.amount)}</td>
                                    <td>${p.payment_type === 'auto' ? 'تلقائي' : 'يدوي'}</td>
                                    <td>${p.notes || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        } catch (e) {
            console.log('No payments history available');
        }
        
        const html = `
            <div class="info-row">
                <span class="info-label">المندوب:</span>
                <span class="info-value">${advance.driver_name || 'غير محدد'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">رقم المندوب:</span>
                <span class="info-value">${advance.driver_id}</span>
            </div>
            <div class="info-row">
                <span class="info-label">مبلغ السلفة:</span>
                <span class="info-value">${this.formatCurrency(advance.total_amount)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">القسط الشهري:</span>
                <span class="info-value">${this.formatCurrency(advance.monthly_deduction)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">عدد الأشهر:</span>
                <span class="info-value">${advance.total_months} شهر</span>
            </div>
            <div class="info-row">
                <span class="info-label">المسدد:</span>
                <span class="info-value" style="color: var(--secondary);">${this.formatCurrency(advance.paid_amount)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">المتبقي:</span>
                <span class="info-value" style="color: var(--danger);">${this.formatCurrency(advance.remaining_amount)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">الأشهر المسددة:</span>
                <span class="info-value">${advance.paid_months || 0} من ${advance.total_months}</span>
            </div>
            <div class="info-row">
                <span class="info-label">تاريخ السلفة:</span>
                <span class="info-value">${this.formatDate(advance.advance_date)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">الحالة:</span>
                <span class="info-value">${this.getStatusBadge(advance.status)}</span>
            </div>
            ${advance.notes ? `
                <div class="info-row">
                    <span class="info-label">ملاحظات:</span>
                    <span class="info-value">${advance.notes}</span>
                </div>
            ` : ''}
            
            <div style="margin-top: 1.5rem;">
                <label style="font-weight: 600; color: var(--gray-700); margin-bottom: 0.5rem; display: block;">
                    نسبة السداد: ${progress}%
                </label>
                <div class="progress-bar-container" style="height: 12px;">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
            </div>
            
            ${paymentsHtml}
        `;
        
        document.getElementById('detailsContent').innerHTML = html;
        document.getElementById('detailsModal').classList.add('show');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // ========================================
    // 🔧 Utilities
    // ========================================
    
    closeModal: function(modalId) {
        document.getElementById(modalId)?.classList.remove('show');
        this.state.selectedAdvance = null;
    },
    
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('ar-SA', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount || 0) + ' ر.س';
    },
    
    formatDate: function(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    },
    
    initSelect2: function() {
        if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
            jQuery('#driverId').select2({
                placeholder: 'اختر المندوب...',
                allowClear: true,
                dir: 'rtl',
                width: '100%'
            });
        }
    }
};

// Make it global
window.AdvancesApp = AdvancesApp;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure API is loaded
    setTimeout(() => {
        if (typeof API !== 'undefined') {
            AdvancesApp.init();
        }
    }, 300);
});