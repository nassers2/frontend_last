// Navigation between pages - Fixed for main-content ID

function showPage(pageName) {
    console.log(`📄 [Navigation] Showing page: ${pageName}`);
    
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active to clicked nav item
    if (event && event.target) {
        event.target.closest('.nav-item').classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': 'لوحة التحكم',
        'drivers': 'المناديب',
        'orders': 'الطلبات',
        'reports': 'التقارير',
        'payroll': 'إدارة الرواتب',
        'cash-management': 'إدارة الكاش',
        'advances': 'إدارة السلفه',
        'costs': 'إدارة التكاليف',
        'settings': 'الإعدادات'
    };

    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = titles[pageName] || 'FleetMaster';
    }

    // Update page icon
    const icons = {
        'dashboard': 'layout-dashboard',
        'drivers': 'users',
        'orders': 'package',
        'reports': 'bar-chart-3',
        'payroll': 'wallet',
        'cash-management': 'banknote',
        'advances': 'hand-coins',
        'costs': 'calculator',
        'settings': 'settings'
    };

    const pageIcon = document.getElementById('page-icon');
    if (pageIcon) {
        pageIcon.innerHTML = `<i data-lucide="${icons[pageName] || 'layout-dashboard'}"></i>`;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Load page content
    loadPage(pageName);
}

function loadPage(pageName) {
    console.log(`🔄 [Navigation] Loading page: ${pageName}`);
    
    // ✅ إضافة / في البداية لتجنب المسار النسبي
    const pagePath = `/pages/${pageName}-content.html`;
    console.log(`📂 [Navigation] Fetching: ${pagePath}`);
    
    fetch(pagePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            const contentDiv = document.getElementById('main-content');
            
            if (!contentDiv) {
                console.error('❌ [Navigation] Content div not found!');
                return;
            }
            
            contentDiv.innerHTML = html;
            console.log('✅ [Navigation] Content loaded successfully');
            
            // Execute scripts in the loaded content
            executeScripts(contentDiv);
            
            // Initialize page-specific functionality
            setTimeout(() => {
                initializePage(pageName);
            }, 100);
        })
        .catch(error => {
            console.error('❌ [Navigation] Error loading page:', error);
            const contentDiv = document.getElementById('main-content');
            if (contentDiv) {
                contentDiv.innerHTML = `
                    <div style="text-align:center; padding:60px; color:#ef4444;">
                        <div style="font-size:48px; margin-bottom:16px;">❌</div>
                        <p style="font-weight:600;">فشل تحميل الصفحة</p>
                        <p style="font-size:14px; color:#64748b; margin-top:8px;">${error.message}</p>
                        <p style="font-size:12px; color:#94a3b8; margin-top:4px;">المسار المطلوب: ${pagePath}</p>
                    </div>
                `;
            }
        });
}

function loadPayrollScript() {
    if (typeof window.initPayroll === 'function') {
        console.log('🔄 [Payroll] Re-initializing payroll');
        window.initPayroll();
    } else {
        console.log('📥 [Payroll] Loading payroll script');
        const script = document.createElement('script');
        script.src = '/assets/js/payroll.js';
        script.onload = () => {
            console.log('✅ [Payroll] Script loaded');
            if (typeof window.initPayroll === 'function') {
                window.initPayroll();
            }
        };
        script.onerror = () => {
            console.error('❌ [Payroll] Failed to load script');
        };
        document.body.appendChild(script);
    }
}

