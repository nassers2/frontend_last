// ========================================
// Cash Management - Main Script (Updated)
// ========================================

console.log('💵 [CASH] Script loaded');

// Prevent re-declaration
if (typeof window.CashApp !== 'undefined') {
    console.log('⚠️ [CASH] CashApp already loaded, re-initializing...');
    if (window.CashApp.init) {
        window.CashApp.init();
    }
} else {
    window.CashApp = {
        state: {
            currentPeriod: null,
            drivers: [],
            summary: [],
            receipts: [],
            periods: [],
            isSubmitting: false,
            lastSubmitTime: 0
        },

    init: async function() {
        console.log('💵 [CASH] Initializing...');

        // Wait for jQuery and Select2
        await this.waitForLibraries();

        // Load data
        try {
            await this.loadDrivers();
            await this.loadCurrentPeriod();
            await this.loadSummary();
            await this.loadPeriods();
            await this.loadReceipts();
            this.setupEventListeners();

            console.log('✅ [CASH] Initialized successfully');
        } catch (error) {
            console.error('❌ [CASH] Error:', error);
        }
    },

    waitForLibraries: function() {
        return new Promise(resolve => {
            const check = () => {
                if (typeof $ !== 'undefined' && typeof $.fn.select2 !== 'undefined') {
                    console.log('✅ [CASH] Libraries ready');
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    },

  loadDrivers: async function() {
    try {
        console.log('📡 [CASH/DRIVERS] Loading...');

        const response = await API.call('/cash/drivers', 'GET');

        if (response.success && response.drivers) {
            this.state.drivers = response.drivers;
            console.log(`✅ [CASH/DRIVERS] Loaded ${response.drivers.length} drivers`);

            // تحميل السائقين في dropdown النموذج
            const driverSelect = $('#driverId');
            if (driverSelect.length) {
                // تدمير Select2 القديم
                if (driverSelect.data('select2')) {
                    driverSelect.select2('destroy');
                }

                // مسح الخيارات القديمة
                driverSelect.empty();
                
                // إضافة الخيار الافتراضي
                driverSelect.append('<option value="">اختر السائق...</option>');
                
                // إضافة السائقين
                response.drivers.forEach(d => {
                    const driverName = d.name || d.driver_name || d.full_name || ('سائق ' + d.driver_id);
                    driverSelect.append(`<option value="${d.driver_id}">${driverName}</option>`);
                });

                // تفعيل Select2
                driverSelect.select2({
                    placeholder: 'ابحث عن السائق...',
                    allowClear: true,
                    dir: 'rtl',
                    width: '100%',
                    language: {
                        noResults: () => 'لم يتم العثور على نتائج',
                        searching: () => 'جاري البحث...'
                    }
                });
                
                console.log('✅ [CASH] Select2 initialized for driverId');
            }

            // تحميل السائقين في dropdown الفلتر
            const filterDriver = $('#filterDriver');
            if (filterDriver.length) {
                if (filterDriver.data('select2')) {
                    filterDriver.select2('destroy');
                }

                filterDriver.empty();
                filterDriver.append('<option value="">جميع السائقين</option>');
                
                response.drivers.forEach(d => {
                    const driverName = d.name || d.driver_name || d.full_name || ('سائق ' + d.driver_id);
                    filterDriver.append(`<option value="${d.driver_id}">${driverName}</option>`);
                });

                filterDriver.select2({
                    placeholder: 'اختر السائق...',
                    allowClear: true,
                    dir: 'rtl',
                    width: '100%',
                    language: {
                        noResults: () => 'لم يتم العثور على نتائج',
                        searching: () => 'جاري البحث...'
                    }
                });
                
                console.log('✅ [CASH] Select2 initialized for filterDriver');
            }
        } else {
            console.error('❌ [CASH/DRIVERS] Invalid response:', response);
        }
    } catch (error) {
        console.error('❌ [CASH/DRIVERS] Error:', error);
    }
},

    loadCurrentPeriod: async function() {
        try {
            console.log('📡 [CASH/PERIOD] Loading...');
            
            const data = await API.getCurrentPeriod();

            if (data.success && data.period) {
                this.state.currentPeriod = data.period;

                // Update current period total and label
                const currentPeriodTotal = document.getElementById('currentPeriodTotal');
                const currentPeriodLabel = document.getElementById('currentPeriodLabel');
                
                if (currentPeriodTotal) {
                    currentPeriodTotal.textContent = this.formatCurrency(data.period.total_received || 0);
                }
                
                if (currentPeriodLabel) {
                    currentPeriodLabel.textContent = `من ${this.formatDate(data.period.period_start)}`;
                }

                console.log('✅ [CASH/PERIOD] Loaded:', data.period);
            } else {
                this.state.currentPeriod = null;
                
                const currentPeriodTotal = document.getElementById('currentPeriodTotal');
                const currentPeriodLabel = document.getElementById('currentPeriodLabel');
                
                if (currentPeriodTotal) currentPeriodTotal.textContent = '0 ر.س';
                if (currentPeriodLabel) currentPeriodLabel.textContent = 'لا توجد فترة نشطة';
                
                console.log('⚠️ [CASH/PERIOD] No active period');
            }
        } catch (error) {
            console.error('❌ [CASH/PERIOD] Error:', error);
        }
    },

    loadSummary: async function() {
        try {
            console.log('📡 [CASH/SUMMARY] Loading...');

            const container = document.getElementById('summaryTableContainer');
            if (!container) {
                console.warn('⚠️ [CASH/SUMMARY] Container not found');
                return;
            }

            container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';

            const data = await API.getCashSummary();

            console.log('📊 [CASH/SUMMARY] Response:', data);

            if (data.success) {
                this.state.summary = data.summary || [];

                // Update stats (with null checks)
                const statTotalAmount = document.getElementById('statTotalAmount');
                const statReceiptCount = document.getElementById('statReceiptCount');
                
                if (statTotalAmount) {
                    statTotalAmount.textContent = this.formatCurrency(data.total_amount || 0);
                }
                
                if (statReceiptCount) {
                    const totalOps = this.state.summary.reduce((sum, item) => sum + parseInt(item.receipt_count || 0), 0);
                    statReceiptCount.textContent = totalOps;
                }

                if (this.state.summary.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i data-lucide="inbox" style="width: 64px; height: 64px;"></i>
                            <p>لا توجد عمليات استلام</p>
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } else {
                    container.innerHTML = `
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>السائق</th>
                                        <th>رقم الجوال</th>
                                        <th>عدد الإيصالات</th>
                                        <th>إجمالي المبلغ</th>
                                        <th>آخر تسليم</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.state.summary.map(item => `
                                        <tr>
                                            <td>${item.driver_name || '-'}</td>
                                            <td>${item.driver_phone || '-'}</td>
                                            <td>${item.receipt_count || 0}</td>
                                            <td class="amount">${this.formatCurrency(item.total_received)}</td>
                                            <td>${this.formatDate(item.last_receipt_date)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }

                console.log(`✅ [CASH/SUMMARY] Loaded ${this.state.summary.length} items`);
            } else {
                container.innerHTML = `
                    <div class="error-state">
                        <i data-lucide="alert-circle" style="width: 48px; height: 48px;"></i>
                        <p>فشل تحميل البيانات</p>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        } catch (error) {
            console.error('❌ [CASH/SUMMARY] Error:', error);
            const container = document.getElementById('summaryTableContainer');
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

    loadReceipts: async function() {
        try {
            console.log('📡 [CASH/RECEIPTS] Loading...');

            const container = document.getElementById('receiptsTableContainer');
            if (!container) {
                console.warn('⚠️ [CASH/RECEIPTS] Container not found');
                return;
            }

            container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';

            const data = await API.getCashReceipts();

            if (data.success) {
                this.state.receipts = data.receipts || [];

                if (this.state.receipts.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i data-lucide="inbox" style="width: 64px; height: 64px;"></i>
                            <p>لا توجد سجلات</p>
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } else {
                    container.innerHTML = `
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>السائق</th>
                                        <th>المبلغ</th>
                                        <th>الملاحظات</th>
                                        <th>حالة الفترة</th>
                                        <th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.state.receipts.map(r => `
                                        <tr>
                                            <td>${this.formatDateTime(r.receipt_date)}</td>
                                            <td>${r.driver_name || '-'}</td>
                                            <td class="amount">${this.formatCurrency(r.amount)}</td>
                                            <td>${r.notes || '-'}</td>
                                            <td>
                                                <span class="badge ${r.period_status === 'active' ? 'badge-success' : 'badge-secondary'}">
                                                    ${r.period_status === 'active' ? 'نشط' : 'مغلق'}
                                                </span>
                                            </td>
                                            <td>
                                                ${r.period_status === 'active' ? 
                                                    `<button class="btn btn-sm btn-danger" onclick="CashApp.deleteReceipt('${r.id}')">
                                                        <i data-lucide="trash-2"></i>
                                                    </button>` : 
                                                    '<span class="text-muted">-</span>'
                                                }
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }

                console.log(`✅ [CASH/RECEIPTS] Loaded ${this.state.receipts.length} receipts`);
            }
        } catch (error) {
            console.error('❌ [CASH/RECEIPTS] Error:', error);
        }
    },

    loadPeriods: async function() {
        try {
            console.log('📡 [CASH/PERIODS] Loading...');

            const data = await API.getCashPeriods();

            if (data.success && data.periods) {
                this.state.periods = data.periods;

                const filterPeriod = document.getElementById('filterPeriod');
                if (filterPeriod) {
                    filterPeriod.innerHTML = '<option value="">جميع الفترات</option>';
                    data.periods.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id;
                        opt.textContent = `${this.formatDate(p.period_start)} - ${p.period_end ? this.formatDate(p.period_end) : 'نشط'}`;
                        filterPeriod.appendChild(opt);
                    });

                    $(filterPeriod).select2({
                        placeholder: 'اختر الفترة...',
                        allowClear: true,
                        dir: 'rtl'
                    });
                }

                console.log(`✅ [CASH/PERIODS] Loaded ${data.periods.length} periods`);
            }
        } catch (error) {
            console.error('❌ [CASH/PERIODS] Error:', error);
        }
    },

    setupEventListeners: function() {
        console.log('🔧 [CASH] Setting up event listeners...');

        // Receipt form submission
        const receiptForm = document.getElementById('receiptForm');
        if (receiptForm) {
            // Remove existing listeners
            const newForm = receiptForm.cloneNode(true);
            receiptForm.parentNode.replaceChild(newForm, receiptForm);
            
            newForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
            console.log('✅ [CASH] Form listener attached');
        }

        // Close period button
        const closePeriodBtn = document.getElementById('closePeriodBtn');
        if (closePeriodBtn) {
            closePeriodBtn.addEventListener('click', () => this.showClosePeriodModal());
        }

        // Confirm close period
        const confirmCloseBtn = document.getElementById('confirmCloseBtn');
        if (confirmCloseBtn) {
            confirmCloseBtn.addEventListener('click', () => this.closePeriod());
        }

        // Apply filters
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }

        console.log('✅ [CASH] Event listeners setup');
    },

    handleFormSubmit: async function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        const now = Date.now();

        // Prevent double submission
        if (this.state.isSubmitting || (now - this.state.lastSubmitTime) < 2000) {
            console.log('⚠️ [CASH] Duplicate submission prevented');
            return false;
        }

        this.state.isSubmitting = true;
        this.state.lastSubmitTime = now;

        const submitBtn = document.getElementById('submitReceiptBtn');
        const originalText = submitBtn ? submitBtn.textContent : '';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'جاري الحفظ...';
            }

            const driverId = document.getElementById('driverId').value;
            const amount = parseFloat(document.getElementById('amount').value);
            const notes = document.getElementById('notes').value || null;

            console.log('📤 [CASH/SUBMIT] Data:', { driverId, amount, notes });

            const result = await API.createCashReceipt(driverId, amount, null, notes);

            if (result.success) {
                alert('✅ تم حفظ الإيصال بنجاح');
                document.getElementById('receiptForm').reset();
                
                // Reset Select2
                $('#driverId').val(null).trigger('change');
                
                // Reload data
                await this.loadSummary();
                await this.loadReceipts();
                await this.loadCurrentPeriod();

                console.log('✅ [CASH/SUBMIT] Success');
            } else {
                alert('❌ ' + (result.message || 'فشل الحفظ'));
                console.error('❌ [CASH/SUBMIT] Error:', result);
            }
        } catch (error) {
            console.error('❌ [CASH/SUBMIT] Error:', error);
            alert('❌ حدث خطأ في الحفظ: ' + error.message);
        } finally {
            this.state.isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }

        return false;
    },

    showClosePeriodModal: function() {
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.classList.add('show');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    closePeriod: async function() {
        if (!this.state.currentPeriod) {
            alert('لا توجد فترة نشطة');
            return;
        }

        try {
            const result = await API.closeCashPeriod(this.state.currentPeriod.id);

            if (result.success) {
                alert('✅ تم إنهاء الفترة بنجاح');
                document.getElementById('confirmModal').classList.remove('show');
                
                // Reload all data
                await this.init();
            } else {
                alert('❌ ' + (result.message || 'فشل إنهاء الفترة'));
            }
        } catch (error) {
            console.error('❌ [CASH/CLOSE] Error:', error);
            alert('❌ حدث خطأ: ' + error.message);
        }
    },

    deleteReceipt: async function(receiptId) {
        if (!confirm('هل أنت متأكد من حذف هذا الإيصال؟')) {
            return;
        }

        try {
            const result = await API.deleteCashReceipt(receiptId);

            if (result.success) {
                alert('✅ تم حذف الإيصال');
                await this.loadReceipts();
                await this.loadSummary();
                await this.loadCurrentPeriod();
            } else {
                alert('❌ ' + (result.message || 'فشل الحذف'));
            }
        } catch (error) {
            console.error('❌ [CASH/DELETE] Error:', error);
            alert('❌ حدث خطأ: ' + error.message);
        }
    },

    applyFilters: async function() {
        const driverId = document.getElementById('filterDriver').value;
        const periodId = document.getElementById('filterPeriod').value;

        try {
            const container = document.getElementById('receiptsTableContainer');
            container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';

            const data = await API.getCashReceipts(periodId, driverId);

            if (data.success) {
                this.state.receipts = data.receipts || [];
                await this.loadReceipts();
            }
        } catch (error) {
            console.error('❌ [CASH/FILTER] Error:', error);
            alert('❌ حدث خطأ في التصفية');
        }
    },

    formatCurrency: function(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    },

    formatDate: function(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatDateTime: function(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
};


window.CashApp = window.CashApp || {};
// Don't auto-initialize - wait for navigation to call it
console.log('✅ [CASH] Module ready');