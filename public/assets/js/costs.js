/**
 * FleetMaster - Costs Management Module
 * إدارة التكاليف مع احتساب استرداد الضريبة
 */

const CostsApp = {
    // State
    items: [],
    summary: {
        total_monthly: 0,
        total_yearly: 0,
        total_vat: 0,
        total_net: 0,
        cost_per_driver: 0,
        items_count: 0
    },
    settings: {
        driver_count: 1
    },
    isSubmitting: false,
    itemToDelete: null,
    itemToEdit: null,

    // VAT Rate
    VAT_RATE: 0.15,

    // ========================================
    // Initialize
    // ========================================
    init: function() {
        console.log('💰 [CostsApp] Initializing...');
        
        this.bindEvents();
        this.loadSettings();
        this.loadItems();
        
        // Re-init Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        console.log('✅ [CostsApp] Initialized');
    },

    // ========================================
    // Event Bindings
    // ========================================
    bindEvents: function() {
        const self = this;

        // Form submit
        const costForm = document.getElementById('costForm');
        if (costForm) {
            costForm.addEventListener('submit', function(e) {
                e.preventDefault();
                self.handleFormSubmit();
            });
        }

        // Driver count change
        const driverCountInput = document.getElementById('driverCount');
        if (driverCountInput) {
            driverCountInput.addEventListener('change', function() {
                self.updateDriverCount(this.value);
            });
        }

        // VAT checkbox toggle
        const hasVatCheckbox = document.getElementById('hasVat');
        if (hasVatCheckbox) {
            hasVatCheckbox.addEventListener('change', function() {
                self.toggleVatPreview();
                self.updateVatCheckStyle('vatCheckContainer', this.checked);
            });
        }

        // Amount input - update VAT preview
        const amountInput = document.getElementById('itemAmount');
        if (amountInput) {
            amountInput.addEventListener('input', function() {
                self.updateVatPreview();
            });
        }

        // Delete modal buttons
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', function() {
                self.confirmDelete();
            });
        }

        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', function() {
                self.hideDeleteModal();
            });
        }

        // Edit modal buttons
        const saveEditBtn = document.getElementById('saveEditBtn');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', function() {
                self.saveEdit();
            });
        }

        const cancelEditBtn = document.getElementById('cancelEditBtn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', function() {
                self.hideEditModal();
            });
        }

        // Edit VAT checkbox
        const editHasVat = document.getElementById('editHasVat');
        if (editHasVat) {
            editHasVat.addEventListener('change', function() {
                self.updateVatCheckStyle('editVatCheckContainer', this.checked);
            });
        }

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('show');
                }
            });
        });

        // Initialize VAT check style
        this.updateVatCheckStyle('vatCheckContainer', true);
    },

    // ========================================
    // VAT Calculations
    // ========================================
    calculateVat: function(amount, hasVat) {
        if (!hasVat) {
            return {
                original: amount,
                vat: 0,
                net: amount
            };
        }
        
        // المبلغ المدخل شامل الضريبة
        // الضريبة = المبلغ × 15%
        // صافي التكلفة = المبلغ - الضريبة
        const vat = amount * this.VAT_RATE;
        const net = amount - vat;
        
        return {
            original: amount,
            vat: vat,
            net: net
        };
    },

    toggleVatPreview: function() {
        const hasVat = document.getElementById('hasVat').checked;
        const preview = document.getElementById('vatPreview');
        
        if (hasVat) {
            preview.classList.add('show');
            this.updateVatPreview();
        } else {
            preview.classList.remove('show');
        }
    },

    updateVatPreview: function() {
        const amount = parseFloat(document.getElementById('itemAmount').value) || 0;
        const hasVat = document.getElementById('hasVat').checked;
        
        if (!hasVat) return;
        
        const calc = this.calculateVat(amount, true);
        
        document.getElementById('previewAmount').textContent = this.formatCurrency(calc.original);
        document.getElementById('previewVat').textContent = '- ' + this.formatCurrency(calc.vat);
        document.getElementById('previewNet').textContent = this.formatCurrency(calc.net);
    },

    updateVatCheckStyle: function(containerId, checked) {
        const container = document.getElementById(containerId);
        if (container) {
            if (checked) {
                container.classList.add('checked');
            } else {
                container.classList.remove('checked');
            }
        }
    },

    // ========================================
    // Load Data
    // ========================================
    loadSettings: async function() {
        try {
            const response = await API.getCostsSettings();
            if (response.success && response.data) {
                this.settings = response.data;
                document.getElementById('driverCount').value = this.settings.driver_count || 1;
            }
        } catch (error) {
            console.error('❌ [CostsApp] Error loading settings:', error);
        }
    },

    loadItems: async function() {
        const container = document.getElementById('costsTableContainer');
        
        try {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>جاري تحميل البيانات...</p>
                </div>
            `;

            const response = await API.getCostItems();
            
            if (response.success) {
                this.items = response.data || [];
                this.renderTable();
                this.calculateAndUpdateSummary();
            } else {
                throw new Error(response.message || 'فشل في تحميل البيانات');
            }
        } catch (error) {
            console.error('❌ [CostsApp] Error loading items:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p>❌ فشل في تحميل البيانات</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">${error.message}</p>
                </div>
            `;
        }
    },

    // ========================================
    // Calculate Summary (Frontend)
    // ========================================
    calculateAndUpdateSummary: function() {
        let totalMonthly = 0;
        let totalVat = 0;
        let totalNet = 0;

        this.items.forEach(item => {
            const amount = parseFloat(item.amount) || 0;
            const hasVat = item.has_vat === true || item.has_vat === 1;
            const calc = this.calculateVat(amount, hasVat);
            
            // تحويل للشهري
            let monthlyAmount = amount;
            let monthlyVat = calc.vat;
            let monthlyNet = calc.net;
            
            if (item.type === 'yearly') {
                monthlyAmount = amount / 12;
                monthlyVat = calc.vat / 12;
                monthlyNet = calc.net / 12;
            }
            
            totalMonthly += monthlyAmount;
            totalVat += monthlyVat;
            totalNet += monthlyNet;
        });

        const driverCount = this.settings.driver_count || 1;
        const costPerDriver = totalNet / driverCount;

        // Update UI
        this.updateStatCard('totalMonthly', totalMonthly);
        this.updateStatCard('totalVat', totalVat);
        this.updateStatCard('totalNet', totalNet);
        this.updateStatCard('costPerDriver', costPerDriver);
        document.getElementById('totalItems').textContent = this.items.length;
        document.getElementById('totalItems').closest('.stat-card').classList.add('highlight');
    },

    updateStatCard: function(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.formatCurrency(value);
            element.closest('.stat-card').classList.add('highlight');
            setTimeout(() => {
                element.closest('.stat-card').classList.remove('highlight');
            }, 1000);
        }
    },

    // ========================================
    // Render Table
    // ========================================
    renderTable: function() {
        const container = document.getElementById('costsTableContainer');
        
        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="inbox"></i>
                    <p><strong>لا توجد بنود تكاليف</strong></p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">ابدأ بإضافة بند تكلفة جديد</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        let html = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>البند</th>
                            <th>المبلغ</th>
                            <th>الضريبة</th>
                            <th>الصافي</th>
                            <th>التكرار</th>
                            <th>الشهري</th>
                            <th>ملاحظات</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.items.forEach(item => {
            const amount = parseFloat(item.amount) || 0;
            const hasVat = item.has_vat === true || item.has_vat === 1;
            const calc = this.calculateVat(amount, hasVat);
            
            // حساب الشهري
            let monthlyNet = calc.net;
            if (item.type === 'yearly') {
                monthlyNet = calc.net / 12;
            }

            const typeBadge = item.type === 'monthly' 
                ? '<span class="badge badge-monthly">شهري</span>'
                : '<span class="badge badge-yearly">سنوي</span>';

            const vatBadge = hasVat
                ? '<span class="badge badge-vat">مسترد</span>'
                : '<span class="badge badge-no-vat">بدون</span>';

            html += `
                <tr>
                    <td><strong>${this.escapeHtml(item.name)}</strong></td>
                    <td class="amount">${this.formatCurrency(amount)}</td>
                    <td>
                        ${vatBadge}
                        ${hasVat ? `<span class="amount-vat">-${this.formatCurrency(calc.vat)}</span>` : ''}
                    </td>
                    <td class="amount amount-net">${this.formatCurrency(calc.net)}</td>
                    <td>${typeBadge}</td>
                    <td class="amount" style="color: var(--purple);">${this.formatCurrency(monthlyNet)}</td>
                    <td style="color: var(--gray-500); font-size: 0.8rem;">${item.notes ? this.escapeHtml(item.notes) : '-'}</td>
                    <td>
                        <button class="action-btn" onclick="CostsApp.showEditModal('${item.id}')" title="تعديل">
                            <i data-lucide="edit-2"></i>
                        </button>
                        <button class="action-btn danger" onclick="CostsApp.showDeleteModal('${item.id}')" title="حذف">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // ========================================
    // Form Submit
    // ========================================
    handleFormSubmit: async function() {
        if (this.isSubmitting) return;

        const name = document.getElementById('itemName').value.trim();
        const amount = parseFloat(document.getElementById('itemAmount').value);
        const type = document.getElementById('itemType').value;
        const hasVat = document.getElementById('hasVat').checked;
        const notes = document.getElementById('itemNotes').value.trim();

        // Validation
        if (!name) {
            this.showToast('الرجاء إدخال اسم البند', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            this.showToast('الرجاء إدخال مبلغ صحيح', 'error');
            return;
        }

        this.isSubmitting = true;
        const submitBtn = document.querySelector('#costForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></span> جاري الإضافة...';
        submitBtn.disabled = true;

        try {
            const response = await API.createCostItem(name, amount, type, hasVat, notes);

            if (response.success) {
                this.showToast('تم إضافة البند بنجاح', 'success');
                
                // Reset form
                document.getElementById('costForm').reset();
                document.getElementById('hasVat').checked = true;
                this.updateVatCheckStyle('vatCheckContainer', true);
                document.getElementById('vatPreview').classList.add('show');
                this.updateVatPreview();
                
                // Reload items
                await this.loadItems();
            } else {
                throw new Error(response.message || 'فشل في إضافة البند');
            }
        } catch (error) {
            console.error('❌ [CostsApp] Error adding item:', error);
            this.showToast(error.message || 'حدث خطأ أثناء الإضافة', 'error');
        } finally {
            this.isSubmitting = false;
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    },

    // ========================================
    // Update Driver Count
    // ========================================
    updateDriverCount: async function(count) {
        count = parseInt(count);
        if (!count || count < 1) {
            document.getElementById('driverCount').value = this.settings.driver_count || 1;
            return;
        }

        try {
            const response = await API.updateCostsSettings(count);
            
            if (response.success) {
                this.settings.driver_count = count;
                this.calculateAndUpdateSummary();
                this.showToast('تم تحديث عدد المناديب', 'success');
            }
        } catch (error) {
            console.error('❌ [CostsApp] Error updating driver count:', error);
            document.getElementById('driverCount').value = this.settings.driver_count || 1;
        }
    },

    // ========================================
    // Delete Item
    // ========================================
    showDeleteModal: function(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        this.itemToDelete = item;
        document.getElementById('deleteItemName').textContent = item.name;
        document.getElementById('deleteModal').classList.add('show');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    hideDeleteModal: function() {
        document.getElementById('deleteModal').classList.remove('show');
        this.itemToDelete = null;
    },

    confirmDelete: async function() {
        if (!this.itemToDelete) return;

        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin:0;"></span>';

        try {
            const response = await API.deleteCostItem(this.itemToDelete.id);

            if (response.success) {
                this.showToast('تم حذف البند بنجاح', 'success');
                this.hideDeleteModal();
                await this.loadItems();
            } else {
                throw new Error(response.message || 'فشل في حذف البند');
            }
        } catch (error) {
            console.error('❌ [CostsApp] Error deleting item:', error);
            this.showToast(error.message || 'حدث خطأ أثناء الحذف', 'error');
        } finally {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i data-lucide="trash-2"></i> نعم، حذف';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    // ========================================
    // Edit Item
    // ========================================
    showEditModal: function(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        this.itemToEdit = item;
        
        document.getElementById('editItemId').value = item.id;
        document.getElementById('editItemName').value = item.name;
        document.getElementById('editItemAmount').value = item.amount;
        document.getElementById('editItemType').value = item.type;
        document.getElementById('editHasVat').checked = item.has_vat === true || item.has_vat === 1;
        document.getElementById('editItemNotes').value = item.notes || '';
        
        this.updateVatCheckStyle('editVatCheckContainer', document.getElementById('editHasVat').checked);
        
        document.getElementById('editModal').classList.add('show');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    hideEditModal: function() {
        document.getElementById('editModal').classList.remove('show');
        this.itemToEdit = null;
    },

    saveEdit: async function() {
        const itemId = document.getElementById('editItemId').value;
        const name = document.getElementById('editItemName').value.trim();
        const amount = parseFloat(document.getElementById('editItemAmount').value);
        const type = document.getElementById('editItemType').value;
        const hasVat = document.getElementById('editHasVat').checked;
        const notes = document.getElementById('editItemNotes').value.trim();

        if (!name) {
            this.showToast('الرجاء إدخال اسم البند', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            this.showToast('الرجاء إدخال مبلغ صحيح', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveEditBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin:0;"></span> جاري الحفظ...';

        try {
            const response = await API.updateCostItem(itemId, name, amount, type, hasVat, notes);

            if (response.success) {
                this.showToast('تم تحديث البند بنجاح', 'success');
                this.hideEditModal();
                await this.loadItems();
            } else {
                throw new Error(response.message || 'فشل في تحديث البند');
            }
        } catch (error) {
            console.error('❌ [CostsApp] Error updating item:', error);
            this.showToast(error.message || 'حدث خطأ أثناء التحديث', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="check"></i> حفظ التعديلات';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    // ========================================
    // Utilities
    // ========================================
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('ar-SA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + ' ر.س';
    },

    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showToast: function(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(t => t.remove());

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };

        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            info: 'info',
            warning: 'alert-triangle'
        };

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 10000;
            border-right: 4px solid ${colors[type]};
            transition: transform 0.3s ease;
        `;

        toast.innerHTML = `
            <i data-lucide="${icons[type]}" style="color: ${colors[type]}; width: 24px; height: 24px;"></i>
            <span style="font-weight: 600; color: #1e293b;">${message}</span>
        `;

        document.body.appendChild(toast);
        
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        // Animate out
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(-100px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Make globally available
window.CostsApp = CostsApp;

// Auto-init if DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CostsApp.init());
} else {
    // Small delay to ensure all elements are ready
    setTimeout(() => CostsApp.init(), 100);
}