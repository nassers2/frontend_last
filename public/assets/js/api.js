// ========================================
// 🔐 API Manager with JWT in localStorage
// ========================================

const API = {
  baseURL: 'https://api.flemaster.com/api', // ✅ تم التحديث

  // ========================================
  // 🌐 Generic API Call
  // ========================================

  async call(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token'); // ✅ قراءة الـ token
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // ✅ إضافة Authorization header إذا موجود token
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(this.baseURL + endpoint, options);
      const result = await response.json();

      // ✅ التحقق من انتهاء صلاحية الـ token
      if (!response.ok && (result.code === 'INVALID_TOKEN' || result.code === 'UNAUTHORIZED')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login.html';
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error(result.message || 'API request failed');
      }

      return result;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  },


  // في قسم Authentication APIs، أضف:

async updateProfile(fullName, phone, email) {
  return await this.call('/auth/update-profile', 'PUT', {
    full_name: fullName,
    phone: phone,
    email: email
  });
},

async changePassword(currentPassword, newPassword) {
  return await this.call('/auth/change-password', 'POST', {
    current_password: currentPassword,
    new_password: newPassword
  });
},
  // ========================================
  // 🔐 Authentication APIs
  // ========================================

  async register(userData) {
    const result = await this.call('/auth/register', 'POST', userData);
    
    // ✅ حفظ token و user في localStorage
    if (result.success && result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    
    return result;
  },

  async login(email, password) {
    const result = await this.call('/auth/login', 'POST', { email, password });
    
    // ✅ حفظ token و user في localStorage
    if (result.success && result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    
    return result;
  },

  async logout() {
    const result = await this.call('/auth/logout', 'POST');
    
    // ✅ حذف token و user من localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    return result;
  },

  async getCurrentUser() {
    return await this.call('/auth/me', 'GET');
  },

  // ========================================
  // 🏢 Company APIs
  // ========================================

  async getCompanyInfo() {
    return await this.call('/company/info', 'GET');
  },

  async getCompanyDrivers() {
    return await this.call('/company/drivers', 'GET');
  },

  async getCompanyStats() {
    return await this.call('/company/stats', 'GET');
  },

  // ========================================
  // 👥 Drivers APIs
  // ========================================

  async getDrivers() {
    return await this.call('/drivers', 'GET');
  },

  async getDriverById(driverId) {
    return await this.call(`/drivers/${driverId}`, 'GET');
  },

  async getDriverPerformance(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const queryString = params.toString();
    return await this.call(`/drivers/performance${queryString ? '?' + queryString : ''}`, 'GET');
  },

  async getDriverOrders(driverId, fromDate, toDate) {
    const params = new URLSearchParams();
    if (driverId) params.append('driver_id', driverId);
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    
    const queryString = params.toString();
    return await this.call(`/drivers/orders${queryString ? '?' + queryString : ''}`, 'GET');
  },

  async getDriverOrdersSummary(fromDate, toDate, days) {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (days) params.append('days', days);
    
    const queryString = params.toString();
    return await this.call(`/drivers/orders-summary${queryString ? '?' + queryString : ''}`, 'GET');
  },

  async getDriverFinancialsByDate(driverId, fromDate, toDate) {
    const params = new URLSearchParams();
    if (driverId) params.append('driver_id', driverId);
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    
    const queryString = params.toString();
    return await this.call(`/drivers/financials-by-date${queryString ? '?' + queryString : ''}`, 'GET');
  },

  async getDriverFinancials(driverId, fromDate, toDate) {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    
    const queryString = params.toString();
    return await this.call(`/drivers/${driverId}/financials${queryString ? '?' + queryString : ''}`, 'GET');
  },

  // ========================================
  // 🔗 Jahez APIs
  // ========================================

  async connectJahez(companyName, username, password) {
    return await this.call('/jahez/connect', 'POST', {
      companyName,
      username,
      password
    });
  },

  async getJahezStatus() {
    return await this.call('/jahez/status', 'GET');
  },

  async syncDrivers() {
    return await this.call('/jahez/sync-drivers', 'POST');
  },

  async syncFinancials(startDate, endDate) {
    return await this.call('/jahez/sync-financials', 'POST', {
      start_date: startDate,
      end_date: endDate
    });
  },

  async syncOrders(startDate, endDate) {
    return await this.call('/jahez/sync-orders', 'POST', {
      start_date: startDate,
      end_date: endDate
    });
  },

  async updateJahezPassword(password) {
    return await this.call('/jahez/update-password', 'POST', { password });
  },

  async disconnectJahez() {
    return await this.call('/jahez/disconnect', 'POST');
  },

  async syncJahezData() {
    return await this.call('/jahez/sync', 'POST');
  },

  async getJahezAccountInfo() {
    return await this.call('/jahez/account-info', 'GET');
  },

  // ========================================
  // 💵 Cash Management APIs
  // ========================================

  async getCurrentPeriod() {
    return await this.call('/cash/current-period', 'GET');
  },

  async getCashSummary(periodId) {
    const params = new URLSearchParams();
    if (periodId) params.append('period_id', periodId);
    
    const queryString = params.toString();
    return await this.call(`/cash/summary${queryString ? '?' + queryString : ''}`, 'GET');
  },

  async getCashReceipts(periodId, driverId, fromDate, toDate, limit) {
    const params = new URLSearchParams();
    if (periodId) params.append('period_id', periodId);
    if (driverId) params.append('driver_id', driverId);
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (limit) params.append('limit', limit);
    
    const queryString = params.toString();
    return await this.call(`/cash/receipts${queryString ? '?' + queryString : ''}`, 'GET');
  },

  async getCashPeriods(status) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    const queryString = params.toString();
    return await this.call(`/cash/periods${queryString ? '?' + queryString : ''}`, 'GET');
  },

  async createCashReceipt(driverId, amount, receiptDate, notes) {
    return await this.call('/cash/receipt', 'POST', {
      driver_id: driverId,
      amount: amount,
      receipt_date: receiptDate,
      notes: notes
    });
  },

  async updateCashReceipt(receiptId, amount, receiptDate, notes) {
    return await this.call(`/cash/receipt/${receiptId}`, 'PUT', {
      amount: amount,
      receipt_date: receiptDate,
      notes: notes
    });
  },

  async deleteCashReceipt(receiptId) {
    return await this.call(`/cash/receipt/${receiptId}`, 'DELETE');
  },

  async closeCashPeriod(periodId) {
    return await this.call('/cash/close-period', 'POST', {
      period_id: periodId
    });
  },

  // ========================================
  // 💰 Payroll APIs
  // ========================================

  async getPayrollSettings() {
    return await this.call('/payroll/settings', 'GET');
  },

  async updatePayrollSettings(settings) {
    return await this.call('/payroll/settings', 'POST', settings);
  },

  async calculatePayroll(startDate, endDate) {
    return await this.call('/payroll/calculate-period', 'POST', {
      start_date: startDate,
      end_date: endDate
    });
  },

  async getPayrollRecords(startDate, endDate, driverId, status) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (driverId) params.append('driver_id', driverId);
    if (status) params.append('status', status);
    
    const queryString = params.toString();
    return await this.call(`/payroll/records${queryString ? '?' + queryString : ''}`, 'GET');
  },

  async approvePayroll(recordId) {
    return await this.call('/payroll/approve', 'POST', {
      record_id: recordId
    });
  },

  async markPayrollAsPaid(recordId) {
    return await this.call('/payroll/mark-paid', 'POST', {
      record_id: recordId
    });
  },

  async updatePayrollStatus(recordId, status) {
    return await this.call(`/payroll/record/${recordId}/status`, 'PUT', { status });
  },




   // ========================================
  // 💰 Costs Management APIs
  // ========================================

  async getCostsSummary() {
    return await this.call('/costs/summary', 'GET');
  },

  async getCostItems() {
    return await this.call('/costs/items', 'GET');
  },

  async getCostItemById(itemId) {
    return await this.call(`/costs/items/${itemId}`, 'GET');
  },

  async createCostItem(name, amount, type, notes) {
    return await this.call('/costs/items', 'POST', {
      name: name,
      amount: amount,
      type: type,
      notes: notes
    });
  },

  async updateCostItem(itemId, name, amount, type, notes) {
    return await this.call(`/costs/items/${itemId}`, 'PUT', {
      name: name,
      amount: amount,
      type: type,
      notes: notes
    });
  },

  async deleteCostItem(itemId) {
    return await this.call(`/costs/items/${itemId}`, 'DELETE');
  },

  async getCostsSettings() {
    return await this.call('/costs/settings', 'GET');
  },

  async updateCostsSettings(driverCount) {
    return await this.call('/costs/settings', 'PUT', {
      driver_count: driverCount
    });
  },

  async getCostsBreakdown() {
    return await this.call('/costs/breakdown', 'GET');
  },
  // ========================================
  // 👥 Groups APIs
  // ========================================

  async getGroups() {
    return await this.call('/groups', 'GET');
  },

  async getGroupById(groupId) {
    return await this.call(`/groups/${groupId}`, 'GET');
  },

  async createGroup(groupName, description, color, driverIds) {
    return await this.call('/groups', 'POST', {
      group_name: groupName,
      description: description,
      color: color,
      driver_ids: driverIds
    });
  },

  async updateGroup(groupId, groupName, description, color) {
    return await this.call(`/groups/${groupId}`, 'PUT', {
      group_name: groupName,
      description: description,
      color: color
    });
  },

  async deleteGroup(groupId) {
    return await this.call(`/groups/${groupId}`, 'DELETE');
  },

  async addDriversToGroup(groupId, driverIds) {
    return await this.call(`/groups/${groupId}/members`, 'POST', {
      driver_ids: driverIds
    });
  },

  async removeDriverFromGroup(groupId, driverId) {
    return await this.call(`/groups/${groupId}/members/${driverId}`, 'DELETE');
  },

  async getGroupPerformance(groupId, startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const queryString = params.toString();
    return await this.call(`/groups/${groupId}/performance${queryString ? '?' + queryString : ''}`, 'GET');
  }
};

 

