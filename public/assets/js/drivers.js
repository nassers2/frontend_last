// ========================================
// 👥 Drivers Page Manager
// ========================================

let allDrivers = [];
let filteredDrivers = [];
let currentFilter = 'all';
let allGroups = [];

// ========================================
// 🚀 Initialize Drivers Page
// ========================================
function initializeDriversPage() {
  console.log('🚗 Initializing Drivers Page...');
  
  loadDrivers();
  loadGroups();
  setupEventListeners();
}

// ========================================
// 📊 Load Drivers
// ========================================
async function loadDrivers() {
  const loadingState = document.getElementById('loadingState');
  const driversContainer = document.getElementById('driversContainer');
  const emptyState = document.getElementById('emptyState');
  
  loadingState.style.display = 'block';
  driversContainer.style.display = 'none';
  emptyState.style.display = 'none';
  
  try {
    console.log('📡 Fetching drivers from API...');
    
    const data = await API.getCompanyDrivers();
    
    console.log('📊 Response data:', data);
    
    if (data.success) {
      allDrivers = data.drivers;
      filteredDrivers = allDrivers;
      
      console.log('✅ Loaded', allDrivers.length, 'drivers');
      
      updateStats(data.stats);
      
      if (allDrivers.length === 0) {
        console.log('⚠️ No drivers found. Showing empty state.');
        emptyState.style.display = 'block';
        driversContainer.style.display = 'none';
      } else {
        displayDrivers(allDrivers);
        console.log('✅ Drivers displayed successfully');
      }
      
    } else {
      console.error('❌ API returned error:', data.message);
      showMessage(data.message || 'فشل تحميل البيانات', 'error');
      
      emptyState.style.display = 'block';
      driversContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('❌ Error loading drivers:', error);
    showMessage('حدث خطأ أثناء تحميل البيانات: ' + error.message, 'error');
    emptyState.style.display = 'block';
    driversContainer.style.display = 'none';
  } finally {
    loadingState.style.display = 'none';
  }
}

// ========================================
// 📊 Load Groups
// ========================================
async function loadGroups() {
  try {
    const result = await API.getGroups();
    if (result.success) {
      allGroups = result.groups;
      console.log('✅ Loaded groups:', allGroups.length);
      renderGroupsList();
    }
  } catch (error) {
    console.error('❌ Error loading groups:', error);
  }
}

// ========================================
// 📋 Render Groups List
// ========================================
function renderGroupsList() {
  const container = document.getElementById('groupsList');
  
  if (!container) return;
  
  if (allGroups.length === 0) {
    container.innerHTML = '<p class="no-groups">لا توجد مجموعات حالياً</p>';
    return;
  }
  
  container.innerHTML = allGroups.map(group => `
    <div class="group-item" style="border-right: 4px solid ${group.color}">
      <div class="group-info">
        <h4 class="group-name">${group.group_name}</h4>
        <p class="group-desc">${group.description || 'لا يوجد وصف'}</p>
        <span class="group-count">${group.members_count} مندوب</span>
      </div>
      <div class="group-actions">
        <button class="group-action-btn" onclick="viewGroup(${group.id})" title="عرض">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="group-action-btn" onclick="deleteGroup(${group.id})" title="حذف">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ========================================
// 📊 Update Stats
// ========================================
function updateStats(stats) {
  document.getElementById('totalDrivers').textContent = stats.total || 0;
  document.getElementById('onlineDrivers').textContent = stats.online || 0;
  document.getElementById('offlineDrivers').textContent = stats.offline || 0;
  document.getElementById('activeDrivers').textContent = stats.active || 0;
  
  // Update filter counts
  document.getElementById('countAll').textContent = stats.total || 0;
  document.getElementById('countOnline').textContent = stats.online || 0;
  document.getElementById('countOffline').textContent = stats.offline || 0;
  document.getElementById('countSuspended').textContent = stats.suspended || 0;
}

// ========================================
// 🎨 Display Drivers
// ========================================
function displayDrivers(drivers) {
  const container = document.getElementById('driversContainer');
  const emptyState = document.getElementById('emptyState');
  
  if (!drivers || drivers.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  container.style.display = 'grid';
  emptyState.style.display = 'none';
  
  container.innerHTML = drivers.map(driver => createDriverCard(driver)).join('');
}

// ========================================
// 🎴 Create Driver Card
// ========================================
function createDriverCard(driver) {
  const statusClass = driver.suspended ? 'suspended' : (driver.online ? 'online' : 'offline');
  const statusLabel = driver.suspended ? 'موقوف' : (driver.online ? 'متصل' : 'غير متصل');
  const statusBadgeClass = driver.suspended ? 'status-suspended' : (driver.online ? 'status-online' : 'status-offline');
  
  const nationalExpiry = driver.national_expiry_date ? formatDate(driver.national_expiry_date) : 'غير متوفر';
  const expiryWarning = isExpiryNear(driver.national_expiry_date);
  
  return `
    <div class="driver-card ${statusClass}" data-driver-id="${driver.driver_id}">
      <div class="driver-header">
        <div>
          <h3 class="driver-name">${driver.name || 'بدون اسم'}</h3>
          ${driver.nationality ? `<span style="font-size: 12px; color: #666;">🌍 ${driver.nationality}</span>` : ''}
        </div>
        <span class="driver-status ${statusBadgeClass}">
          <span class="status-indicator"></span>
          ${statusLabel}
        </span>
      </div>
      
      <div class="driver-info">
        <div class="info-row">
          <div class="info-icon">🆔</div>
          <div class="info-content">
            <div class="info-label">رقم الإقامة</div>
            <div class="info-value">${driver.iqama_id || 'غير متوفر'}</div>
          </div>
        </div>
        
        <div class="info-row">
          <div class="info-icon">📱</div>
          <div class="info-content">
            <div class="info-label">رقم الهاتف</div>
            <div class="info-value">${driver.phone || 'غير متوفر'}</div>
          </div>
        </div>
        
        ${driver.plate_number ? `
        <div class="info-row">
          <div class="info-icon">🚗</div>
          <div class="info-content">
            <div class="info-label">رقم اللوحة</div>
            <div class="info-value">${driver.plate_number}</div>
          </div>
        </div>
        ` : ''}
        
        <div class="info-row">
          <div class="info-icon">📅</div>
          <div class="info-content">
            <div class="info-label">انتهاء الإقامة ${expiryWarning ? '⚠️' : ''}</div>
            <div class="info-value" style="color: ${expiryWarning ? '#ef4444' : '#1a1a1a'}">
              ${nationalExpiry}
            </div>
          </div>
        </div>
      </div>
      
      <div class="driver-footer">
        <span class="driver-id">ID: ${driver.driver_id}</span>
        <div class="driver-actions">
          <button class="action-btn" onclick="viewDriverDetails('${driver.driver_id}')">
            عرض التفاصيل
          </button>
        </div>
      </div>
    </div>
  `;
}

// ========================================
// 📅 Format Date
// ========================================
function formatDate(dateString) {
  if (!dateString) return 'غير متوفر';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

// ========================================
// ⚠️ Check Expiry Near
// ========================================
function isExpiryNear(expiryDate) {
  if (!expiryDate) return false;
  
  try {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    return diffDays < 60 && diffDays > 0;
  } catch (error) {
    return false;
  }
}

// ========================================
// 🎧 Setup Event Listeners
// ========================================
function setupEventListeners() {
  // Sync button
  const syncBtn = document.getElementById('syncDriversBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncDriversFromJahez);
  }
  
  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // Clear search button
  const clearSearch = document.getElementById('clearSearch');
  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      searchInput.value = '';
      clearSearch.style.display = 'none';
      handleSearch({ target: { value: '' } });
    });
  }
  
  // Filter tabs
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => handleFilter(tab));
  });
  
  // Create Group button
  const createGroupBtn = document.getElementById('createGroupBtn');
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', openCreateGroupModal);
  }
  
  // Select all drivers checkbox
  const selectAllDrivers = document.getElementById('selectAllDrivers');
  if (selectAllDrivers) {
    selectAllDrivers.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.driver-checkbox-input');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
    });
  }
}

// ========================================
// 🔍 Handle Search
// ========================================
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase().trim();
  const clearBtn = document.getElementById('clearSearch');
  
  if (clearBtn) {
    clearBtn.style.display = searchTerm ? 'flex' : 'none';
  }
  
  if (!searchTerm) {
    filteredDrivers = filterByStatus(allDrivers, currentFilter);
  } else {
    const filtered = allDrivers.filter(driver => {
      const name = (driver.name || '').toLowerCase();
      const iqama = (driver.iqama_id || '').toLowerCase();
      const phone = (driver.phone || '').toLowerCase();
      
      return name.includes(searchTerm) || 
             iqama.includes(searchTerm) || 
             phone.includes(searchTerm);
    });
    
    filteredDrivers = filterByStatus(filtered, currentFilter);
  }
  
  displayDrivers(filteredDrivers);
}

// ========================================
// 🎯 Handle Filter
// ========================================
function handleFilter(button) {
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  button.classList.add('active');
  
  currentFilter = button.dataset.filter;
  filteredDrivers = filterByStatus(allDrivers, currentFilter);
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchInput.value) {
    handleSearch({ target: searchInput });
  } else {
    displayDrivers(filteredDrivers);
  }
}

// ========================================
// 📊 Filter By Status
// ========================================
function filterByStatus(drivers, status) {
  switch(status) {
    case 'online':
      return drivers.filter(d => d.online === true);
    case 'offline':
      return drivers.filter(d => d.online === false && !d.suspended);
    case 'suspended':
      return drivers.filter(d => d.suspended === true);
    default:
      return drivers;
  }
}

// ========================================
// 🔄 Sync Drivers from Jahez
// ========================================
async function syncDriversFromJahez() {
  const syncBtn = document.getElementById('syncDriversBtn');
  const originalText = syncBtn.innerHTML;
  
  syncBtn.disabled = true;
  syncBtn.innerHTML = `
    <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    <span>جاري المزامنة...</span>
  `;
  
  try {
    const data = await API.syncDrivers();
    
    if (data.success) {
      showMessage(
        `✅ تمت المزامنة بنجاح! تم إضافة ${data.added || 0} وتحديث ${data.updated || 0} مندوب`,
        'success'
      );
      
      setTimeout(() => loadDrivers(), 1000);
    } else {
      showMessage(data.message || 'فشلت المزامنة', 'error');
    }
  } catch (error) {
    console.error('❌ Sync error:', error);
    showMessage('حدث خطأ أثناء المزامنة: ' + error.message, 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = originalText;
  }
}

// ========================================
// 👁️ View Driver Details
// ========================================
async function viewDriverDetails(driverId) {
  try {
    console.log('📡 Loading driver details:', driverId);
    
    const data = await API.getDriverById(driverId);
    
    if (data.success) {
      console.log('Driver details:', data.driver);
      showMessage('ميزة عرض التفاصيل قيد التطوير', 'info');
    } else {
      showMessage('فشل تحميل التفاصيل', 'error');
    }
  } catch (error) {
    console.error('❌ Error loading driver details:', error);
    showMessage('حدث خطأ أثناء تحميل التفاصيل', 'error');
  }
}

// ========================================
// 📦 Open Create Group Modal
// ========================================
function openCreateGroupModal() {
  const modal = document.getElementById('createGroupModal');
  const checkboxesContainer = document.getElementById('groupDriversCheckboxes');
  
  // Reset form
  document.getElementById('groupNameInput').value = '';
  document.getElementById('groupDescInput').value = '';
  document.getElementById('groupColorInput').value = '#667eea';
  document.getElementById('selectAllDrivers').checked = false;
  
  // Generate checkboxes
  checkboxesContainer.innerHTML = allDrivers.map(driver => `
    <label class="driver-checkbox">
      <input type="checkbox" value="${driver.driver_id}" class="driver-checkbox-input">
      <span class="driver-checkbox-label">
        <span class="driver-checkbox-name">${driver.name}</span>
        <span class="driver-checkbox-status ${driver.online ? 'online' : 'offline'}">
          ${driver.online ? 'متصل' : 'غير متصل'}
        </span>
      </span>
    </label>
  `).join('');
  
  modal.style.display = 'flex';
}

// ========================================
// ❌ Close Create Group Modal
// ========================================
function closeCreateGroupModal() {
  document.getElementById('createGroupModal').style.display = 'none';
}

// ========================================
// 💾 Save Group
// ========================================
async function saveGroup() {
  const groupName = document.getElementById('groupNameInput').value.trim();
  const description = document.getElementById('groupDescInput').value.trim();
  const color = document.getElementById('groupColorInput').value;
  
  const checkboxes = document.querySelectorAll('.driver-checkbox-input:checked');
  const driverIds = Array.from(checkboxes).map(cb => cb.value);
  
  if (!groupName) {
    showMessage('الرجاء إدخال اسم المجموعة', 'error');
    return;
  }
  
  if (driverIds.length === 0) {
    showMessage('الرجاء اختيار مندوب واحد على الأقل', 'error');
    return;
  }
  
  try {
    const result = await API.createGroup(groupName, description, color, driverIds);
    
    if (result.success) {
      showMessage('تم إنشاء المجموعة بنجاح', 'success');
      closeCreateGroupModal();
      await loadGroups();
    }
  } catch (error) {
    console.error('❌ Error creating group:', error);
    showMessage(error.message || 'حدث خطأ في إنشاء المجموعة', 'error');
  }
}

// ========================================
// 👁️ View Group
// ========================================
async function viewGroup(groupId) {
  try {
    const result = await API.getGroupById(groupId);
    
    if (result.success) {
      console.log('Group details:', result.group);
      showMessage('عرض تفاصيل المجموعة قيد التطوير', 'info');
    }
  } catch (error) {
    console.error('❌ Error loading group:', error);
    showMessage('حدث خطأ في تحميل المجموعة', 'error');
  }
}

// ========================================
// 🗑️ Delete Group
// ========================================
async function deleteGroup(groupId) {
  if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
    return;
  }
  
  try {
    const result = await API.deleteGroup(groupId);
    
    if (result.success) {
      showMessage('تم حذف المجموعة بنجاح', 'success');
      await loadGroups();
    }
  } catch (error) {
    console.error('❌ Error deleting group:', error);
    showMessage('حدث خطأ في حذف المجموعة', 'error');
  }
}

// ========================================
// 🔔 Show Message Notification
// ========================================
function showMessage(message, type = 'info') {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6'
  };
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ========================================
// 🚀 Export Functions
// ========================================
window.initializeDriversPage = initializeDriversPage;
window.loadDrivers = loadDrivers;
window.syncDriversFromJahez = syncDriversFromJahez;
window.viewDriverDetails = viewDriverDetails;
window.openCreateGroupModal = openCreateGroupModal;
window.closeCreateGroupModal = closeCreateGroupModal;
window.saveGroup = saveGroup;
window.viewGroup = viewGroup;
window.deleteGroup = deleteGroup;

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);