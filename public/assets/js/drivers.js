// js/drivers.js - إدارة صفحة المناديب

let allDrivers = [];
let filteredDrivers = [];
let currentFilter = 'all';

// تهيئة صفحة المناديب
function initializeDriversPage() {
  console.log('🚗 Initializing Drivers Page...');
  
  // تحميل البيانات
  loadDrivers();
  
  // ربط الأحداث
  setupEventListeners();
}

// تحميل المناديب من السيرفر
async function loadDrivers() {
  const loadingState = document.getElementById('loadingState');
  const driversContainer = document.getElementById('driversContainer');
  const emptyState = document.getElementById('emptyState');
  
  // عرض حالة التحميل
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
      
      // تحديث الإحصائيات
      updateStats(data.stats);
      
      if (allDrivers.length === 0) {
        console.log('⚠️ No drivers found. Showing empty state.');
        emptyState.style.display = 'block';
        driversContainer.style.display = 'none';
      } else {
        // عرض المناديب
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

// تحديث الإحصائيات
function updateStats(stats) {
  document.getElementById('totalDrivers').textContent = stats.total || 0;
  document.getElementById('onlineDrivers').textContent = stats.online || 0;
  document.getElementById('offlineDrivers').textContent = stats.offline || 0;
  document.getElementById('activeDrivers').textContent = stats.active || 0;
}

// عرض المناديب
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

// إنشاء كارت مندوب
function createDriverCard(driver) {
  const statusClass = driver.suspended ? 'suspended' : (driver.online ? 'online' : 'offline');
  const statusLabel = driver.suspended ? 'موقوف' : (driver.online ? 'متصل' : 'غير متصل');
  const statusBadgeClass = driver.suspended ? 'status-suspended' : (driver.online ? 'status-online' : 'status-offline');
  
  // تنسيق التواريخ
  const nationalExpiry = driver.national_expiry_date ? formatDate(driver.national_expiry_date) : 'غير متوفر';
  const birthDate = driver.birth_date ? formatDate(driver.birth_date) : 'غير متوفر';
  
  // التحقق من انتهاء الإقامة
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

// تنسيق التاريخ
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

// التحقق من قرب انتهاء الإقامة
function isExpiryNear(expiryDate) {
  if (!expiryDate) return false;
  
  try {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    // تحذير إذا باقي أقل من 60 يوم
    return diffDays < 60 && diffDays > 0;
  } catch (error) {
    return false;
  }
}

// ربط الأحداث
function setupEventListeners() {
  // زر المزامنة
  const syncBtn = document.getElementById('syncDriversBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncDriversFromJahez);
  }
  
  // البحث
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  // الفلاتر
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => handleFilter(btn));
  });
}

// البحث عن المناديب
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase().trim();
  
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

// الفلترة حسب الحالة
function handleFilter(button) {
  // تحديث الأزرار
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  button.classList.add('active');
  
  // الفلترة
  currentFilter = button.dataset.filter;
  filteredDrivers = filterByStatus(allDrivers, currentFilter);
  
  // إعادة البحث إذا كان هناك نص بحث
  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchInput.value) {
    handleSearch({ target: searchInput });
  } else {
    displayDrivers(filteredDrivers);
  }
}

// فلترة المناديب حسب الحالة
function filterByStatus(drivers, status) {
  switch(status) {
    case 'online':
      return drivers.filter(d => d.online === true);
    case 'offline':
      return drivers.filter(d => d.online === false);
    case 'suspended':
      return drivers.filter(d => d.suspended === true);
    default:
      return drivers;
  }
}

// مزامنة المناديب من جاهز
async function syncDriversFromJahez() {
  const syncBtn = document.getElementById('syncDriversBtn');
  const originalText = syncBtn.innerHTML;
  
  syncBtn.disabled = true;
  syncBtn.innerHTML = '<span class="icon">⏳</span> جاري المزامنة...';
  
  try {
    const data = await API.syncDrivers();
    
    if (data.success) {
      showMessage(
        `✅ تمت المزامنة بنجاح! تم إضافة ${data.added} وتحديث ${data.updated} مندوب`,
        'success'
      );
      
      // إعادة تحميل البيانات
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

// عرض تفاصيل المندوب
async function viewDriverDetails(driverId) {
  try {
    console.log('📡 Loading driver details:', driverId);
    
    const data = await API.getDriverById(driverId);
    
    if (data.success) {
      // TODO: عرض modal مع التفاصيل
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

// تصدير الدوال للاستخدام العام
window.initializeDriversPage = initializeDriversPage;
window.loadDrivers = loadDrivers;
window.syncDriversFromJahez = syncDriversFromJahez;
window.viewDriverDetails = viewDriverDetails;