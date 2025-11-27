/* =============================
   Payroll Management JavaScript
   Version: 9.0 - Preview Mode
   
   التغييرات:
   ✅ حساب الرواتب = عرض فقط (بدون حفظ)
   ✅ إصدار التقرير = حفظ في قاعدة البيانات
   ✅ جميع التحسينات السابقة
============================= */

(function() {
  'use strict';

  /* =============================
     API Configuration
  ============================= */
  const API_BASE_URL = 'https://api.flemaster.com/api/payroll';
  const GROUPS_API_URL = 'https://api.flemaster.com/api/groups';

  /* =============================
     DOM Elements Cache
  ============================= */
  const DOM = {
    elements: {},
    
    init() {
      this.elements = {
        // Settings
        settingsContainer: document.getElementById('settings-container'),
        toggleIcon: document.getElementById('toggle-icon'),
        toggleText: document.getElementById('toggle-text'),
        calculationType: document.getElementById('calculation-type'),
        baseSalary: document.getElementById('base-salary'),
        targetOrders: document.getElementById('target-orders'),
        targetBonus: document.getElementById('target-bonus'),
        orderValueDefault: document.getElementById('order-value-default'),
        orderValueAfterTarget: document.getElementById('order-value-after-target'),
        accountCost: document.getElementById('account-cost'),
        targetOrdersGroup: document.getElementById('target-orders-group'),
        freelancerGroup: document.getElementById('freelancer-group'),
        calcCardTarget: document.getElementById('calc-card-target'),
        calcCardFreelancer: document.getElementById('calc-card-freelancer'),
        
        // Filters
        payrollStartDate: document.getElementById('payroll-start-date'),
        payrollEndDate: document.getElementById('payroll-end-date'),
        groupFilter: document.getElementById('group-filter'),
        statusFilter: document.getElementById('status-filter'),
        
        // Content
        payrollTableContent: document.getElementById('payroll-table-content'),
        payrollStats: document.getElementById('payroll-stats'),
        approveAllBtn: document.getElementById('approve-all-btn'),
        
        // Stats
        statDrivers: document.getElementById('stat-drivers'),
        statOrders: document.getElementById('stat-orders'),
        statDelivery: document.getElementById('stat-delivery'),
        statTips: document.getElementById('stat-tips'),
        statBonuses: document.getElementById('stat-bonuses'),
        statPenalties: document.getElementById('stat-penalties'),
        statCash: document.getElementById('stat-cash'),
        statAdvance: document.getElementById('stat-advance'),
        statNet: document.getElementById('stat-net'),
        
        // Modals
        advanceModal: document.getElementById('advance-modal'),
        advanceModalDriver: document.getElementById('advance-modal-driver'),
        advanceModalMax: document.getElementById('advance-modal-max'),
        advanceModalInput: document.getElementById('advance-modal-input'),
        approveModal: document.getElementById('approve-modal'),
        approveModalCount: document.getElementById('approve-modal-count'),
        approveModalTotal: document.getElementById('approve-modal-total'),
        approveModalAdvance: document.getElementById('approve-modal-advance'),
      };
    },
    
    get(id) {
      return this.elements[id] || document.getElementById(id);
    }
  };

  /* =============================
     Utilities
  ============================= */
  function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const LoadingState = {
    buttons: new Map(),
    
    start(button, loadingText = 'جاري...') {
      if (!button || this.buttons.has(button)) return;
      
      this.buttons.set(button, {
        originalHTML: button.innerHTML,
        originalDisabled: button.disabled
      });
      
      button.disabled = true;
      button.innerHTML = `<div class="loading-spinner" style="width:18px; height:18px; border-width:2px; display:inline-block; vertical-align:middle;"></div> ${loadingText}`;
    },
    
    stop(button) {
      if (!button || !this.buttons.has(button)) return;
      
      const state = this.buttons.get(button);
      button.innerHTML = state.originalHTML;
      button.disabled = state.originalDisabled;
      this.buttons.delete(button);
    }
  };

  const ErrorHandler = {
    handle(error, context = '') {
      console.error(`❌ [${context}] Error:`, error);
      
      let message = 'حدث خطأ غير متوقع';
      
      if (error.message) {
        if (error.message.includes('401')) {
          message = 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى';
        } else if (error.message.includes('403')) {
          message = 'ليس لديك صلاحية لهذا الإجراء';
        } else if (error.message.includes('404')) {
          message = 'البيانات المطلوبة غير موجودة';
        } else if (error.message.includes('500')) {
          message = 'خطأ في الخادم، يرجى المحاولة لاحقاً';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          message = 'تعذر الاتصال بالخادم، تحقق من الاتصال بالإنترنت';
        } else {
          message = error.message;
        }
      }
      
      showNotification(`❌ ${message}`, 'error');
      return message;
    },
    
    log(error, context = '') {
      console.error(`❌ [${context}] Error:`, error);
    }
  };

  function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /* =============================
     API
  ============================= */
  const API = {
    async request(url, options = {}) {
      const response = await fetch(url, {
        ...options,
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },

    getPayrollSettings() {
      return this.request(`${API_BASE_URL}/settings`);
    },

    updatePayrollSettings(settings) {
      return this.request(`${API_BASE_URL}/settings`, {
        method: 'POST',
        body: JSON.stringify(settings)
      });
    },

    // 🆕 Preview - حساب بدون حفظ
    previewPayroll(startDate, endDate, groupId = 'all') {
      return this.request(`${API_BASE_URL}/preview`, {
        method: 'POST',
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          group_id: groupId
        })
      });
    },

    // 🆕 Save - حفظ الرواتب
    savePayroll(records) {
      return this.request(`${API_BASE_URL}/save`, {
        method: 'POST',
        body: JSON.stringify({ records })
      });
    },

    getPayrollRecords(startDate, endDate, driverId = null, status = null) {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (status) params.append('status', status);
      
      return this.request(`${API_BASE_URL}/records?${params.toString()}`);
    },

    updatePayrollStatus(id, status) {
      return this.request(`${API_BASE_URL}/record/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    },

    getGroups() {
      return this.request(GROUPS_API_URL);
    }
  };

  /* =============================
     State
  ============================= */
  let currentRecords = [];
  let isPreviewMode = false; // 🆕 هل البيانات معاينة أم محفوظة؟
  let currentAdvanceModal = {
    recordId: null,
    driverIndex: null,
    maxAmount: 0,
    driverName: ''
  };

  /* =============================
     Constants & Formatters
  ============================= */
  const STATUS_MAP = {
    preview:  { label: 'معاينة',  icon: '👁️', class: 'status-draft' },
    draft:    { label: 'مسودة',  icon: '📝', class: 'status-draft' },
    approved: { label: 'معتمد',  icon: '✅', class: 'status-approved' },
    paid:     { label: 'مدفوع',  icon: '💵', class: 'status-paid' },
  };
  const S = (s) => STATUS_MAP[s] || STATUS_MAP.draft;

  const toNumber = (v) => Number(v) || 0;
  
  const numberFormatter = new Intl.NumberFormat('en-US');
  const currencyFormatter = new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
  const dateFormatter = new Intl.DateTimeFormat('en-GB', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  const formatNumber = (n) => numberFormatter.format(n);
  const formatCurrency = (a) => currencyFormatter.format(a) + ' ر.س';

  function formatDate(dateStr, { variant = 'ui' } = {}) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (variant === 'csv') {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
    return dateFormatter.format(d);
  }

  function getStatusBadge(status) {
    const s = S(status);
    return `<span class="status-badge ${s.class}">${s.icon} ${s.label}</span>`;
  }

  function statusLabelAr(status) { return S(status).label; }

  function spinnerHTML(message, subMessage) {
    return `
      <div style="text-align:center; padding:40px;">
        <div class="loading-spinner"></div>
        <p style="margin-top:16px; color:#64748b;">${message}</p>
        ${subMessage ? `<p style="font-size:12px; color:#94a3b8; margin-top:8px;">${subMessage}</p>` : ''}
      </div>
    `;
  }

  function showNotification(message, type = 'success') {
    const existing = document.querySelector('.payroll-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'payroll-notification';
    const bgColor = type === 'success' ? '#dcfce7' : '#fee2e2';
    const borderColor = type === 'success' ? '#166534' : '#991b1b';
    const textColor = type === 'success' ? '#166534' : '#991b1b';
    notification.style.cssText = `position:fixed; top:20px; left:50%; transform:translateX(-50%); background:${bgColor}; border:2px solid ${borderColor}; color:${textColor}; padding:16px 24px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:10000; font-weight:600; transition: opacity 0.3s;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function setSettingsVisibility(open) {
    const c = DOM.get('settingsContainer');
    const icon = DOM.get('toggleIcon');
    const text = DOM.get('toggleText');
    if (!c || !icon || !text) return;
    c.style.display = open ? 'block' : 'none';
    icon.textContent = open ? '▲' : '▼';
    text.textContent = open ? 'إخفاء' : 'إظهار';
  }

  function validatePeriod() {
    const start = DOM.get('payrollStartDate')?.value;
    const end = DOM.get('payrollEndDate')?.value;
    if (!start || !end) return { ok: false, error: '⚠️ الرجاء اختيار الفترة الزمنية' };
    if (new Date(start) > new Date(end)) return { ok: false, error: '⚠️ تاريخ البداية يجب أن يكون قبل تاريخ النهاية' };
    return { ok: true, start, end };
  }

  function sumBy(records, key) {
    return records.reduce((sum, r) => sum + toNumber(r[key]), 0);
  }

  // 🆕 إظهار/إخفاء زر الإصدار بناءً على وضع المعاينة
  function toggleApproveAllButton() {
    const btn = DOM.get('approveAllBtn');
    if (!btn) return;
    // يظهر فقط في وضع المعاينة وإذا كان هناك سجلات
    btn.style.display = (isPreviewMode && currentRecords.length > 0) ? 'block' : 'none';
  }

  function getStatusLabel(status) {
    const labels = {
      'preview': 'معاينة',
      'draft': 'مسودة',
      'approved': 'معتمد',
      'paid': 'مدفوع'
    };
    return labels[status] || status;
  }

  /* =============================
     Settings
  ============================= */
  window.toggleSettings = function() {
    const c = DOM.get('settingsContainer');
    if (!c) return;
    const willOpen = c.style.display === 'none';
    setSettingsVisibility(willOpen);
    if (willOpen) {
      loadSettings();
    }
  };

  async function loadGroups() {
    try {
      const result = await API.getGroups();
      if (result.success && result.groups) {
        const groupFilter = DOM.get('groupFilter');
        if (!groupFilter) return;

        groupFilter.innerHTML = '<option value="all">جميع المناديب</option>';

        const fragment = document.createDocumentFragment();
        result.groups.forEach(group => {
          const option = document.createElement('option');
          option.value = group.id;
          option.textContent = `${group.group_name} (${group.members_count})`;
          fragment.appendChild(option);
        });
        groupFilter.appendChild(fragment);
      }
    } catch (err) {
      ErrorHandler.log(err, 'GROUPS');
    }
  }

  window.onCalculationTypeChange = function() {
    const calcType = DOM.get('calculationType')?.value;
    
    const targetOrdersGroup = DOM.get('targetOrdersGroup');
    const freelancerGroup = DOM.get('freelancerGroup');
    
    if (targetOrdersGroup) targetOrdersGroup.style.display = 'none';
    if (freelancerGroup) freelancerGroup.style.display = 'none';
    
    DOM.get('calcCardTarget')?.classList.remove('active');
    DOM.get('calcCardFreelancer')?.classList.remove('active');
    
    if (calcType === 'target_orders') {
      if (targetOrdersGroup) targetOrdersGroup.style.display = 'block';
      DOM.get('calcCardTarget')?.classList.add('active');
    } else if (calcType === 'freelancer') {
      if (freelancerGroup) freelancerGroup.style.display = 'block';
      DOM.get('calcCardFreelancer')?.classList.add('active');
    }
  };
  
  window.selectCalculationType = function(type) {
    const calcType = DOM.get('calculationType');
    if (calcType) {
      calcType.value = type;
      window.onCalculationTypeChange();
    }
  };

  async function loadSettings() {
    try {
      const result = await API.getPayrollSettings();
      if (result.success && result.settings) {
        const s = result.settings;
        
        const calcType = DOM.get('calculationType');
        if (calcType) {
          calcType.value = s.calculation_type || 'target_orders';
          window.onCalculationTypeChange();
        }
        
        const baseSalary = DOM.get('baseSalary');
        if (baseSalary) baseSalary.value = s.base_salary || 0;
        
        const targetOrders = DOM.get('targetOrders');
        const targetBonus = DOM.get('targetBonus');
        const orderValueDefault = DOM.get('orderValueDefault');
        const orderValueAfterTarget = DOM.get('orderValueAfterTarget');
        
        if (targetOrders) targetOrders.value = s.target_orders || 0;
        if (targetBonus) targetBonus.value = s.target_bonus || 0;
        if (orderValueDefault) orderValueDefault.value = s.order_value_default || 4.4;
        if (orderValueAfterTarget) orderValueAfterTarget.value = s.order_value_after_target || 4.4;
        
        const accountCost = DOM.get('accountCost');
        if (accountCost) accountCost.value = s.account_cost || 0;

        setSettingsVisibility(true);
      }
    } catch (err) {
      if (!err.message?.includes('404')) {
        ErrorHandler.handle(err, 'SETTINGS LOAD');
      }
    }
  }

  window.saveSettings = debounce(async function() {
    const payload = {
      calculation_type: DOM.get('calculationType')?.value,
      base_salary: DOM.get('baseSalary')?.value,
      target_orders: DOM.get('targetOrders')?.value,
      target_bonus: DOM.get('targetBonus')?.value,
      order_value_default: DOM.get('orderValueDefault')?.value,
      order_value_after_target: DOM.get('orderValueAfterTarget')?.value,
      account_cost: DOM.get('accountCost')?.value
    };

    const saveBtn = document.querySelector('[onclick="saveSettings()"]');
    
    try {
      LoadingState.start(saveBtn, 'جاري الحفظ...');
      
      const result = await API.updatePayrollSettings(payload);
      if (result.success) {
        showNotification('✅ تم حفظ الإعدادات بنجاح', 'success');
      } else {
        showNotification('❌ فشل حفظ الإعدادات', 'error');
      }
    } catch (err) {
      ErrorHandler.handle(err, 'SETTINGS SAVE');
    } finally {
      LoadingState.stop(saveBtn);
    }
  }, 500);

  /* =============================
     🆕 Payroll Preview (بدون حفظ)
  ============================= */
  window.fetchPayrollData = debounce(async function() {
    const { ok, error, start, end } = validatePeriod();
    if (!ok) return showNotification(error, 'error');

    const groupId = DOM.get('groupFilter')?.value || 'all';
    const tableContent = DOM.get('payrollTableContent');
    const statsEl = DOM.get('payrollStats');
    const approveBtn = DOM.get('approveAllBtn');
    
    const calcBtn = document.querySelector('[onclick="fetchPayrollData()"]');

    if (!tableContent) return;

    if (statsEl) statsEl.style.display = 'none';
    if (approveBtn) approveBtn.style.display = 'none';
    
    const groupText = groupId === 'all' ? 'جميع المناديب' : 'المجموعة المحددة';
    tableContent.innerHTML = spinnerHTML(`جاري حساب الرواتب لـ ${groupText}...`, 'يتم الحساب بدون حفظ');

    try {
      LoadingState.start(calcBtn, 'جاري الحساب...');
      
      // 🆕 استخدام Preview بدلاً من Calculate
      const result = await API.previewPayroll(start, end, groupId);

      if (result.success) {
        currentRecords = result.records || [];
        isPreviewMode = true; // 🆕 نحن في وضع المعاينة
        
        console.log(`✅ [PREVIEW] Calculated ${currentRecords.length} records (NOT SAVED)`);
        
        if (currentRecords.length === 0) {
          tableContent.innerHTML = `<p style="text-align:center; padding:40px; color:#64748b;">لا توجد بيانات لهذه الفترة<br><small style="color:#94a3b8; margin-top:8px;">تأكد من وجود بيانات للمناديب في هذه الفترة</small></p>`;
        } else {
          showNotification(`✅ تم حساب رواتب ${currentRecords.length} مناديب (معاينة)`, 'success');
          renderPayrollTable(currentRecords);
          updateStats(currentRecords);
          toggleApproveAllButton();
        }
      } else {
        const errorMsg = result.error || result.message || 'فشل في حساب الرواتب';
        showNotification('❌ ' + errorMsg, 'error');
        tableContent.innerHTML = `<p style="text-align:center; padding:40px; color:#ef4444;">فشل في حساب الرواتب</p>`;
      }
    } catch (err) {
      const errorMsg = ErrorHandler.handle(err, 'PREVIEW');
      tableContent.innerHTML = `<p style="text-align:center; padding:40px; color:#ef4444;">حدث خطأ أثناء حساب الرواتب</p>`;
    } finally {
      LoadingState.stop(calcBtn);
    }
  }, 500);

  /* =============================
     Load Saved Records
  ============================= */
  async function loadPayrollRecords() {
    const { ok, error, start, end } = validatePeriod();
    if (!ok) return showNotification(error, 'error');

    const statusFilter = DOM.get('statusFilter')?.value || 'all';
    const tableContent = DOM.get('payrollTableContent');

    if (!tableContent) return;

    tableContent.innerHTML = spinnerHTML('جاري تحميل السجلات...', '');

    try {
      const result = await API.getPayrollRecords(
        start, 
        end, 
        null, 
        statusFilter === 'all' ? null : statusFilter
      );

      if (result.success) {
        currentRecords = result.records || [];
        isPreviewMode = false; // 🆕 هذه سجلات محفوظة
        
        if (currentRecords.length === 0) {
          const statusText = statusFilter !== 'all' ? ` بحالة "${getStatusLabel(statusFilter)}"` : '';
          tableContent.innerHTML = `<p style="text-align:center; padding:40px; color:#64748b;">لا توجد سجلات رواتب لهذه الفترة${statusText}<br><small style="color:#94a3b8; margin-top:8px;">جرب الضغط على "حساب الرواتب" لإنشاء المعاينة</small></p>`;
        } else {
          renderPayrollTable(currentRecords);
          updateStats(currentRecords);
          toggleApproveAllButton();
        }
      } else {
        showNotification('❌ فشل في تحميل السجلات', 'error');
      }
    } catch (err) {
      ErrorHandler.handle(err, 'LOAD');
    }
  }

  window.filterByStatus = function() {
    loadPayrollRecords();
  };

  window.loadPayrollRecords = loadPayrollRecords;

  /* =============================
     Render Table
  ============================= */
  function buildTableRow(record, index) {
    const advanceDeduction = toNumber(record.advance_deduction);
    const hasAdvance = advanceDeduction > 0;
    const isPreview = record.status === 'preview';
    
    let advanceCell;
    if (isPreview && hasAdvance) {
      // 🆕 في وضع المعاينة - نستخدم index بدلاً من id
      advanceCell = `
        <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
          <select 
            class="advance-action-select" 
            data-index="${index}"
            data-max="${advanceDeduction}"
            style="width: 120px; padding: 6px 8px; border: 2px solid #e2e8f0; border-radius: 6px; font-weight: 600; font-size: 12px; background: white; cursor: pointer;"
          >
            <option value="full">خصم كامل</option>
            <option value="postpone">تأجيل</option>
            <option value="custom">تعديل المبلغ</option>
          </select>
          <div class="advance-amount-display" data-index="${index}" style="color: #dc2626; font-weight: 700; font-size: 13px;">
            ${formatCurrency(advanceDeduction)}
          </div>
        </div>
      `;
    } else if (hasAdvance) {
      advanceCell = `<span style="color: #dc2626; font-weight: 700;">${formatCurrency(advanceDeduction)}</span>`;
    } else {
      advanceCell = '<span style="color: #64748b;">-</span>';
    }
    
    return `
    <tr data-index="${index}">
      <td style="text-align:right;">
        <div style="font-weight:600; color:#1e293b;">${record.driver_name || 'غير محدد'}</div>
        <small style="color:#64748b; display:block; margin-top:4px;">${record.driver_phone || 'غير متوفر'}</small>
      </td>
      <td>
        <div style="font-size:13px; color:#475569;">${formatDate(record.period_start)}</div>
        <div style="font-size:13px; color:#475569;">إلى ${formatDate(record.period_end)}</div>
      </td>
      <td>${formatNumber(toNumber(record.total_orders))}</td>
      <td>${formatCurrency(toNumber(record.total_delivery_price))}</td>
      <td>${formatCurrency(toNumber(record.total_tips))}</td>
      <td>${formatCurrency(toNumber(record.total_bonuses))}</td>
      <td>${formatCurrency(toNumber(record.total_penalties))}</td>
      <td>${formatCurrency(toNumber(record.total_debit))}</td>
      <td>${formatCurrency(toNumber(record.total_credit))}</td>
      <td>${formatCurrency(toNumber(record.total_cash))}</td>
      <td>${formatCurrency(toNumber(record.total_cash_received))}</td>
      <td style="padding: 8px;">
        ${advanceCell}
      </td>
      <td>${formatCurrency(toNumber(record.gross_salary))}</td>
      <td style="font-weight:700; color:#059669;" class="net-salary-cell" data-index="${index}">${formatCurrency(toNumber(record.net_salary))}</td>
      <td>${getStatusBadge(record.status)}</td>
    </tr>
  `;
  }

  function renderPayrollTable(records) {
    const rows = records.map((record, index) => buildTableRow(record, index)).join('');

    const html = `
      <div style="overflow-x:auto;">
        <table id="payroll-table">
          <thead>
            <tr>
              <th style="min-width:180px;">المندوب</th>
              <th>الفترة</th>
              <th>الطلبات</th>
              <th>سعر التوصيل</th>
              <th>الإكراميات</th>
              <th>المكافآت</th>
              <th>الغرامات</th>
              <th>المدين</th>
              <th>الدائن</th>
              <th>النقد</th>
              <th>كاش مستلم</th>
              <th style="color:#dc2626; min-width: 140px;">خصم السلفة</th>
              <th>الإجمالي</th>
              <th>الصافي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    const tableContent = DOM.get('payrollTableContent');
    if (tableContent) {
      tableContent.innerHTML = html;
      setupTableEventDelegation();
    }
  }

  function setupTableEventDelegation() {
    const table = document.getElementById('payroll-table');
    if (!table) return;
    
    table.removeEventListener('change', handleTableChange);
    table.addEventListener('change', handleTableChange);
  }
  
  function handleTableChange(event) {
    const target = event.target;
    
    if (target.classList.contains('advance-action-select')) {
      const index = parseInt(target.dataset.index);
      const maxAmount = parseFloat(target.dataset.max);
      const action = target.value;
      
      handleAdvanceAction(index, action, maxAmount);
    }
  }

  function updateStats(records) {
    requestAnimationFrame(() => {
      const updates = {
        statDrivers: formatNumber(records.length),
        statOrders: formatNumber(sumBy(records, 'total_orders')),
        statDelivery: formatCurrency(sumBy(records, 'total_delivery_price')),
        statTips: formatCurrency(sumBy(records, 'total_tips')),
        statBonuses: formatCurrency(sumBy(records, 'total_bonuses')),
        statPenalties: formatCurrency(sumBy(records, 'total_penalties')),
        statCash: formatCurrency(sumBy(records, 'total_cash')),
        statAdvance: formatCurrency(sumBy(records, 'advance_deduction')),
        statNet: formatCurrency(sumBy(records, 'net_salary'))
      };

      Object.entries(updates).forEach(([key, value]) => {
        const el = DOM.get(key);
        if (el) el.textContent = value;
      });

      const statsEl = DOM.get('payrollStats');
      if (statsEl) statsEl.style.display = 'grid';
    });
  }

  /* =============================
     Advance Deduction Handlers (Preview Mode)
  ============================= */
  function handleAdvanceAction(index, action, maxAmount) {
    if (action === 'custom') {
      const record = currentRecords[index];
      currentAdvanceModal = {
        driverIndex: index,
        maxAmount: maxAmount,
        driverName: record?.driver_name || 'المندوب'
      };
      
      const modalDriver = DOM.get('advanceModalDriver');
      const modalMax = DOM.get('advanceModalMax');
      const modalInput = DOM.get('advanceModalInput');
      const modal = DOM.get('advanceModal');
      
      if (modalDriver) modalDriver.textContent = currentAdvanceModal.driverName;
      if (modalMax) modalMax.textContent = formatCurrency(maxAmount);
      if (modalInput) {
        modalInput.value = maxAmount;
        modalInput.max = maxAmount;
      }
      if (modal) modal.classList.add('active');
      if (modalInput) modalInput.focus();
      return;
    }
    
    const amountDisplay = document.querySelector(`.advance-amount-display[data-index="${index}"]`);
    const netSalaryCell = document.querySelector(`.net-salary-cell[data-index="${index}"]`);
    
    if (!amountDisplay || !netSalaryCell) return;
    
    const record = currentRecords[index];
    const grossSalary = toNumber(record.gross_salary);
    const originalAdvance = toNumber(record.advance_deduction);
    
    let newAdvanceAmount = originalAdvance;
    
    if (action === 'full') {
      newAdvanceAmount = originalAdvance;
      amountDisplay.textContent = formatCurrency(originalAdvance);
      amountDisplay.style.color = '#dc2626';
    } else if (action === 'postpone') {
      newAdvanceAmount = 0;
      amountDisplay.textContent = 'مؤجل';
      amountDisplay.style.color = '#64748b';
    }
    
    // 🆕 تحديث في الـ state مباشرة (بدون API)
    record.advance_deduction = newAdvanceAmount;
    record.net_salary = grossSalary - newAdvanceAmount;
    
    netSalaryCell.textContent = formatCurrency(record.net_salary);
    updateStats(currentRecords);
  }
  
  window.handleAdvanceAction = handleAdvanceAction;
  
  window.closeAdvanceModal = function() {
    const modal = DOM.get('advanceModal');
    if (modal) modal.classList.remove('active');
    
    if (currentAdvanceModal.driverIndex !== null) {
      const select = document.querySelector(`.advance-action-select[data-index="${currentAdvanceModal.driverIndex}"]`);
      if (select) select.value = 'full';
    }
    currentAdvanceModal = { driverIndex: null, maxAmount: 0, driverName: '' };
  };
  
  window.confirmAdvanceAmount = function() {
    const input = DOM.get('advanceModalInput');
    const amount = parseFloat(input?.value);
    
    if (isNaN(amount) || amount < 0) {
      showNotification('⚠️ الرجاء إدخال قيمة صحيحة', 'error');
      return;
    }
    
    if (amount > currentAdvanceModal.maxAmount) {
      showNotification(`⚠️ المبلغ يجب ألا يتجاوز ${formatCurrency(currentAdvanceModal.maxAmount)}`, 'error');
      return;
    }
    
    const index = currentAdvanceModal.driverIndex;
    const amountDisplay = document.querySelector(`.advance-amount-display[data-index="${index}"]`);
    const netSalaryCell = document.querySelector(`.net-salary-cell[data-index="${index}"]`);
    
    if (!amountDisplay || !netSalaryCell) {
      window.closeAdvanceModal();
      return;
    }
    
    const record = currentRecords[index];
    const grossSalary = toNumber(record.gross_salary);
    
    // 🆕 تحديث في الـ state
    record.advance_deduction = amount;
    record.net_salary = grossSalary - amount;
    
    amountDisplay.textContent = amount > 0 ? formatCurrency(amount) : 'مؤجل';
    amountDisplay.style.color = amount > 0 ? '#dc2626' : '#64748b';
    netSalaryCell.textContent = formatCurrency(record.net_salary);
    
    updateStats(currentRecords);
    
    const modal = DOM.get('advanceModal');
    if (modal) modal.classList.remove('active');
    currentAdvanceModal = { driverIndex: null, maxAmount: 0, driverName: '' };
  };

  /* =============================
     🆕 Save Payroll (إصدار التقرير)
  ============================= */
  window.showApproveModal = function() {
    if (!currentRecords.length) {
      showNotification('⚠️ لا توجد سجلات لإصدار التقرير', 'error');
      return;
    }
    
    if (!isPreviewMode) {
      showNotification('⚠️ هذه السجلات محفوظة مسبقاً', 'error');
      return;
    }
    
    const totalNet = sumBy(currentRecords, 'net_salary');
    const totalAdvance = sumBy(currentRecords, 'advance_deduction');
    
    const modalCount = DOM.get('approveModalCount');
    const modalTotal = DOM.get('approveModalTotal');
    const modalAdvance = DOM.get('approveModalAdvance');
    
    if (modalCount) modalCount.textContent = currentRecords.length;
    if (modalTotal) modalTotal.textContent = formatCurrency(totalNet);
    if (modalAdvance) modalAdvance.textContent = formatCurrency(totalAdvance);
    
    const modal = DOM.get('approveModal');
    if (modal) modal.classList.add('active');
  };
  
  window.closeApproveModal = function() {
    const modal = DOM.get('approveModal');
    if (modal) modal.classList.remove('active');
  };
  
  window.confirmApproveAll = async function() {
    window.closeApproveModal();
    await savePayrollRecords();
  };
  
  // 🆕 حفظ الرواتب في قاعدة البيانات
  async function savePayrollRecords() {
    if (!currentRecords.length || !isPreviewMode) return;

    const approveBtn = DOM.get('approveAllBtn');
    if (!approveBtn) return;

    try {
      LoadingState.start(approveBtn, 'جاري الحفظ...');

      const result = await API.savePayroll(currentRecords);

      if (result.success) {
        showNotification(`✅ تم حفظ ${result.data.total} رواتب بنجاح`, 'success');
        
        // تحديث السجلات المحلية
        currentRecords = result.records || currentRecords;
        isPreviewMode = false;
        
        // إعادة عرض الجدول
        renderPayrollTable(currentRecords);
        updateStats(currentRecords);
        toggleApproveAllButton();
      } else {
        showNotification('❌ فشل في حفظ الرواتب', 'error');
      }
    } catch (err) {
      ErrorHandler.handle(err, 'SAVE');
    } finally {
      LoadingState.stop(approveBtn);
    }
  }

  /* =============================
     Export to Excel
  ============================= */
  window.exportToExcel = async function() {
    if (!currentRecords.length) return showNotification('⚠️ لا توجد بيانات للتصدير', 'error');

    const exportBtn = document.querySelector('[onclick="exportToExcel()"]');

    try {
      LoadingState.start(exportBtn, 'جاري التصدير...');
      
      const startDate = DOM.get('payrollStartDate')?.value;
      const endDate = DOM.get('payrollEndDate')?.value;

      const headers = [
        'اسم المندوب','رقم الجوال','من تاريخ','إلى تاريخ','الطلبات','سعر التوصيل','الإكراميات','المكافآت','الغرامات','المدين','الدائن','النقد','كاش مستلم','خصم السلفة','الإجمالي','الصافي','الحالة'
      ];

      const rows = currentRecords.map(r => ([
        `"${r.driver_name || 'غير محدد'}"`,
        `"${r.driver_phone || 'غير متوفر'}"`,
        `"${formatDate(r.period_start, { variant: 'csv' })}"`,
        `"${formatDate(r.period_end, { variant: 'csv' })}"`,
        toNumber(r.total_orders),
        toNumber(r.total_delivery_price),
        toNumber(r.total_tips),
        toNumber(r.total_bonuses),
        toNumber(r.total_penalties),
        toNumber(r.total_debit),
        toNumber(r.total_credit),
        toNumber(r.total_cash),
        toNumber(r.total_cash_received),
        toNumber(r.advance_deduction),
        toNumber(r.gross_salary),
        toNumber(r.net_salary),
        `"${statusLabelAr(r.status)}"`
      ].join(',')));

      const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payroll_${startDate}_to_${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showNotification('✅ تم تصدير البيانات بنجاح', 'success');
    } catch (err) {
      ErrorHandler.handle(err, 'EXPORT');
    } finally {
      LoadingState.stop(exportBtn);
    }
  };

  /* =============================
     Initialization
  ============================= */
  function initPayroll() {
    DOM.init();
    
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startDateEl = DOM.get('payrollStartDate');
    const endDateEl = DOM.get('payrollEndDate');

    if (startDateEl) startDateEl.value = firstDay.toISOString().split('T')[0];
    if (endDateEl) endDateEl.value = lastDay.toISOString().split('T')[0];

    loadSettings();
    loadGroups();

    const calcTypeSelect = DOM.get('calculationType');
    if (calcTypeSelect) {
      calcTypeSelect.addEventListener('change', window.onCalculationTypeChange);
    }
    
    console.log('✅ [INIT] Payroll module initialized (v9.0 - Preview Mode)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPayroll);
  } else {
    initPayroll();
  }

  // Export functions
  window.initPayroll = initPayroll;
  window.loadPayrollRecords = loadPayrollRecords;
  window.loadGroups = loadGroups;

})();