// ========================================
// Execute scripts in loaded content
// ========================================
function executeScripts(container) {
    if (!container) {
        console.warn('⚠️ [Navigation] No container provided to executeScripts');
        return;
    }
    
    const scripts = container.querySelectorAll('script');
    let executedCount = 0;
    
    console.log(`🔧 [Navigation] Found ${scripts.length} scripts to execute`);
    
    scripts.forEach((oldScript, index) => {
        try {
            const newScript = document.createElement('script');
            
            // Copy attributes
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            // Copy content and wrap in async IIFE
            if (oldScript.textContent && oldScript.textContent.trim()) {
                const scriptContent = oldScript.textContent;
                
                // تحقق إذا الكود يستخدم await
                const hasAwait = scriptContent.includes('await');
                
                if (hasAwait) {
                    newScript.textContent = `
                        (async function() {
                            try {
                                ${scriptContent}
                            } catch (error) {
                                console.error('[Script ${index} Error]', error);
                            }
                        })();
                    `;
                } else {
                    newScript.textContent = `
                        (function() {
                            try {
                                ${scriptContent}
                            } catch (error) {
                                console.error('[Script ${index} Error]', error);
                            }
                        })();
                    `;
                }
            }
            
            // Replace old script with new one
            if (oldScript.parentNode) {
                oldScript.parentNode.replaceChild(newScript, oldScript);
                executedCount++;
            }
        } catch (error) {
            console.error(`❌ [Navigation] Script ${index} replacement error:`, error);
        }
    });
    
    console.log(`✅ [Navigation] Scripts executed: ${executedCount}/${scripts.length}`);
}

