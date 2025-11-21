// ========================================
// 👥 Drivers Groups Page Manager
// ========================================

let allDrivers = [];
let allGroups = [];
let ungroupedDrivers = [];
let groupedDriversMap = new Map(); // Track which drivers are in which groups
let currentFilter = 'all';

// ========================================
// 🚀 Initialize Page
// ========================================
function initializeDriversPage() {
  console.log('🚗 Initializing Drivers Groups Page...');
  
  loadData();
  setupEventListeners();
}

// ========================================
// 📊 Load All Data
// ========================================
async function loadData() {
  showLoading();
  
  try {
    // Load drivers and groups in parallel
    const [driversResult, groupsResult] = await Promise.all([
      API.getCompanyDrivers(),
      API.getGroups()
    ]);
    
    if (driversResult.success) {
      allDrivers = driversResult.drivers;
      console.log('✅ Loaded drivers:', allDrivers.length);
    }
    
    if (groupsResult.success) {
      allGroups = groupsResult.groups;
      console.log('✅ Loaded groups:', allGroups.length);
    }
    
    await processData();
    updateStats();
    renderGroups();
    renderUngroupedDrivers();
    
    if (allDrivers.length === 0) {
      showEmptyState();
    }
    
  } catch (error) {
    console.error('❌ Error loading data:', error);
    showMessage('حدث خطأ في تحميل البيانات', 'error');
    showEmptyState();
  } finally {
    hideLoading();
  }
}

// ========================================
// 🔄 Process Data
// ========================================
async function processData() {
  // Clear grouped drivers map
  groupedDriversMap.clear();
  
  // Load members for each group and track them
  for (const group of allGroups) {
    try {
      const result = await API.getGroupById(group.id);
      if (result.success && result.group && result.group.members) {
        result.group.members.forEach(member => {
          groupedDriversMap.set(member.driver_id, group.id);
        });
      }
    } catch (error) {
      console.error(`Error loading group ${group.id}:`, error);
    }
  }
  
  // Find ungrouped drivers - those NOT in any group
  ungroupedDrivers = allDrivers.filter(driver => !groupedDriversMap.has(driver.driver_id));
  
  console.log('📊 Grouped drivers:', groupedDriversMap.size);
  console.log('📊 Ungrouped drivers:', ungroupedDrivers.length);
}

// ========================================
// 📊 Update Stats
// ========================================
function updateStats() {
  const total = allDrivers.length;
  const online = allDrivers.filter(d => d.online).length;
  const groups = allGroups.length;
  const ungrouped = ungroupedDrivers.length;
  
  document.getElementById('totalDrivers').textContent = total;
  document.getElementById('onlineDrivers').textContent = online;
  document.getElementById('totalGroups').textContent = groups;
  document.getElementById('ungroupedDrivers').textContent = ungrouped;
  
  // Update filter counts
  document.getElementById('filterCountAll').textContent = total;
  document.getElementById('filterCountOnline').textContent = online;
  document.getElementById('filterCountOffline').textContent = total - online;
  
  document.getElementById('ungroupedCount').textContent = ungrouped;
}

