// Jahez Integration JavaScript

// Initialize Jahez form
async function initializeJahezForm() {
    const container = document.getElementById('jahez-status-container');
    
    if (!container) {
        console.log('Jahez container not found');
        return;
    }
    
    console.log('✅ Initializing Jahez form...');
    
    // Check connection status using API
    try {
        const result = await API.getJahezStatus();
        console.log('Jahez status:', result);
        
        if (result.connected) {
            showConnectedView(result.data);
        } else {
            showConnectionForm();
        }
    } catch (err) {
        console.error('Error checking status:', err);
        showConnectionForm();
    }
}

function showConnectionForm() {
    const container = document.getElementById('jahez-status-container');
    container.innerHTML = `
        <div id="jahez-message" class="message"></div>
        <form id="jahezForm">
            <div class="form-group">
                <label class="form-label">اسم الشركة / المؤسسة *</label>
                <input type="text" id="company_name" class="form-input" required placeholder="أدخل اسم الشركة">
            </div>
            <div class="form-group">
                <label class="form-label">Jahez Email *</label>
                <input type="email" id="jahez_email" class="form-input" required placeholder="Enter email">
            </div>
            <div class="form-group">
                <label class="form-label">Jahez Password *</label>
                <input type="password" id="jahez_password" class="form-input" required placeholder="Enter password">
            </div>
            <button type="submit" class="save-btn" id="jahezSubmitBtn">حفظ وربط الحساب</button>
        </form>
    `;
    
    document.getElementById('jahezForm').addEventListener('submit', handleJahezFormSubmit);
}