// ========================================
// Initialize page-specific scripts
// ========================================
function initializePage(pageName) {
    console.log('🎬 [Init] Initializing page:', pageName);
    
    // Re-initialize Lucide icons for all pages
    setTimeout(() => {
        if (typeof window.lucide !== 'undefined' && window.lucide.createIcons) {
            try {
                window.lucide.createIcons();
            } catch (e) {
                console.warn('⚠️ Lucide error (safe to ignore):', e.message);
            }
        }
    }, 100);
    
    if (pageName === 'dashboard') {
        console.log('📊 [Init] Starting dashboard...');
        setTimeout(() => {
            if (typeof window.loadCompanyInfo === 'function') {
                console.log('✅ [Init] Calling loadCompanyInfo');
                window.loadCompanyInfo();
            } else {
                console.warn('⚠️ [Init] loadCompanyInfo not found');
            }
            
            if (typeof window.loadDriversPerformance === 'function') {
                console.log('✅ [Init] Calling loadDriversPerformance');
                window.loadDriversPerformance();
            } else {
                console.warn('⚠️ [Init] loadDriversPerformance not found');
            }
        }, 500);
    }
    
    if (pageName === 'payroll') {
        console.log('💰 [Init] Starting payroll page...');
        setTimeout(() => {
            if (typeof window.initPayroll === 'function') {
                console.log('✅ [Init] Calling initPayroll');
                window.initPayroll();
            } else {
                console.log('📥 [Init] Loading payroll script...');
                loadPayrollScript();
            }
        }, 300);
    }
    
    if (pageName === 'cash-management') {
        console.log('💵 [Init] Starting cash management page...');
        
        setTimeout(() => {
            // Check if CashApp exists and has init method
            if (typeof window.CashApp !== 'undefined' && typeof window.CashApp.init === 'function') {
                console.log('🔄 [Init] Re-initializing existing CashApp');
                window.CashApp.init();
            } else {
                // Check if script is already in DOM
                const existingScript = document.querySelector('script[src="/assets/js/cash.js"]');
                
                if (existingScript) {
                    console.log('⏳ [Init] CashApp script already exists, waiting for load...');
                    // Wait for script to execute
                    const checkInterval = setInterval(() => {
                        if (typeof window.CashApp !== 'undefined' && window.CashApp.init) {
                            clearInterval(checkInterval);
                            console.log('✅ [Init] CashApp now available, initializing');
                            window.CashApp.init();
                        }
                    }, 100);
                    
                    // Timeout after 3 seconds
                    setTimeout(() => clearInterval(checkInterval), 3000);
                } else {
                    console.log('📥 [Init] Loading CashApp script for first time');
                    const script = document.createElement('script');
                    script.src = '/assets/js/cash.js';
                    script.onload = () => {
                        console.log('✅ [Init] CashApp script loaded');
                        if (typeof window.CashApp !== 'undefined' && window.CashApp.init) {
                            window.CashApp.init();
                        } else {
                            console.error('❌ [Init] CashApp not defined after loading');
                        }
                    };
                    script.onerror = () => {
                        console.error('❌ [Init] Failed to load CashApp script');
                    };
                    document.body.appendChild(script);
                }
            }
        }, 300);
    }
    
    if (pageName === 'advances') {
        console.log('💰 [Init] Starting advances page...');
        setTimeout(() => {
            if (typeof window.AdvancesApp !== 'undefined' && window.AdvancesApp.init) {
                console.log('🔄 [Init] Re-initializing existing AdvancesApp');
                window.AdvancesApp.init();
            } else {
                const existingScript = document.querySelector('script[src="/assets/js/advances.js"]');
                
                if (!existingScript) {
                    console.log('📥 [Init] Loading AdvancesApp script');
                    const script = document.createElement('script');
                    script.src = '/assets/js/advances.js';
                    script.onload = () => {
                        console.log('✅ [Init] AdvancesApp script loaded');
                        if (typeof window.AdvancesApp !== 'undefined' && window.AdvancesApp.init) {
                            window.AdvancesApp.init();
                        }
                    };
                    document.body.appendChild(script);
                }
            }
        }, 300);
    }

    // ========================================
    // 💰 Costs Page - NEW
    // ========================================
    if (pageName === 'costs') {
        console.log('💰 [Init] Starting costs page...');
        
        setTimeout(() => {
            // Check if CostsApp exists and has init method
            if (typeof window.CostsApp !== 'undefined' && typeof window.CostsApp.init === 'function') {
                console.log('🔄 [Init] Re-initializing existing CostsApp');
                window.CostsApp.init();
            } else {
                // Check if script is already in DOM
                const existingScript = document.querySelector('script[src="/assets/js/costs.js"]');
                
                if (existingScript) {
                    console.log('⏳ [Init] CostsApp script already exists, waiting for load...');
                    // Wait for script to execute
                    const checkInterval = setInterval(() => {
                        if (typeof window.CostsApp !== 'undefined' && window.CostsApp.init) {
                            clearInterval(checkInterval);
                            console.log('✅ [Init] CostsApp now available, initializing');
                            window.CostsApp.init();
                        }
                    }, 100);
                    
                    // Timeout after 3 seconds
                    setTimeout(() => clearInterval(checkInterval), 3000);
                } else {
                    console.log('📥 [Init] Loading CostsApp script for first time');
                    const script = document.createElement('script');
                    script.src = '/assets/js/costs.js';
                    script.onload = () => {
                        console.log('✅ [Init] CostsApp script loaded');
                        if (typeof window.CostsApp !== 'undefined' && window.CostsApp.init) {
                            window.CostsApp.init();
                        } else {
                            console.error('❌ [Init] CostsApp not defined after loading');
                        }
                    };
                    script.onerror = () => {
                        console.error('❌ [Init] Failed to load CostsApp script');
                    };
                    document.body.appendChild(script);
                }
            }
        }, 300);
    }

    if (pageName === 'settings') {
        console.log('⚙️ [Init] Starting settings page...');
        setTimeout(() => {
            if (typeof initializeJahezForm === 'function') {
                console.log('✅ [Init] Calling initializeJahezForm');
                initializeJahezForm();
            } else {
                console.warn('⚠️ [Init] initializeJahezForm not found');
            }
        }, 300);
    }
    
    if (pageName === 'drivers') {
        console.log('👥 [Init] Starting drivers page...');
        setTimeout(() => {
            if (typeof initializeDriversPage === 'function') {
                console.log('✅ [Init] Calling initializeDriversPage');
                initializeDriversPage();
            } else {
                console.warn('⚠️ [Init] initializeDriversPage not found');
            }
        }, 300);
    }
    
    if (pageName === 'orders') {
        console.log('📦 [Init] Starting orders page...');
    }
    
    if (pageName === 'reports') {
        console.log('📊 [Init] Starting reports page...');
    }
}

// ========================================
// Initialize navigation on page load
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 [Navigation] DOM loaded');
    
    const contentDiv = document.getElementById('main-content');
    
    if (!contentDiv) {
        console.error('❌ [Navigation] Content div (#main-content) not found in HTML!');
        return;
    }
    
    console.log('✅ [Navigation] Content div found, loading dashboard...');
    loadPage('dashboard');
});

// ========================================
// Make functions globally available
// ========================================
window.showPage = showPage;
window.loadPage = loadPage;