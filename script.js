// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAhfJfh-9tgFdyv8bF_Ha3sv8tHUMoeVVM",
    authDomain: "subscription-api-service.firebaseapp.com",
    databaseURL: "https://subscription-api-service-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "subscription-api-service",
    storageBucket: "subscription-api-service.firebasestorage.app",
    messagingSenderId: "704234156830",
    appId: "1:704234156830:web:b8bc282d89c84ebff00f0f",
    measurementId: "G-EFLBX1RMEZ"
};

// Razorpay Configuration
const razorpayConfig = {
    key_id: "rzp_test_lkoFfNbWaRVyLf",
    key_secret: "CZeKvVHB8NClelJCTMDD2cc4"
};

// Initialize Firebase (using CDN)
let database = null;
let auth = null;

// Load Firebase from CDN
function loadFirebase() {
    return new Promise((resolve, reject) => {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            auth = firebase.auth();
            resolve();
        } else {
            // Load Firebase SDK
            const script1 = document.createElement('script');
            script1.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js';
            document.head.appendChild(script1);
            
            const script2 = document.createElement('script');
            script2.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js';
            document.head.appendChild(script2);
            
            const script3 = document.createElement('script');
            script3.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js';
            document.head.appendChild(script3);
            
            script3.onload = () => {
                firebase.initializeApp(firebaseConfig);
                database = firebase.database();
                auth = firebase.auth();
                resolve();
            };
            
            script3.onerror = reject;
        }
    });
}

// Utility Functions
function showLoading(button) {
    button.classList.add('loading');
    button.disabled = true;
}

function hideLoading(button) {
    button.classList.remove('loading');
    button.disabled = false;
}

function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        const textElement = element.querySelector('span');
        if (textElement) {
            textElement.textContent = message;
        } else {
            element.innerHTML = `<i class="fas fa-${isError ? 'exclamation-triangle' : 'check-circle'}"></i><span>${message}</span>`;
        }
        element.classList.remove('hidden');
        element.classList.add('slide-in');
    }
}

function hideMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// API Functions
async function callExternalAPI(uid, isManual = true) {
    try {
        const response = await fetch('/api/call-external.py', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                uid: uid,
                manual: isManual 
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Free Mode Functionality
function initializeFreeMode() {
    const freeForm = document.getElementById('freeForm');
    if (!freeForm) return;
    
    freeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const uid = document.getElementById('freeUid').value.trim();
        
        if (!uid) {
            showMessage('freeError', 'Please enter a valid UID', true);
            return;
        }
        
        hideMessage('freeError');
        hideMessage('freeResults');
        showLoading(submitButton);
        
        try {
            const result = await callExternalAPI(uid, true);
            
            document.getElementById('freeResultsContent').innerHTML = 
                `<pre>${JSON.stringify(result, null, 2)}</pre>`;
            
            const resultsElement = document.getElementById('freeResults');
            resultsElement.classList.remove('hidden');
            resultsElement.classList.add('slide-in');
            
        } catch (error) {
            showMessage('freeError', `API call failed: ${error.message}`, true);
        } finally {
            hideLoading(submitButton);
        }
    });
}

// Payment Functionality
function initializePayment() {
    const paymentForm = document.getElementById('paymentForm');
    if (!paymentForm) return;
    
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        
        if (!name || !email || !phone) {
            alert('Please fill in all required fields');
            return;
        }
        
        showLoading(submitButton);
        
        const options = {
            key: razorpayConfig.key_id,
            amount: 9900, // ₹99 in paise
            currency: 'INR',
            name: 'API Service',
            description: 'Premium Subscription - Daily API Automation',
            handler: async function (response) {
                try {
                    await loadFirebase();
                    const userId = generateUserId();
                    
                    // Save payment info to Firebase
                    await database.ref('users/' + userId).set({
                        name: name,
                        email: email,
                        phone: phone,
                        paymentStatus: true,
                        paymentId: response.razorpay_payment_id,
                        paymentDate: new Date().toISOString(),
                        uid: null,
                        lastApiCall: null,
                        apiResults: []
                    });
                    
                    // Store user ID in sessionStorage for dashboard access
                    sessionStorage.setItem('userId', userId);
                    sessionStorage.setItem('paymentSuccess', 'true');
                    
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                    
                } catch (error) {
                    console.error('Payment processing failed:', error);
                    alert('Payment successful but account setup failed. Please contact support.');
                } finally {
                    hideLoading(submitButton);
                }
            },
            prefill: {
                name: name,
                email: email,
                contact: phone
            },
            theme: {
                color: '#6366f1'
            },
            modal: {
                ondismiss: function() {
                    hideLoading(submitButton);
                }
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
    });
}

// Dashboard Functionality
function initializeDashboard() {
    const dashboardForm = document.getElementById('dashboardForm');
    if (!dashboardForm) return;
    
    // Check if user has valid session
    const userId = sessionStorage.getItem('userId');
    const paymentSuccess = sessionStorage.getItem('paymentSuccess');
    
    if (!userId || !paymentSuccess) {
        alert('Access denied. Please complete payment first.');
        window.location.href = 'subscription.html';
        return;
    }
    
    // Load user data and setup dashboard
    loadDashboard(userId);
    
    dashboardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = e.target.querySelector('button[type="submit"]');
        const uid = document.getElementById('dashboardUid').value.trim();
        
        if (!uid) {
            showMessage('dashboardError', 'Please enter a valid UID', true);
            return;
        }
        
        hideMessage('dashboardError');
        hideMessage('dashboardResults');
        showLoading(submitButton);
        
        try {
            await loadFirebase();
            
            // Make immediate API call
            const result = await callExternalAPI(uid, true);
            
            // Save UID and results to Firebase
            await database.ref('users/' + userId).update({
                uid: uid,
                lastApiCall: new Date().toISOString(),
                automationStarted: true
            });
            
            // Push result to API results array
            await database.ref('users/' + userId + '/apiResults').push({
                timestamp: new Date().toISOString(),
                result: result,
                type: 'manual'
            });
            
            // Show results
            document.getElementById('dashboardResultsContent').innerHTML = 
                `<pre>${JSON.stringify(result, null, 2)}</pre>`;
            
            const resultsElement = document.getElementById('dashboardResults');
            resultsElement.classList.remove('hidden');
            resultsElement.classList.add('slide-in');
            
            // Update status display
            updateDashboardStatus(userId);
            
            // Hide the form since UID is now set
            dashboardForm.style.display = 'none';
            
            // Show success message
            const successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            successDiv.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <h3>Automation Started!</h3>
                <p>Your UID has been saved and daily automated API calls are now active. You'll receive API calls every day at 12:00 AM.</p>
            `;
            dashboardForm.parentNode.appendChild(successDiv);
            
        } catch (error) {
            showMessage('dashboardError', `Setup failed: ${error.message}`, true);
        } finally {
            hideLoading(submitButton);
        }
    });
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'index.html';
        });
    }
}

async function loadDashboard(userId) {
    try {
        await loadFirebase();
        const userRef = database.ref('users/' + userId);
        
        userRef.on('value', (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                updateDashboardDisplay(userData);
            }
        });
        
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

function updateDashboardDisplay(userData) {
    // Update next call time
    const nextCallElement = document.getElementById('nextCallTime');
    if (nextCallElement) {
        if (userData.uid) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            nextCallElement.textContent = tomorrow.toLocaleDateString() + ' 12:00 AM';
        } else {
            nextCallElement.textContent = 'Setup Required';
        }
    }
    
    // Update last call time
    const lastCallElement = document.getElementById('lastCallTime');
    if (lastCallElement && userData.lastApiCall) {
        const lastCall = new Date(userData.lastApiCall);
        lastCallElement.textContent = lastCall.toLocaleDateString() + ' ' + lastCall.toLocaleTimeString();
    }
    
    // Update API history
    updateApiHistory(userData.apiResults || {});
    
    // Hide form if UID already exists
    if (userData.uid) {
        const form = document.getElementById('dashboardForm');
        if (form) {
            form.style.display = 'none';
            
            // Show automation active message
            const parentCard = form.closest('.dashboard-card');
            if (parentCard && !parentCard.querySelector('.automation-active')) {
                const activeDiv = document.createElement('div');
                activeDiv.className = 'automation-active';
                activeDiv.innerHTML = `
                    <div class="success-status">
                        <i class="fas fa-check-circle"></i>
                        <h4>Daily Automation Active</h4>
                        <p>UID: <strong>${userData.uid}</strong></p>
                        <p>Your account is set up for daily automated API calls at 12:00 AM.</p>
                    </div>
                `;
                parentCard.appendChild(activeDiv);
            }
        }
    }
}

function updateApiHistory(apiResults) {
    const historyContainer = document.getElementById('apiHistory');
    if (!historyContainer) return;
    
    const resultsArray = Object.values(apiResults || {});
    
    if (resultsArray.length === 0) {
        historyContainer.innerHTML = `
            <div class="no-data">
                <i class="fas fa-info-circle"></i>
                <p>No API calls yet. Submit your UID to start automation.</p>
            </div>
        `;
        return;
    }
    
    // Sort by timestamp descending
    resultsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    historyContainer.innerHTML = resultsArray.map(item => `
        <div class="history-item">
            <div>
                <div class="history-timestamp">${new Date(item.timestamp).toLocaleString()}</div>
                <div class="history-type">${item.type === 'manual' ? 'Manual Call' : 'Auto Call'}</div>
            </div>
            <div class="history-status ${item.result ? 'success' : 'error'}">
                ${item.result ? 'Success' : 'Failed'}
            </div>
        </div>
    `).join('');
}

// Admin Panel Functionality
function initializeAdmin() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (!adminLoginForm) return;
    
    // Check if already logged in
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showAdminDashboard();
    }
    
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        showLoading(submitButton);
        
        // Simple admin authentication (in production, use proper authentication)
        if (email === 'admin@example.com' && password === 'admin123') {
            sessionStorage.setItem('adminLoggedIn', 'true');
            showAdminDashboard();
        } else {
            alert('Invalid admin credentials');
        }
        
        hideLoading(submitButton);
    });
    
    // Admin logout
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('adminLoggedIn');
            adminLogin.classList.remove('hidden');
            adminDashboard.classList.add('hidden');
        });
    }
    
    // Refresh buttons
    const refreshUsersBtn = document.getElementById('refreshUsers');
    const refreshLogsBtn = document.getElementById('refreshLogs');
    const testAPIBtn = document.getElementById('testAPI');
    
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', loadAdminUsers);
    }
    
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', loadAdminLogs);
    }
    
    if (testAPIBtn) {
        testAPIBtn.addEventListener('click', testAPIEndpoint);
    }
}

async function showAdminDashboard() {
    const adminLogin = document.getElementById('adminLogin');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (adminLogin) adminLogin.classList.add('hidden');
    if (adminDashboard) adminDashboard.classList.remove('hidden');
    
    // Load admin data
    await loadAdminStats();
    await loadAdminUsers();
    await loadAdminLogs();
}

async function loadAdminStats() {
    try {
        await loadFirebase();
        
        const usersRef = database.ref('users');
        const snapshot = await usersRef.once('value');
        const users = snapshot.val() || {};
        
        const totalUsers = Object.keys(users).length;
        const paidUsers = Object.values(users).filter(user => user.paymentStatus).length;
        const freeUsers = totalUsers - paidUsers;
        
        // Calculate today's API calls
        const today = new Date().toDateString();
        let todayAPICalls = 0;
        
        Object.values(users).forEach(user => {
            if (user.apiResults) {
                Object.values(user.apiResults).forEach(result => {
                    if (new Date(result.timestamp).toDateString() === today) {
                        todayAPICalls++;
                    }
                });
            }
        });
        
        // Update stats display
        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('paidUsers').textContent = paidUsers;
        document.getElementById('freeUsers').textContent = freeUsers;
        document.getElementById('todayAPICalls').textContent = todayAPICalls;
        
    } catch (error) {
        console.error('Failed to load admin stats:', error);
    }
}

async function loadAdminUsers() {
    try {
        await loadFirebase();
        
        const usersRef = database.ref('users');
        const snapshot = await usersRef.once('value');
        const users = snapshot.val() || {};
        
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = Object.entries(users).map(([userId, user]) => `
            <tr>
                <td>${userId.substring(0, 15)}...</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="status-badge ${user.paymentStatus ? 'paid' : 'free'}">
                    ${user.paymentStatus ? 'Paid' : 'Free'}
                </span></td>
                <td>${user.uid || 'Not Set'}</td>
                <td>${user.paymentDate ? new Date(user.paymentDate).toLocaleDateString() : 'N/A'}</td>
                <td>${user.lastApiCall ? new Date(user.lastApiCall).toLocaleDateString() : 'Never'}</td>
                <td>
                    <button class="btn-small" onclick="viewUserDetails('${userId}')">View</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load admin users:', error);
    }
}

async function loadAdminLogs() {
    try {
        await loadFirebase();
        
        const usersRef = database.ref('users');
        const snapshot = await usersRef.once('value');
        const users = snapshot.val() || {};
        
        const logs = [];
        
        Object.entries(users).forEach(([userId, user]) => {
            if (user.apiResults) {
                Object.entries(user.apiResults).forEach(([logId, result]) => {
                    logs.push({
                        timestamp: result.timestamp,
                        userId: userId.substring(0, 15) + '...',
                        uid: user.uid || 'N/A',
                        status: result.result ? 'Success' : 'Failed',
                        response: result.result ? 'OK' : 'Error'
                    });
                });
            }
        });
        
        // Sort by timestamp descending
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const tbody = document.querySelector('#logsTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = logs.slice(0, 50).map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.userId}</td>
                <td>${log.uid}</td>
                <td><span class="status-badge ${log.status.toLowerCase()}">${log.status}</span></td>
                <td>${log.response}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load admin logs:', error);
    }
}

async function testAPIEndpoint() {
    const testAPIBtn = document.getElementById('testAPI');
    const apiStatus = document.getElementById('apiStatus');
    
    showLoading(testAPIBtn);
    
    try {
        const result = await callExternalAPI('test_uid_12345', true);
        
        apiStatus.innerHTML = `
            <span class="status-dot active"></span>
            <span>Active</span>
        `;
        
        alert('API test successful!');
        
    } catch (error) {
        apiStatus.innerHTML = `
            <span class="status-dot"></span>
            <span>Error</span>
        `;
        
        alert('API test failed: ' + error.message);
        
    } finally {
        hideLoading(testAPIBtn);
    }
}

function viewUserDetails(userId) {
    // Implementation for viewing user details modal
    alert(`Viewing details for user: ${userId}`);
}

// Page-specific initialization
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch (currentPage) {
        case 'free-mode.html':
            initializeFreeMode();
            break;
        case 'subscription.html':
            initializePayment();
            break;
        case 'dashboard.html':
            initializeDashboard();
            break;
        case 'admin.html':
        case 'admin':
            initializeAdmin();
            break;
        default:
            // Homepage - no specific initialization needed
            break;
    }
});

// Add CSS for status badges
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
    }
    .status-badge.paid {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
    }
    .status-badge.free {
        background: rgba(156, 163, 175, 0.2);
        color: #9ca3af;
    }
    .status-badge.success {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
    }
    .status-badge.failed {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
    }
    .success-message {
        text-align: center;
        padding: 30px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid #10b981;
        border-radius: 12px;
        margin-top: 20px;
    }
    .success-message i {
        font-size: 3rem;
        color: #10b981;
        margin-bottom: 15px;
        display: block;
    }
    .success-message h3 {
        color: #10b981;
        margin-bottom: 10px;
    }
    .success-status {
        text-align: center;
        padding: 20px;
    }
    .success-status i {
        font-size: 2rem;
        color: #10b981;
        margin-bottom: 10px;
        display: block;
    }
    .success-status h4 {
        color: #10b981;
        margin-bottom: 10px;
    }
`;
document.head.appendChild(style);
