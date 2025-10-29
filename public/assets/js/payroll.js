/* =============================
   Payroll Management JavaScript
   Version: 3.0
============================= */

(function() {
  'use strict';

  /* =============================
     State
  ============================= */
  let currentRecords = [];

  /* =============================
     Constants & Maps
  ============================= */
  const STATUS_MAP = {
    draft:    { label: 'مسودة',  icon: '📝', class: 'status-draft' },
    approved: { label: 'معتمد',  icon: '✅', class: 'status-approved' },
    paid:     { label: 'مدفوع',  icon: '💵', class: 'status-paid' },
  };
  const S = (s) => STATUS_MAP[s] || STATUS_MAP.draft;

  /* =============================
     Utilities (format / DOM helpers)
  ============================= */
  const toNumber = (v) => Number(v) || 0;
  const formatNumber = (n) => new Intl.NumberFormat('en-US').format(n);
  const formatCurrency = (a) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(a) + ' ر.س';

  function formatDate(dateStr, { variant = 'ui' } = {}) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (variant === 'csv') {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
    return new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
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
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#dcfce7' : '#fee2e2';
    const borderColor = type === 'success' ? '#166534' : '#991b1b';
    const textColor = type === 'success' ? '#166534' : '#991b1b';
    notification.style.cssText = `position:fixed; top:20px; left:50%; transform:translateX(-50%); background:${bgColor}; border:2px solid ${borderColor}; color:${textColor}; padding:16px 24px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:10000; font-weight:600;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  function setSettingsVisibility(open) {
    const c = document.getElementById('settings-container');
    const icon = document.getElementById('toggle-icon');
    const text = document.getElementById('toggle-text');
    if (!c || !icon || !text) return;
    c.style.display = open ? 'block' : 'none';
    icon.textContent = open ? '▲' : '▼';
    text.textContent = open ? 'إخفاء' : 'إظهار';
  }

  function validatePeriod() {
    const start = document.getElementById('payroll-start-date')?.value;
    const end   = document.getElementById('payroll-end-date')?.value;
    if (!start || !end) return { ok: false, error: '⚠️ الرجاء اختيار الفترة الزمنية' };
    if (new Date(start) > new Date(end)) return { ok: false, error: '⚠️ تاريخ البداية يجب أن يكون قبل تاريخ النهاية' };
    return { ok: true, start, end };
  }

  function sumBy(records, key) {
    return records.reduce((sum, r) => sum + toNumber(r[key]), 0);
  }

  function toggleApproveAllButton(records, filter) {
    const btn = document.getElementById('approve-all-btn');
    if (!btn) return;
    const hasDrafts = records.some(r => r.status === 'draft');
    btn.style.display = (filter === 'draft' && hasDrafts) ? 'block' : 'none';
  }

  /* =============================
     Settings (load / save / toggle)
  ============================= */
  window.toggleSettings = function() {
    const c = document.getElementById('settings-container');
    if (!c) return;
    const willOpen = c.style.display === 'none';
    setSettingsVisibility(willOpen);
    if (willOpen) {
      loadSettings();
    }
  };

  async function loadSettings() {
    try {
      const result = await API.getPayrollSettings();
      if (result.success && result.settings) {
        const s = result.settings;
        const baseSalary = document.getElementById('base-salary');
        const targetOrders = document.getElementById('target-orders');
        const targetBonus = document.getElementById('target-bonus');
        const orderValueDefault = document.getElementById('order-value-default');
        const orderValueAfterTarget = document.getElementById('order-value-after-target');

        if (baseSalary) baseSalary.value = s.base_salary || 0;
        if (targetOrders) targetOrders.value = s.target_orders || 0;
        if (targetBonus) targetBonus.value = s.target_bonus || 0;
        if (orderValueDefault) orderValueDefault.value = s.order_value_default || 4.4;
        if (orderValueAfterTarget) orderValueAfterTarget.value = s.order_value_after_target || 4.4;

        setSettingsVisibility(Boolean(s.target_orders && s.target_orders > 0));
      }
    } catch (err) {
      console.error('❌ [SETTINGS] Load error:', err);
    }
  }

  window.saveSettings = async function() {
    const baseSalary = document.getElementById('base-salary')?.value;
    const targetOrders = document.getElementById('target-orders')?.value;
    const targetBonus = document.getElementById('target-bonus')?.value;
    const orderValueDefault = document.getElementById('order-value-default')?.value;
    const orderValueAfterTarget = document.getElementById('order-value-after-target')?.value;

    const payload = {
      base_salary: baseSalary,
      target_orders: targetOrders,
      target_bonus: targetBonus,
      order_value_default: orderValueDefault,
      order_value_after_target: orderValueAfterTarget,
    };

    try {
      const result = await API.updatePayrollSettings(payload);
      if (result.success) {
        showNotification('✅ تم حفظ الإعدادات بنجاح', 'success');
      } else {
        showNotification('❌ فشل حفظ الإعدادات: ' + (result.error || 'خطأ غير معروف'), 'error');
      }
    } catch (err) {
      console.error('❌ [SETTINGS] Save error:', err);
      showNotification('❌ حدث خطأ أثناء حفظ الإعدادات', 'error');
    }
  };

  /* =============================
     Payroll Data (calculate / load / render)
  ============================= */
  window.fetchPayrollData = async function() {
    const { ok, error, start, end } = validatePeriod();
    if (!ok) return showNotification(error, 'error');

    const tableContent = document.getElementById('payroll-table-content');
    const statsEl = document.getElementById('payroll-stats');
    const approveBtn = document.getElementById('approve-all-btn');

    if (!tableContent) return;

    if (statsEl) statsEl.style.display = 'none';
    if (approveBtn) approveBtn.style.display = 'none';
    tableContent.innerHTML = spinnerHTML('جاري حساب الرواتب من البيانات المحفوظة...', 'يتم الحساب من قاعدة البيانات');

    try {
      const result = await API.calculatePayroll(start, end);

      if (result.success) {
        showNotification(`✅ تم حساب رواتب ${result.data.drivers_count} مناديب بنجاح`, 'success');
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) statusFilter.value = 'draft';
        await loadPayrollRecords();
      } else {
        showNotification('❌ ' + (result.error || 'فشل في حساب الرواتب'), 'error');
        tableContent.innerHTML = '<p style="text-align:center; padding:40px; color:#ef4444;">فشل في حساب الرواتب</p>';
      }
    } catch (err) {
      console.error('❌ [CALCULATE] Error:', err);
      showNotification('❌ حدث خطأ أثناء حساب الرواتب', 'error');
      tableContent.innerHTML = '<p style="text-align:center; padding:40px; color:#ef4444;">حدث خطأ أثناء حساب الرواتب</p>';
    }
  };

  async function loadPayrollRecords() {
    const { ok, error, start, end } = validatePeriod();
    if (!ok) return showNotification(error, 'error');

    const statusFilter = document.getElementById('status-filter')?.value || 'all';
    const tableContent = document.getElementById('payroll-table-content');

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
        if (currentRecords.length === 0) {
          tableContent.innerHTML = '<p style="text-align:center; padding:40px; color:#64748b;">لا توجد سجلات رواتب لهذه الفترة</p>';
        } else {
          renderPayrollTable(currentRecords);
          updateStats(currentRecords);
          toggleApproveAllButton(currentRecords, statusFilter);
        }
      } else {
        showNotification('❌ ' + (result.error || 'فشل في تحميل السجلات'), 'error');
        tableContent.innerHTML = '<p style="text-align:center; padding:40px; color:#ef4444;">فشل في تحميل السجلات</p>';
      }
    } catch (err) {
      console.error('❌ [LOAD] Error:', err);
      showNotification('❌ حدث خطأ أثناء تحميل السجلات', 'error');
      tableContent.innerHTML = '<p style="text-align:center; padding:40px; color:#ef4444;">حدث خطأ أثناء تحميل السجلات</p>';
    }
  }

  window.filterByStatus = function() {
    loadPayrollRecords();
  };

  function renderPayrollTable(records) {
    const rows = records.map(record => `
      <tr>
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
        <td>${formatCurrency(toNumber(record.cash_received))}</td>
        <td>${formatCurrency(toNumber(record.gross_salary))}</td>
        <td style="font-weight:700; color:#059669;">${formatCurrency(toNumber(record.net_salary))}</td>
        <td>${getStatusBadge(record.status)}</td>
      </tr>
    `).join('');

    const html = `
      <div style="overflow-x:auto;">
        <table>
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
              <th>الإجمالي</th>
              <th>الصافي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    const tableContent = document.getElementById('payroll-table-content');
    if (tableContent) tableContent.innerHTML = html;
  }

  function updateStats(records) {
    const totalOrders    = sumBy(records, 'total_orders');
    const totalDelivery  = sumBy(records, 'total_delivery_price');
    const totalTips      = sumBy(records, 'total_tips');
    const totalBonuses   = sumBy(records, 'total_bonuses');
    const totalPenalties = sumBy(records, 'total_penalties');
    const totalCash      = sumBy(records, 'total_cash');
    const totalNet       = sumBy(records, 'net_salary');

    const elements = {
      'stat-drivers': formatNumber(records.length),
      'stat-orders': formatNumber(totalOrders),
      'stat-delivery': formatCurrency(totalDelivery),
      'stat-tips': formatCurrency(totalTips),
      'stat-bonuses': formatCurrency(totalBonuses),
      'stat-penalties': formatCurrency(totalPenalties),
      'stat-cash': formatCurrency(totalCash),
      'stat-net': formatCurrency(totalNet)
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    const statsEl = document.getElementById('payroll-stats');
    if (statsEl) statsEl.style.display = 'grid';
  }

  /* =============================
     Approve (bulk)
  ============================= */
  async function approveAllDrafts() {
    if (!currentRecords.length) return showNotification('⚠️ لا توجد سجلات لإصدار التقرير', 'error');
    const draftRecords = currentRecords.filter(r => r.status === 'draft');
    if (!draftRecords.length) return showNotification('⚠️ لا توجد سجلات بحالة "مسودة"', 'error');

    const msg = `هل أنت متأكد من إصدار تقرير الرواتب؟\n\nسيتم اعتماد ${draftRecords.length} رواتب وتغيير الحالة من "مسودة" إلى "معتمد"`;
    if (!confirm(msg)) return;

    const approveBtn = document.getElementById('approve-all-btn');
    if (!approveBtn) return;

    approveBtn.innerHTML = '<div class="loading-spinner" style="width:20px; height:20px; border-width:2px;"></div>';
    approveBtn.disabled = true;

    try {
      const requests = draftRecords.map(r => (
        API.updatePayrollStatus(r.id, 'approved')
          .then(result => ({ ok: result.success, err: result.error }))
          .catch(e => ({ ok: false, err: e?.message || 'error' }))
      ));

      const results = await Promise.allSettled(requests);
      const successCount = results.filter(x => x.status === 'fulfilled' && x.value.ok).length;
      const failCount    = results.length - successCount;

      if (successCount) {
        showNotification(`✅ تم اعتماد ${successCount} رواتب بنجاح`, 'success');
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) statusFilter.value = 'approved';
        await loadPayrollRecords();
      }
      if (failCount) {
        showNotification(`⚠️ تعذر اعتماد ${failCount} سجلات`, 'error');
      }
    } catch (err) {
      console.error('❌ [APPROVE] Error:', err);
      showNotification('❌ حدث خطأ أثناء إصدار التقرير', 'error');
    } finally {
      approveBtn.textContent = '✅ إصدار تقرير الرواتب';
      approveBtn.disabled = false;
    }
  }

  /* =============================
     Export & Print
  ============================= */
  window.exportToExcel = async function() {
    if (!currentRecords.length) return showNotification('⚠️ لا توجد بيانات للتصدير', 'error');

    try {
      const startDate = document.getElementById('payroll-start-date')?.value;
      const endDate = document.getElementById('payroll-end-date')?.value;

      const headers = [
        'اسم المندوب','رقم الجوال','من تاريخ','إلى تاريخ','الطلبات','سعر التوصيل','الإكراميات','المكافآت','الغرامات','المدين','الدائن','النقد','الإجمالي','الصافي','الحالة'
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

      showNotification('✅ تم تصدير البيانات بنجاح', 'success');
    } catch (err) {
      console.error('❌ [EXPORT] Error:', err);
      showNotification('❌ حدث خطأ أثناء التصدير', 'error');
    }
  };

  window.printPayroll = function() { 
    window.print(); 
  };

  /* =============================
     Init
  ============================= */
  function initPayroll() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startDateEl = document.getElementById('payroll-start-date');
    const endDateEl = document.getElementById('payroll-end-date');

    if (startDateEl) startDateEl.value = firstDay.toISOString().split('T')[0];
    if (endDateEl) endDateEl.value = lastDay.toISOString().split('T')[0];

    loadSettings();

    // Attach approve button listener
    const approveBtn = document.getElementById('approve-all-btn');
    if (approveBtn) {
      approveBtn.removeEventListener('click', approveAllDrafts);
      approveBtn.addEventListener('click', approveAllDrafts);
    }
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPayroll);
  } else {
    initPayroll();
  }

  // Export init function for manual initialization
  window.initPayroll = initPayroll;

})();