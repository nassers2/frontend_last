// public/assets/js/settings.js

const SettingsApp = {
  currentUser: null,
  
  init: async function() {
    console.log('⚙️ [SETTINGS] Initializing...');
    
    try {
      // Load current user data
      await this.loadUserData();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('✅ [SETTINGS] Initialized successfully');
    } catch (error) {
      console.error('❌ [SETTINGS] Error:', error);
      alert('❌ فشل تحميل البيانات: ' + error.message);
    }
  },
  
  loadUserData: async function() {
    try {
      const response = await API.getCurrentUser();
      
      if (response.success && response.user) {
        this.currentUser = response.user;
        
        // Fill form with current data
        document.getElementById('fullName').value = response.user.full_name || '';
        document.getElementById('email').value = response.user.email || '';
        document.getElementById('phone').value = response.user.phone || '';
        
        console.log('✅ [SETTINGS] User data loaded:', response.user);
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Failed to load user data:', error);
      throw error;
    }
  },
  
  setupEventListeners: function() {
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
    }
    
    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
    }
    
    console.log('✅ [SETTINGS] Event listeners attached');
  },
  
  handleProfileUpdate: async function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الحفظ...';
      
      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      
      // Check if anything changed
      if (fullName === this.currentUser.full_name && 
          email === this.currentUser.email && 
          phone === this.currentUser.phone) {
        alert('⚠️ لم يتم تغيير أي بيانات');
        return;
      }
      
      const result = await API.updateProfile(fullName, phone, email);
      
      if (result.success) {
        alert('✅ تم حفظ التغييرات بنجاح');
        
        // Update localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        user.full_name = result.user.full_name;
        user.email = result.user.email;
        user.phone = result.user.phone;
        localStorage.setItem('user', JSON.stringify(user));
        
        // Reload data
        await this.loadUserData();
      } else {
        alert('❌ ' + (result.message || 'فشل الحفظ'));
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Error:', error);
      alert('❌ حدث خطأ: ' + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  },
  
  handlePasswordChange: async function(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('❌ يرجى ملء جميع الحقول');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert('❌ كلمة المرور الجديدة غير متطابقة');
      return;
    }
    
    if (newPassword.length < 8) {
      alert('❌ كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التغيير...';
      
      const result = await API.changePassword(currentPassword, newPassword);
      
      if (result.success) {
        alert('✅ تم تغيير كلمة المرور بنجاح');
        
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
      } else {
        alert('❌ ' + (result.message || 'فشل تغيير كلمة المرور'));
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Error:', error);
      
      // Check if error is due to wrong current password
      if (error.message.includes('incorrect') || error.message.includes('Current password')) {
        alert('❌ كلمة المرور الحالية غير صحيحة');
      } else {
        alert('❌ حدث خطأ: ' + error.message);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
};

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SettingsApp.init());
} else {
  SettingsApp.init();
}