// ========================================
// 🎨 Render Groups
// ========================================
async function renderGroups() {
  const container = document.getElementById('groupsContainer');
  
  if (allGroups.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  // Load members for each group
  const groupsWithMembers = await Promise.all(
    allGroups.map(async (group) => {
      try {
        const result = await API.getGroupById(group.id);
        if (result.success && result.group) {
          return result.group;
        }
        return group;
      } catch (error) {
        console.error(`Error loading group ${group.id}:`, error);
        return group;
      }
    })
  );
  
  container.innerHTML = groupsWithMembers.map(group => createGroupSection(group)).join('');
}

// ========================================
// 🎴 Create Group Section
// ========================================
function createGroupSection(group) {
  const members = group.members || [];
  const filteredMembers = filterDrivers(members);
  
  if (currentFilter !== 'all' && filteredMembers.length === 0) {
    return '';
  }
  
  return `
    <div class="group-section" data-group-id="${group.id}">
      <div class="group-header" style="border-right-color: ${group.color || '#667eea'};">
        <div class="group-title-area">
          <div class="group-icon" style="color: ${group.color || '#667eea'};">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <div class="group-info">
            <h2 class="group-name">${group.group_name}</h2>
            <p class="group-desc">${group.description || 'لا يوجد وصف'}</p>
          </div>
        </div>
        <div class="group-actions">
          <button class="btn-icon" onclick="openEditGroupModal(${group.id})" title="تعديل المجموعة">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <span class="members-count">
            <span>${filteredMembers.length}</span> مندوب
          </span>
        </div>
      </div>
      <div class="drivers-table-wrapper">
        <table class="drivers-table">
          <thead>
            <tr>
              <th width="40">
                <input type="checkbox" class="select-all-checkbox" onchange="selectAllInGroup(${group.id}, this.checked)">
              </th>
              <th>المندوب</th>
              <th>رقم الإقامة</th>
              <th>رقم الهاتف</th>
              <th>الجنسية</th>
              <th>الحالة</th>
              <th>الحالة الوظيفية</th>
              <th width="100">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMembers.length > 0 ? filteredMembers.map(driver => createDriverRow(driver, group.id)).join('') : '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #a0aec0;">لا توجد نتائج</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ========================================
// 🎴 Create Driver Row
// ========================================
function createDriverRow(driver, groupId = null) {
  const statusClass = driver.online ? 'online' : 'offline';
  const statusText = driver.online ? 'متصل' : 'غير متصل';
  const employmentClass = driver.employment_status === 'active' ? 'active' : 'inactive';
  const employmentText = driver.employment_status === 'active' ? 'نشط' : driver.employment_status || 'غير محدد';
  const initial = driver.name ? driver.name.charAt(0) : '؟';
  
  return `
    <tr data-driver-id="${driver.driver_id}">
      <td>
        <input type="checkbox" class="driver-checkbox" value="${driver.driver_id}">
      </td>
      <td>
        <div class="driver-cell">
          <div class="driver-avatar-table">
            ${initial}
            <div class="driver-status-badge ${statusClass}"></div>
          </div>
          <div>
            <div class="driver-name-cell">${driver.name || 'غير محدد'}</div>
            <div class="driver-id-small">ID: ${driver.driver_id}</div>
          </div>
        </div>
      </td>
      <td>${driver.iqama_id || 'غير متوفر'}</td>
      <td style="direction: ltr; text-align: right;">${driver.phone || 'غير متوفر'}</td>
      <td>${driver.nationality || 'غير محدد'}</td>
      <td>
        <span class="status-badge ${statusClass}">
          <span class="status-dot ${statusClass}"></span>
          ${statusText}
        </span>
      </td>
      <td>
        <span class="employment-badge ${employmentClass}">${employmentText}</span>
      </td>
      <td>
        <div class="table-actions">
          ${groupId !== null ? `
          <button class="action-icon-btn" onclick="openChangeGroupModal('${driver.driver_id}', '${driver.name}', ${groupId})" title="تغيير المجموعة">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 8.5V12l-4 1-4-1V8.5"/>
            </svg>
          </button>
          <button class="action-icon-btn" onclick="removeDriverFromCurrentGroup(${groupId}, '${driver.driver_id}')" title="إزالة من المجموعة">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          ` : `
          <button class="action-icon-btn" onclick="openAddToGroupModal('${driver.driver_id}', '${driver.name}')" title="إضافة لمجموعة">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          `}
        </div>
      </td>
    </tr>
  `;
}

// ========================================
// 🎴 Render Ungrouped Drivers
// ========================================
function renderUngroupedDrivers() {
  const tbody = document.getElementById('ungroupedTableBody');
  const section = document.getElementById('ungroupedSection');
  
  const filteredDrivers = filterDrivers(ungroupedDrivers);
  
  if (ungroupedDrivers.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  
  if (filteredDrivers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #a0aec0;">لا توجد نتائج</td></tr>';
  } else {
    tbody.innerHTML = filteredDrivers.map(driver => createDriverRow(driver, null)).join('');
  }
}

// ========================================
// 🎯 Filter Drivers
// ========================================
function filterDrivers(drivers) {
  if (currentFilter === 'all') {
    return drivers;
  } else if (currentFilter === 'online') {
    return drivers.filter(d => d.online);
  } else if (currentFilter === 'offline') {
    return drivers.filter(d => !d.online);
  }
  return drivers;
}

// ========================================
// 🔍 Global Search
// ========================================
function handleGlobalSearch(query) {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    // Reset to show all
    renderGroups();
    renderUngroupedDrivers();
    return;
  }
  
  // Filter all drivers
  const matchedDrivers = allDrivers.filter(driver => 
    (driver.name?.toLowerCase().includes(searchTerm)) ||
    (driver.iqama_id?.toLowerCase().includes(searchTerm)) ||
    (driver.phone?.includes(searchTerm)) ||
    (driver.driver_id?.toLowerCase().includes(searchTerm))
  );
  
  // Filter groups and their members
  allGroups.forEach(group => {
    const groupSection = document.querySelector(`[data-group-id="${group.id}"]`);
    if (groupSection) {
      const rows = groupSection.querySelectorAll('tbody tr');
      let visibleCount = 0;
      
      rows.forEach(row => {
        const driverId = row.dataset.driverId;
        const isMatch = matchedDrivers.some(d => d.driver_id === driverId);
        row.style.display = isMatch ? '' : 'none';
        if (isMatch) visibleCount++;
      });
      
      groupSection.style.display = visibleCount > 0 ? 'block' : 'none';
    }
  });
  
  // Filter ungrouped table
  const ungroupedRows = document.querySelectorAll('#ungroupedTableBody tr');
  let ungroupedVisibleCount = 0;
  
  ungroupedRows.forEach(row => {
    const driverId = row.dataset.driverId;
    const isMatch = matchedDrivers.some(d => d.driver_id === driverId);
    row.style.display = isMatch ? '' : 'none';
    if (isMatch) ungroupedVisibleCount++;
  });
  
  document.getElementById('ungroupedSection').style.display = ungroupedVisibleCount > 0 ? 'block' : 'none';
}

// ========================================
// 🎧 Setup Event Listeners
// ========================================
function setupEventListeners() {
  // Global search
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleGlobalSearch(e.target.value));
  }
  
  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      await renderGroups();
      renderUngroupedDrivers();
    });
  });
  
  // Create group button
  const createGroupBtn = document.getElementById('createGroupBtn');
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', openCreateGroupModal);
  }
  
  // Sync drivers button
  const syncBtn = document.getElementById('syncDriversBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncDrivers);
  }
  
  // View all drivers button
  const viewAllBtn = document.getElementById('viewAllDriversBtn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', async () => {
      currentFilter = 'all';
      document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
      await renderGroups();
      renderUngroupedDrivers();
    });
  }
  
  // Select all drivers in modal
  const selectAllDrivers = document.getElementById('selectAllDrivers');
  if (selectAllDrivers) {
    selectAllDrivers.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('#groupDriversCheckboxes input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = e.target.checked);
    });
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
  
  // Generate checkboxes for ONLY ungrouped drivers
  if (ungroupedDrivers.length === 0) {
    checkboxesContainer.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 20px;">جميع المناديب في مجموعات بالفعل</p>';
  } else {
    checkboxesContainer.innerHTML = ungroupedDrivers.map(driver => `
      <div class="driver-checkbox-item">
        <input type="checkbox" value="${driver.driver_id}">
        <div class="driver-cell">
          <div class="driver-avatar-table" style="width: 32px; height: 32px; font-size: 14px;">
            ${driver.name ? driver.name.charAt(0) : '؟'}
          </div>
          <div>
            <div class="driver-name-cell" style="font-size: 14px;">${driver.name || 'غير محدد'}</div>
            <div class="driver-id-small">${driver.phone || 'لا يوجد'}</div>
          </div>
        </div>
      </div>
    `).join('');
  }
  
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
  
  const checkboxes = document.querySelectorAll('#groupDriversCheckboxes input[type="checkbox"]:checked');
  const driverIds = Array.from(checkboxes).map(cb => cb.value);
  
  if (!groupName) {
    showMessage('الرجاء إدخال اسم المجموعة', 'error');
    return;
  }
  
  try {
    const result = await API.createGroup(groupName, description, color, driverIds);
    
    if (result.success) {
      showMessage('تم إنشاء المجموعة بنجاح', 'success');
      closeCreateGroupModal();
      await loadData();
    }
  } catch (error) {
    console.error('❌ Error creating group:', error);
    showMessage(error.message || 'حدث خطأ في إنشاء المجموعة', 'error');
  }
}

// ========================================
// ✏️ Open Edit Group Modal
// ========================================
async function openEditGroupModal(groupId) {
  try {
    const result = await API.getGroupById(groupId);
    
    if (result.success && result.group) {
      const group = result.group;
      
      document.getElementById('editGroupId').value = group.id;
      document.getElementById('editGroupNameInput').value = group.group_name;
      document.getElementById('editGroupDescInput').value = group.description || '';
      document.getElementById('editGroupColorInput').value = group.color || '#667eea';
      
      document.getElementById('editGroupModal').style.display = 'flex';
    }
  } catch (error) {
    console.error('❌ Error loading group:', error);
    showMessage('حدث خطأ في تحميل المجموعة', 'error');
  }
}

// ========================================
// ❌ Close Edit Group Modal
// ========================================
function closeEditGroupModal() {
  document.getElementById('editGroupModal').style.display = 'none';
}

// ========================================
// 💾 Update Group
// ========================================
async function updateGroup() {
  const groupId = document.getElementById('editGroupId').value;
  const groupName = document.getElementById('editGroupNameInput').value.trim();
  const description = document.getElementById('editGroupDescInput').value.trim();
  const color = document.getElementById('editGroupColorInput').value;
  
  if (!groupName) {
    showMessage('الرجاء إدخال اسم المجموعة', 'error');
    return;
  }
  
  try {
    const result = await API.updateGroup(groupId, groupName, description, color);
    
    if (result.success) {
      showMessage('تم تحديث المجموعة بنجاح', 'success');
      closeEditGroupModal();
      await loadData();
    }
  } catch (error) {
    console.error('❌ Error updating group:', error);
    showMessage(error.message || 'حدث خطأ في تحديث المجموعة', 'error');
  }
}

// ========================================
// 🗑️ Confirm Delete Group
// ========================================
function confirmDeleteGroup() {
  const groupId = document.getElementById('editGroupId').value;
  
  if (confirm('هل أنت متأكد من حذف هذه المجموعة؟ سيتم نقل المناديب إلى قائمة "بدون مجموعة"')) {
    deleteGroup(groupId);
  }
}

// ========================================
// 🗑️ Delete Group
// ========================================
async function deleteGroup(groupId) {
  try {
    const result = await API.deleteGroup(groupId);
    
    if (result.success) {
      showMessage('تم حذف المجموعة بنجاح', 'success');
      closeEditGroupModal();
      await loadData();
    }
  } catch (error) {
    console.error('❌ Error deleting group:', error);
    showMessage(error.message || 'حدث خطأ في حذف المجموعة', 'error');
  }
}

// ========================================
// 🔄 Open Change Group Modal
// ========================================
function openChangeGroupModal(driverId, driverName, currentGroupId) {
  document.getElementById('changeDriverId').value = driverId;
  document.getElementById('changeDriverName').textContent = driverName;
  
  const select = document.getElementById('newGroupSelect');
  select.innerHTML = '<option value="">-- اختر المجموعة --</option>';
  
  // Show only OTHER groups (not current one)
  allGroups.forEach(group => {
    if (group.id !== currentGroupId) {
      select.innerHTML += `<option value="${group.id}">${group.group_name}</option>`;
    }
  });
  
  // Add option to remove from group
  select.innerHTML += '<option value="remove">إزالة من المجموعة</option>';
  
  document.getElementById('changeGroupModal').style.display = 'flex';
}

// ========================================
// ❌ Close Change Group Modal
// ========================================
function closeChangeGroupModal() {
  document.getElementById('changeGroupModal').style.display = 'none';
}

// ========================================
// ✅ Confirm Change Group
// ========================================
async function confirmChangeGroup() {
  const driverId = document.getElementById('changeDriverId').value;
  const newGroupId = document.getElementById('newGroupSelect').value;
  
  if (!newGroupId) {
    showMessage('الرجاء اختيار المجموعة', 'error');
    return;
  }
  
  // Find current group
  const currentGroupId = groupedDriversMap.get(driverId);
  
  try {
    // Remove from current group
    if (currentGroupId) {
      await API.removeDriverFromGroup(currentGroupId, driverId);
    }
    
    // Add to new group (if not removing)
    if (newGroupId !== 'remove') {
      await API.addDriversToGroup(newGroupId, [driverId]);
      showMessage('تم نقل المندوب بنجاح', 'success');
    } else {
      showMessage('تم إزالة المندوب من المجموعة', 'success');
    }
    
    closeChangeGroupModal();
    await loadData();
  } catch (error) {
    console.error('❌ Error changing group:', error);
    showMessage(error.message || 'حدث خطأ في نقل المندوب', 'error');
  }
}

// ========================================
// ➕ Open Add To Group Modal
// ========================================
function openAddToGroupModal(driverId, driverName) {
  document.getElementById('changeDriverId').value = driverId;
  document.getElementById('changeDriverName').textContent = driverName;
  
  const select = document.getElementById('newGroupSelect');
  select.innerHTML = '<option value="">-- اختر المجموعة --</option>';
  
  // Show all groups for ungrouped drivers
  allGroups.forEach(group => {
    select.innerHTML += `<option value="${group.id}">${group.group_name}</option>`;
  });
  
  document.getElementById('changeGroupModal').style.display = 'flex';
}

// ========================================
// 🗑️ Remove Driver From Current Group
// ========================================
async function removeDriverFromCurrentGroup(groupId, driverId) {
  if (!confirm('هل أنت متأكد من إزالة هذا المندوب من المجموعة؟')) {
    return;
  }
  
  try {
    const result = await API.removeDriverFromGroup(groupId, driverId);
    
    if (result.success) {
      showMessage('تم إزالة المندوب من المجموعة', 'success');
      await loadData();
    }
  } catch (error) {
    console.error('❌ Error removing driver:', error);
    showMessage(error.message || 'حدث خطأ في إزالة المندوب', 'error');
  }
}

// ========================================
// ☑️ Select All In Group
// ========================================
function selectAllInGroup(groupId, checked) {
  const section = document.querySelector(`[data-group-id="${groupId}"]`);
  if (section) {
    const checkboxes = section.querySelectorAll('.driver-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
  }
}

// ========================================
// 🔄 Sync Drivers
// ========================================
async function syncDrivers() {
  const btn = document.getElementById('syncDriversBtn');
  const originalHTML = btn.innerHTML;
  
  try {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span>جاري المزامنة...</span>
    `;
    
    const result = await API.syncDrivers();
    
    if (result.success) {
      showMessage(`تم مزامنة ${result.synced_count || 0} مندوب بنجاح`, 'success');
      await loadData();
    }
  } catch (error) {
    console.error('❌ Sync error:', error);
    showMessage('فشلت عملية المزامنة', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

// ========================================
// 🔔 Show Message
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
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 600;
    font-family: 'Cairo', sans-serif;
    animation: slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ========================================
// 🎬 Show/Hide States
// ========================================
function showLoading() {
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('groupsContainer').style.display = 'none';
  document.getElementById('ungroupedSection').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
}

function hideLoading() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('groupsContainer').style.display = 'block';
}

function showEmptyState() {
  document.getElementById('emptyState').style.display = 'block';
  document.getElementById('groupsContainer').style.display = 'none';
  document.getElementById('ungroupedSection').style.display = 'none';
}

// ========================================
// 🚀 Export Functions
// ========================================
window.initializeDriversPage = initializeDriversPage;
window.openCreateGroupModal = openCreateGroupModal;
window.closeCreateGroupModal = closeCreateGroupModal;
window.saveGroup = saveGroup;
window.openEditGroupModal = openEditGroupModal;
window.closeEditGroupModal = closeEditGroupModal;
window.updateGroup = updateGroup;
window.confirmDeleteGroup = confirmDeleteGroup;
window.openChangeGroupModal = openChangeGroupModal;
window.closeChangeGroupModal = closeChangeGroupModal;
window.confirmChangeGroup = confirmChangeGroup;
window.openAddToGroupModal = openAddToGroupModal;
window.removeDriverFromCurrentGroup = removeDriverFromCurrentGroup;
window.selectAllInGroup = selectAllInGroup;

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
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
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);