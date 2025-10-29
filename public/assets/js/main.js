// Main JavaScript File

// Logout function
function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        window.location.href = '/login.html';
    }
}

// Show/Hide message
function showMessage(elementId, message, type = 'success') {
    const messageDiv = document.getElementById(elementId);
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type} show`;
        
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 5000);
    }
}

// Format date
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
}

// Format time
function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('ar-SA');
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ FleetMaster App Loaded');
});