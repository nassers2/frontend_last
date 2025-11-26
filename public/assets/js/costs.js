// ========================================
// 💰 Cost Management - Main Script
// ========================================

console.log('💰 [COSTS] Script loaded');

// Prevent re-declaration
if (typeof window.CostsApp !== 'undefined') {
    console.log('⚠️ [COSTS] CostsApp already loaded, re-initializing...');
    if (window.CostsApp.init) {
        window.CostsApp.init();
    }
} else {
    window.CostsApp = {
        state: {
            items: [],
            summary: null,
            settings: { driver_count: 1 },
            isSubmitting: false,
            lastSubmitTime: 0,
            itemToDelete: null,
            itemToEdit: null
        },

        // ========================================
        // 🚀 Initialize
        // ========================================
        init: async function() {
            console.log('💰 [COSTS] Initializing...');

            try {
                // Load data
                await this.loadSettings();
                await this.loadItems();
                await this.loadSummary();
                
                // Setup event listeners
                this.setupEventListeners();

                console.log('✅ [COSTS] Initialized successfully');
            } catch (error) {
                console.error('❌ [COSTS] Initialization error:', error);
            }
        },

        // ========================================
        // 📡 API Calls
        // ========================================
        
        loadSettings: async function() {
            try {
                console.log('📡 [COSTS/SETTINGS] Loading...');
                
                const response = await API.call('/costs/settings', 'GET');
                
                if (response.success && response.settings) {
                    this.state.settings = response.settings;
                    
                    const driverCountInput = document.getElementById('driverCount');
                    if (driverCountInput) {
                        driverCountInput.value = this.state.settings.driver_count || 1;
                    }
                    
                    console.log('✅ [COSTS/SETTINGS] Loaded:', this.state.settings);
                }
            } catch (error) {
                console.error('❌ [COSTS/SETTINGS] Error:', error);
            }
        },

        loadItems: async function() {
            try {
                console.log('📡 [COSTS/ITEMS] Loading...');
                
                const container = document.getElementById('costsTableContainer');
                if (container) {
                    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';
                }
                
                const response = await API.call('/costs/items', 'GET');
                
                if (response.success) {
                    this.state.items = response.items || [];
                    this.renderTable();
                    console.log(`✅ [COSTS/ITEMS] Loaded ${this.state.items.length} items`);
                }
            } catch (error) {
                console.error('❌ [COSTS/ITEMS] Error:', error);
                const container = document.getElementById('costsTableContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="error-state">
                            <i data-lucide="alert-circle" style="width: 48px; height: 48px;"></i>
                            <p>حدث خطأ في تحميل البيانات</p>
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        },

        loadSummary: async function() {
            try {
                console.log('📡 [COSTS/SUMMARY] Loading...');
                
                const response = await API.call('/costs/summary', 'GET');
                
                if (response.success && response.summary) {
                    this.state.summary = response.summary;
                    this.updateStats();
                    console.log('✅ [COSTS/SUMMARY] Loaded:', this.state.summary);
                }
            } catch (error) {
                console.error('❌ [COSTS/SUMMARY] Error:', error);
            }
        },

        // ========================================
        // 🎨 UI Updates
        // ========================================
        
        updateStats: function() {
            const summary = this.state.summary;
            if (!summary) return;
            
            this.updateStatWithAnimation('totalMonthly', this.formatCurrency(summary.total_monthly));
            this.updateStatWithAnimation('totalYearly', this.formatCurrency(summary.total_yearly));
            this.updateStatWithAnimation('costPerDriver', this.formatCurrency(summary.cost_per_driver));
            
            const totalItemsEl = document.getElementById('totalItems');
            if (totalItemsEl) {
                totalItemsEl.textContent = summary.items_count || 0;
            }
        },

        updateStatWithAnimation: function(elementId, value) {
            const el = document.getElementById(elementId);
            if (!el) return;
            
            el.textContent = value;
            el.classList.remove('highlight');
            void el.offsetWidth; // Trigger reflow
            el.classList.add('highlight');
        },

        renderTable: function() {
            const container = document.getElementById('costsTableContainer');
            if (!container) return;

            if (this.state.items.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="inbox"></i>
                        <p>لم يتم إضافة أي بنود بعد</p>
                        <p style="font-size: 0.875rem; margin-top: 0.5rem;">ابدأ بإضافة بنود التكاليف من النموذج</p>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            container.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>البند</th>
                                <th>المبلغ</th>
                                <th>التكرار</th>
                                <th>الشهري</th>
                                <th>ملاحظات</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.state.items.map(item => `
                                <tr data-id="${item.id}">
                                    <td><strong>${this.escapeHtml(item.name)}</strong></td>
                                    <td class="amount">${this.formatCurrency(item.amount)}</td>
                                    <td>
                                        <span class="badge ${item.type === 'monthly' ? 'badge-monthly' : 'badge-yearly'}">
                                            ${item.type === 'monthly' ? 'شهري' : 'سنوي'}
                                        </span>
                                    </td>
                                    <td class="amount" style="color: var(--purple);">
                                        ${this.formatCurrency(item.monthly_amount)}
                                    </td>
                                    <td style="color: var(--gray-500); font-size: 0.875rem;">
                                        ${item.notes ? this.escapeHtml(item.notes) : '-'}
                                    </td>
                                    <td>
                                        <button class="action-btn" onclick="CostsApp.showEditModal('${item.id}')" title="تعديل">
                                            <i data-lucide="edit-2" style="width: 18px; height: 18px;"></i>
                                        </button>
                                        <button class="action-btn danger" onclick="CostsApp.showDeleteModal('${item.id}')" title="حذف">
                                            <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            if (typeof lucide !== 'undefined') lucide.createIcons();
        },

        // ========================================
        // 🎛️ Event Listeners
        // ========================================
        
        setupEventListeners: function() {
            console.log('🔧 [COSTS] Setting up event listeners...');

            // Add form submit
            const costForm = document.getElementById('costForm');
            if (costForm) {
                costForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
                console.log('✅ [COSTS] Form listener attached');
            }

            // Driver count change
            const driverCountInput = document.getElementById('driverCount');
            if (driverCountInput) {
                driverCountInput.addEventListener('change', (e) => this.updateDriverCount(e));
                driverCountInput.addEventListener('input', (e) => this.updateDriverCount(e));
            }

            // Delete modal buttons
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
            }

            const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
            if (cancelDeleteBtn) {
                cancelDeleteBtn.addEventListener('click', () => this.closeModal('deleteModal'));
            }

            // Edit modal buttons
            const saveEditBtn = document.getElementById('saveEditBtn');
            if (saveEditBtn) {
                saveEditBtn.addEventListener('click', () => this.saveEdit());
            }

            const cancelEditBtn = document.getElementById('cancelEditBtn');
            if (cancelEditBtn) {
                cancelEditBtn.addEventListener('click', () => this.closeModal('editModal'));
            }

            // Close modals on outside click
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modal.id);
                    }
                });
            });

            console.log('✅ [COSTS] Event listeners setup complete');
        },

        // ========================================
        // 📝 Form Handlers
        // ========================================
        
        handleFormSubmit: async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            const now = Date.now();

            // Prevent double submission
            if (this.state.isSubmitting || (now - this.state.lastSubmitTime) < 2000) {
                console.log('⚠️ [COSTS] Duplicate submission prevented');
                return false;
            }

            this.state.isSubmitting = true;
            this.state.lastSubmitTime = now;

            const submitBtn = document.querySelector('#costForm button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : '';

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i data-lucide="loader-2" class="spinning"></i> جاري الحفظ...';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }

                const name = document.getElementById('itemName').value.trim();
                const amount = parseFloat(document.getElementById('itemAmount').value);
                const type = document.getElementById('itemType').value;
                const notes = document.getElementById('itemNotes').value.trim();

                console.log('📤 [COSTS/SUBMIT] Data:', { name, amount, type, notes });

                const result = await API.call('/costs/items', 'POST', {
                    name,
                    amount,
                    type,
                    notes: notes || null
                });

                if (result.success) {
                    console.log('✅ [COSTS/SUBMIT] تم حفظ البند بنجاح');
                    
                    // Reset form
                    document.getElementById('costForm').reset();
                    
                    // Reload data
                    await this.loadItems();
                    await this.loadSummary();

                    // Show success feedback
                    this.showToast('تم إضافة البند بنجاح', 'success');
                } else {
                    console.error('❌ [COSTS/SUBMIT] فشل الحفظ:', result.message || result);
                    this.showToast(result.message || 'فشل في إضافة البند', 'error');
                }
            } catch (error) {
                console.error('❌ [COSTS/SUBMIT] حدث خطأ:', error.message);
                this.showToast('حدث خطأ في الحفظ', 'error');
            } finally {
                this.state.isSubmitting = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }

            return false;
        },

        updateDriverCount: async function(e) {
            const count = parseInt(e.target.value) || 1;
            
            if (count < 1) {
                e.target.value = 1;
                return;
            }

            try {
                const result = await API.call('/costs/settings', 'PUT', {
                    driver_count: count
                });

                if (result.success) {
                    this.state.settings.driver_count = count;
                    await this.loadSummary();
                    console.log('✅ [COSTS] Driver count updated:', count);
                }
            } catch (error) {
                console.error('❌ [COSTS] Error updating driver count:', error);
            }
        },

        // ========================================
        // 🗑️ Delete Operations
        // ========================================
        
        showDeleteModal: function(id) {
            this.state.itemToDelete = id;
            const item = this.state.items.find(i => i.id === id);
            
            const deleteItemName = document.getElementById('deleteItemName');
            if (deleteItemName && item) {
                deleteItemName.textContent = item.name;
            }
            
            this.openModal('deleteModal');
        },

        confirmDelete: async function() {
            if (!this.state.itemToDelete) return;

            const deleteBtn = document.getElementById('confirmDeleteBtn');
            const originalText = deleteBtn ? deleteBtn.innerHTML : '';

            try {
                if (deleteBtn) {
                    deleteBtn.disabled = true;
                    deleteBtn.innerHTML = '<i data-lucide="loader-2" class="spinning"></i> جاري الحذف...';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }

                const result = await API.call(`/costs/items/${this.state.itemToDelete}`, 'DELETE');

                if (result.success) {
                    console.log('✅ [COSTS] تم حذف البند');
                    
                    this.closeModal('deleteModal');
                    this.state.itemToDelete = null;
                    
                    await this.loadItems();
                    await this.loadSummary();
                    
                    this.showToast('تم حذف البند بنجاح', 'success');
                } else {
                    console.error('❌ [COSTS] فشل الحذف:', result.message);
                    this.showToast(result.message || 'فشل في حذف البند', 'error');
                }
            } catch (error) {
                console.error('❌ [COSTS/DELETE] حدث خطأ:', error.message);
                this.showToast('حدث خطأ في الحذف', 'error');
            } finally {
                if (deleteBtn) {
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = originalText;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        },

        // ========================================
        // ✏️ Edit Operations
        // ========================================
        
        showEditModal: function(id) {
            const item = this.state.items.find(i => i.id === id);
            if (!item) return;

            this.state.itemToEdit = id;
            
            document.getElementById('editItemId').value = id;
            document.getElementById('editItemName').value = item.name;
            document.getElementById('editItemAmount').value = item.amount;
            document.getElementById('editItemType').value = item.type;
            document.getElementById('editItemNotes').value = item.notes || '';

            this.openModal('editModal');
        },

        saveEdit: async function() {
            if (!this.state.itemToEdit) return;

            const saveBtn = document.getElementById('saveEditBtn');
            const originalText = saveBtn ? saveBtn.innerHTML : '';

            try {
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = '<i data-lucide="loader-2" class="spinning"></i> جاري الحفظ...';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }

                const name = document.getElementById('editItemName').value.trim();
                const amount = parseFloat(document.getElementById('editItemAmount').value);
                const type = document.getElementById('editItemType').value;
                const notes = document.getElementById('editItemNotes').value.trim();

                const result = await API.call(`/costs/items/${this.state.itemToEdit}`, 'PUT', {
                    name,
                    amount,
                    type,
                    notes: notes || null
                });

                if (result.success) {
                    console.log('✅ [COSTS] تم تحديث البند');
                    
                    this.closeModal('editModal');
                    this.state.itemToEdit = null;
                    
                    await this.loadItems();
                    await this.loadSummary();
                    
                    this.showToast('تم تحديث البند بنجاح', 'success');
                } else {
                    console.error('❌ [COSTS] فشل التحديث:', result.message);
                    this.showToast(result.message || 'فشل في تحديث البند', 'error');
                }
            } catch (error) {
                console.error('❌ [COSTS/EDIT] حدث خطأ:', error.message);
                this.showToast('حدث خطأ في التحديث', 'error');
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        },

        // ========================================
        // 🛠️ Utilities
        // ========================================
        
        formatCurrency: function(amount) {
            return new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount || 0) + ' ر.س';
        },

        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        openModal: function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('show');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        },

        closeModal: function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('show');
            }
            
            // Reset state
            if (modalId === 'deleteModal') {
                this.state.itemToDelete = null;
            } else if (modalId === 'editModal') {
                this.state.itemToEdit = null;
            }
        },

        showToast: function(message, type = 'info') {
            // Create toast element
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
                <span>${message}</span>
            `;
            
            // Add styles if not exists
            if (!document.getElementById('toast-styles')) {
                const styles = document.createElement('style');
                styles.id = 'toast-styles';
                styles.textContent = `
                    .toast {
                        position: fixed;
                        bottom: 2rem;
                        left: 50%;
                        transform: translateX(-50%);
                        padding: 1rem 1.5rem;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        font-weight: 600;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 10000;
                        animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s;
                    }
                    .toast-success {
                        background: #10b981;
                        color: white;
                    }
                    .toast-error {
                        background: #ef4444;
                        color: white;
                    }
                    .toast-info {
                        background: #3b82f6;
                        color: white;
                    }
                    .toast i {
                        width: 20px;
                        height: 20px;
                    }
                    @keyframes toastIn {
                        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                        to { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                    @keyframes toastOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                    .spinning {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            document.body.appendChild(toast);
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            // Remove after 3 seconds
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
    };
}

console.log('✅ [COSTS] Module ready');