function showConnectedView(data) {
    const container = document.getElementById('jahez-status-container');
    container.innerHTML = `
        <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <span style="font-size: 24px;">✅</span>
                <strong style="color: #065f46;">متصل بحساب جاهز</strong>
            </div>
            <p style="color: #047857; font-size: 14px; margin: 0;">
                Company: <strong>${data.company_name || 'غير محدد'}</strong><br>
                Company ID: <strong>${data.company_id}</strong>
            </p>
        </div>
        
        <div class="form-group">
            <label class="form-label">Jahez Email</label>
            <input type="email" class="form-input" readonly value="${data.username}" style="background: #f0f0f0; cursor: not-allowed;">
        </div>
        
        <div class="form-group">
            <label class="form-label">Jahez Password</label>
            <div style="display: flex; gap: 10px;">
                <input type="password" class="form-input" readonly value="••••••••" style="flex: 1; background: #f0f0f0; cursor: not-allowed;">
                <button type="button" class="save-btn" id="editPasswordBtn" style="width: auto; padding: 12px 20px;">تعديل</button>
            </div>
        </div>
        
        <div id="passwordEditSection" style="display: none; margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <div id="password-message" class="message"></div>
            <div class="form-group">
                <label class="form-label">كلمة المرور الجديدة</label>
                <input type="password" id="new_password" class="form-input" placeholder="أدخل كلمة المرور الجديدة">
            </div>
            <div style="display: flex; gap: 10px;">
                <button type="button" class="save-btn" id="savePasswordBtn">حفظ</button>
                <button type="button" class="save-btn" id="cancelPasswordBtn" style="background: #94a3b8;">إلغاء</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const editBtn = document.getElementById('editPasswordBtn');
    const saveBtn = document.getElementById('savePasswordBtn');
    const cancelBtn = document.getElementById('cancelPasswordBtn');
    
    if (editBtn) editBtn.addEventListener('click', editPassword);
    if (saveBtn) saveBtn.addEventListener('click', savePassword);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelPassword);
    
    // Show and setup sync section
    const syncSection = document.getElementById('sync-drivers-section');
    if (syncSection) {
        syncSection.style.display = 'block';
        
        const syncBtn = document.getElementById('syncDriversBtn');
        if (syncBtn) {
            console.log('✅ Sync button found, attaching listener');
            syncBtn.addEventListener('click', syncDriversFromJahez);
        } else {
            console.error('❌ Sync button not found!');
        }
    } else {
        console.error('❌ Sync section not found!');
    }
}

// Handle Jahez form submission
async function handleJahezFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('jahezSubmitBtn');
    const messageDiv = document.getElementById('jahez-message');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الربط...';

    const formData = {
        companyName: document.getElementById('company_name').value,
        username: document.getElementById('jahez_email').value,
        password: document.getElementById('jahez_password').value
    };

    try {
        const result = await API.connectJahez(formData.companyName, formData.username, formData.password);

        if (result.success) {
            showJahezMessage(messageDiv, 
                `✅ تم ربط حساب جاهز بنجاح! Company ID: ${result.company_id}`, 
                'success'
            );
            
            setTimeout(() => {
                initializeJahezForm(); // Reload the view
            }, 2000);
        } else {
            showJahezMessage(messageDiv, 
                `❌ ${result.message}`, 
                'error'
            );
        }
    } catch (error) {
        showJahezMessage(messageDiv, 
            `❌ Connection error: ${error.message}`, 
            'error'
        );
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'حفظ وربط الحساب';
}

// Show Jahez message
function showJahezMessage(element, message, type) {
    if (element) {
        element.textContent = message;
        element.className = `message ${type} show`;
        
        setTimeout(() => {
            element.classList.remove('show');
        }, 5000);
    }
}

function editPassword() {
    document.getElementById('passwordEditSection').style.display = 'block';
    document.getElementById('editPasswordBtn').style.display = 'none';
}

function cancelPassword() {
    document.getElementById('passwordEditSection').style.display = 'none';
    document.getElementById('editPasswordBtn').style.display = 'block';
    document.getElementById('new_password').value = '';
}

async function savePassword() {
    const pwd = document.getElementById('new_password').value;
    const msg = document.getElementById('password-message');
    
    if (!pwd) {
        msg.textContent = '❌ أدخل كلمة المرور';
        msg.className = 'message error show';
        return;
    }
    
    try {
        const result = await API.updateJahezPassword(pwd);
        
        if (result.success) {
            msg.textContent = '✅ تم التحديث بنجاح';
            msg.className = 'message success show';
            setTimeout(() => {
                document.getElementById('passwordEditSection').style.display = 'none';
                document.getElementById('editPasswordBtn').style.display = 'block';
                document.getElementById('new_password').value = '';
            }, 2000);
        } else {
            msg.textContent = '❌ ' + result.message;
            msg.className = 'message error show';
        }
    } catch (err) {
        msg.textContent = '❌ خطأ في الاتصال';
        msg.className = 'message error show';
    }
}

// Check if Jahez account is connected
async function checkJahezConnection() {
    try {
        const result = await API.getJahezStatus();
        
        if (result.connected) {
            displayJahezStatus(result.data);
        }
    } catch (error) {
        console.error('Error checking Jahez connection:', error);
    }
}

// Display Jahez connection status
function displayJahezStatus(data) {
    const statusDiv = document.getElementById('jahez-status');
    
    if (statusDiv && data) {
        statusDiv.innerHTML = `
            <div style="padding: 16px; background: #d1fae5; border-radius: 8px; margin-bottom: 16px;">
                <strong>✅ متصل بحساب جاهز</strong><br>
                <small>Company ID: ${data.company_id}</small>
            </div>
        `;
    }
}

// Load Jahez account info
async function loadJahezAccountInfo() {
    try {
        const result = await API.getJahezAccountInfo();
        
        if (result.success) {
            console.log('Jahez account info:', result.data);
        }
    } catch (error) {
        console.error('Error loading Jahez account info:', error);
    }
}

// Disconnect Jahez account
async function disconnectJahezAccount() {
    if (!confirm('هل أنت متأكد من فصل حساب جاهز؟')) {
        return;
    }

    try {
        const result = await API.disconnectJahez();
        
        if (result.success) {
            alert('تم فصل حساب جاهز بنجاح');
            location.reload();
        }
    } catch (error) {
        console.error('Error disconnecting Jahez:', error);
        alert('حدث خطأ أثناء فصل الحساب');
    }
}

// Sync Jahez data
async function syncJahezData() {
    console.log('Syncing Jahez data...');
    
    try {
        const result = await API.syncJahezData();
        
        if (result.success) {
            console.log('✅ Jahez data synced successfully');
        }
    } catch (error) {
        console.error('Error syncing Jahez data:', error);
    }
}

// Sync drivers from Jahez
async function syncDriversFromJahez() {
    const btn = document.getElementById('syncDriversBtn');
    const msg = document.getElementById('sync-message');
    
    btn.disabled = true;
    btn.textContent = '🔄 جاري المزامنة...';
    
    try {
        const result = await API.syncDrivers();
        
        if (result.success) {
            msg.textContent = `✅ تمت المزامنة بنجاح! تم إضافة ${result.stats.added} مندوب وتحديث ${result.stats.updated} مندوب`;
            msg.className = 'message success show';
            
            // Update last sync time
            document.getElementById('last-sync-time').textContent = new Date().toLocaleString('ar-SA');
        } else {
            msg.textContent = `❌ ${result.message}`;
            msg.className = 'message error show';
        }
    } catch (error) {
        msg.textContent = `❌ خطأ في المزامنة: ${error.message}`;
        msg.className = 'message error show';
    }
    
    btn.disabled = false;
    btn.textContent = '🔄 مزامنة المناديب من جاهز';
    
    setTimeout(() => {
        msg.classList.remove('show');
    }, 5000);
}