// ========================================
// 🔐 Auto-verify token on page load
// ========================================

(function() {
  
  if (window.__authCheckExecuted) {
    return;
  }
  window.__authCheckExecuted = true;
  
  const currentPage = window.location.pathname;
  
  function isPublicPage(path) {
    const publicPatterns = [
      /^\/$/,                      
      /^\/index\.html$/,          
      /^\/landing-page\.html$/,    
      /^\/auth\//                 
    ];
    
    return publicPatterns.some(pattern => pattern.test(path));
  }
  
  console.log('🔍 Checking auth for:', currentPage);
  console.log('🔍 Is public?', isPublicPage(currentPage));
  
  
  if (isPublicPage(currentPage)) {
    console.log('✅ Public page, skipping auth');
    return;
  }
  
  // الانتظار حتى تحميل DOM
  const runAuthCheck = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('⚠️ No token, redirecting...');
      window.location.replace('/auth/login.html');
      return;
    }
    
    try {
      const verification = await API.getCurrentUser();
      
      if (!verification.success) {
        console.warn('⚠️ Invalid token, redirecting...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.replace('/auth/login.html');
      } else {
        console.log('✅ Authenticated:', verification.user.email);
        localStorage.setItem('user', JSON.stringify(verification.user));
      }
    } catch (error) {
      console.error('❌ Auth error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.replace('/auth/login.html');
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAuthCheck);
  } else {
    runAuthCheck();
  }
})
(

)
;