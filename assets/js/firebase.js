// ============ AGRIMINDVEST - FIREBASE CONFIG & HELPERS ============

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAXV8tYVPflDCNnwO8GulVMU5_H7Zol6wo",
    authDomain: "agrimindvest.firebaseapp.com",
    projectId: "agrimindvest",
    storageBucket: "agrimindvest.firebasestorage.app",
    messagingSenderId: "360169224214",
    appId: "1:360169224214:web:4b9650ed0e9786771d9d37"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============ CONSTANTS ============
const ADMIN_EMAIL = 'agrimindvest@gmail.com';
const DEPOSIT_BANK = 'Safe Haven Microfinance Bank';
const DEPOSIT_ACCOUNT = '5012552807';
const DEPOSIT_NAME = 'PEERPURSETECHNO';
const WELCOME_BONUS = 300;
const WITHDRAWAL_FEE_PCT = 15;
const MIN_DEPOSIT = 5000;
const MIN_WITHDRAWAL = 500;

// ============ DEFAULT PLANS (Centralized) ============
const DEFAULT_PLANS = {
    sproutplus: { name: 'AGV Sprout Plus', price: 5000, perQ: 45, daily: 225, status: 'active' },
    sapling: { name: 'AGV Sapling', price: 7500, perQ: 67.5, daily: 337.5, status: 'active' },
    growth: { name: 'AGV Growth', price: 10000, perQ: 90, daily: 450, status: 'active' },
    harvest: { name: 'AGV Harvest', price: 15000, perQ: 135, daily: 675, status: 'active' },
    farmer: { name: 'AGV Farmer', price: 20000, perQ: 180, daily: 900, status: 'active' },
    pro: { name: 'AGV Pro', price: 30000, perQ: 270, daily: 1350, status: 'active' },
    elite: { name: 'AGV Elite', price: 50000, perQ: 450, daily: 2250, status: 'active' },
    premier: { name: 'AGV Premier', price: 75000, perQ: 675, daily: 3375, status: 'active' },
    executive: { name: 'AGV Executive', price: 100000, perQ: 900, daily: 4500, status: 'active' },
    investor: { name: 'AGV Investor', price: 125000, perQ: 1125, daily: 5625, status: 'active' },
    legend: { name: 'AGV Legend', price: 200000, perQ: 1800, daily: 9000, status: 'soldout' }
};

// ============ HELPER FUNCTIONS ============
function fmt(n) { 
    return '₦' + Number(n || 0).toLocaleString(); 
}

function toast(message, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) { 
        existing.classList.add('fade-out'); 
        setTimeout(() => existing.remove(), 300); 
    }
    const t = document.createElement('div'); 
    t.className = 'toast'; 
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => { 
        t.classList.add('fade-out'); 
        setTimeout(() => t.remove(), 300); 
    }, duration);
}

function generateRef(prefix = 'AGV') { 
    return prefix + '-' + Date.now().toString(36).toUpperCase().slice(-6); 
}

function generateUserId() { 
    return 'AGV-' + Date.now().toString(36).toUpperCase().slice(-8); 
}

// ============ AUTH CHECK ============
function checkAuth() {
    const userData = localStorage.getItem('agv_u');
    if (!userData) { 
        // Don't redirect if on public pages
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'index.html' && 
            currentPage !== 'register.html' && 
            currentPage !== '' &&
            currentPage !== 'login.html') {
            window.location.href = 'login.html';
        }
        return null; 
    }
    try { 
        return JSON.parse(userData); 
    } catch (e) {
        localStorage.removeItem('agv_u'); 
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'index.html' && 
            currentPage !== 'register.html' && 
            currentPage !== '' &&
            currentPage !== 'login.html') {
            window.location.href = 'login.html';
        }
        return null;
    }
}

function getCurrentUser() {
    const userData = localStorage.getItem('agv_u');
    if (!userData) return null;
    try { 
        return JSON.parse(userData); 
    } catch (e) { 
        return null; 
    }
}

async function refreshUser() {
    const user = getCurrentUser();
    if (!user || !user.id) return null;
    try {
        const doc = await db.collection('users').doc(user.id).get();
        if (doc.exists) {
            const updatedUser = { id: doc.id, ...doc.data() };
            localStorage.setItem('agv_u', JSON.stringify(updatedUser));
            return updatedUser;
        }
        return user;
    } catch (error) {
        console.error('Refresh user error:', error);
        return user;
    }
}

// ============ PLAN HELPERS ============

function hasActivePlan(user) {
    if (!user) return false;
    if (!user.ownedPlans || user.ownedPlans.length === 0) return false;
    if (user.expiryDate) {
        return new Date(user.expiryDate) > new Date();
    }
    return true;
}

async function getActivePlans() {
    try {
        const snap = await db.collection('settings').doc('plans').get();
        if (!snap.exists) {
            await db.collection('settings').doc('plans').set(DEFAULT_PLANS);
            return DEFAULT_PLANS;
        }
        const allPlans = snap.data(); 
        const active = {};
        Object.keys(allPlans).forEach(key => { 
            if (allPlans[key].status === 'active') active[key] = allPlans[key]; 
        });
        return Object.keys(active).length > 0 ? active : DEFAULT_PLANS;
    } catch (error) {
        console.error('getActivePlans error:', error);
        return DEFAULT_PLANS;
    }
}

async function getAllPlans() {
    try {
        const snap = await db.collection('settings').doc('plans').get();
        
        if (!snap.exists) {
            console.log('No plans found. Creating default plans...');
            await db.collection('settings').doc('plans').set(DEFAULT_PLANS);
            return DEFAULT_PLANS;
        }
        
        const plans = snap.data();
        
        let needsUpdate = false;
        const updatedPlans = { ...plans };
        Object.keys(DEFAULT_PLANS).forEach(key => {
            if (!updatedPlans[key]) {
                updatedPlans[key] = DEFAULT_PLANS[key];
                needsUpdate = true;
                console.log('Adding missing plan:', key);
            }
        });
        
        if (needsUpdate) {
            await db.collection('settings').doc('plans').set(updatedPlans);
            return updatedPlans;
        }
        
        return plans;
    } catch (error) {
        console.error('getAllPlans error:', error);
        return DEFAULT_PLANS;
    }
}

async function ensurePlansExist() {
    try {
        const snap = await db.collection('settings').doc('plans').get();
        if (!snap.exists) {
            await db.collection('settings').doc('plans').set(DEFAULT_PLANS);
            console.log('Default plans created');
            return true;
        }
        return true;
    } catch (error) {
        console.error('ensurePlansExist error:', error);
        return false;
    }
}

function calculatePerQuestion(user, plans) {
    if (!user || !user.ownedPlans || !plans) return 0;
    let total = 0; 
    const planCounts = {};
    (user.ownedPlans || []).forEach(p => { 
        planCounts[p] = (planCounts[p] || 0) + 1; 
    });
    Object.keys(planCounts).forEach(planKey => { 
        if (plans[planKey]) total += plans[planKey].perQ * planCounts[planKey]; 
    });
    return total;
}

// ============ TASK HELPERS (NEW) ============

// ✅ Save tasks to Firestore
async function saveUserTasks(userId, date, tasks) {
    try {
        await db.collection('userTasks').doc(userId + '_' + date).set({
            userId: userId,
            date: date,
            tasks: tasks,
            completedCount: tasks.filter(t => t.done).length,
            totalEarned: tasks.reduce((sum, t) => sum + (t.earned || 0), 0),
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Save tasks error:', error);
        return false;
    }
}

// ✅ Load tasks from Firestore
async function loadUserTasks(userId, date) {
    try {
        const doc = await db.collection('userTasks').doc(userId + '_' + date).get();
        if (doc.exists) {
            return doc.data().tasks || [];
        }
        return [];
    } catch (error) {
        console.error('Load tasks error:', error);
        return [];
    }
}

// ✅ Get all user tasks for a specific date (for admin)
async function getAllUserTasksForDate(date) {
    try {
        const snapshot = await db.collection('userTasks')
            .where('date', '==', date)
            .get();
        
        const results = [];
        snapshot.forEach(doc => {
            results.push({ id: doc.id, ...doc.data() });
        });
        return results;
    } catch (error) {
        console.error('Get all user tasks error:', error);
        return [];
    }
}

// ✅ Sync tasks: Firestore first, localStorage fallback
async function syncUserTasks(userId, date) {
    let tasks = await loadUserTasks(userId, date);
    
    if (!tasks || tasks.length === 0) {
        const saved = JSON.parse(localStorage.getItem('agv_t_' + date) || '{}');
        tasks = saved[userId] || [];
        
        if (tasks.length > 0) {
            await saveUserTasks(userId, date, tasks);
        }
    }
    
    const saved = JSON.parse(localStorage.getItem('agv_t_' + date) || '{}');
    saved[userId] = tasks;
    localStorage.setItem('agv_t_' + date, JSON.stringify(saved));
    
    return tasks;
}

// ============ WITHDRAWAL HELPERS ============

async function canWithdrawToday(userId) {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const snapshot = await db.collection('withdrawals')
            .where('userId', '==', userId)
            .get();
        
        let todayCount = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.date && data.date >= todayStr) {
                todayCount++;
            }
        });
        
        const w = await db.collection('settings').doc('withdrawalSettings').get();
        const settings = w.exists ? w.data() : {};
        const day = today.getDay();
        let maxPerDay = 1;
        if (day === 0 || day === 6) { 
            maxPerDay = settings.max_weekend || 2; 
        } else { 
            maxPerDay = settings.max_weekday || 1; 
        }
        return todayCount < maxPerDay;
    } catch (error) {
        console.error('Can withdraw today error:', error);
        return false;
    }
}

async function isWithdrawalWindowOpen() {
    try {
        const w = await db.collection('settings').doc('withdrawalSettings').get();
        if (!w.exists) {
            const d = new Date();
            return d.getDay() >= 1 && d.getDay() <= 5 && d.getHours() >= 10 && d.getHours() < 22;
        }
        const settings = w.data();
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const startTime = settings.start_time ? 
            parseInt(settings.start_time.split(':')[0]) * 60 + parseInt(settings.start_time.split(':')[1]) : 600;
        const endTime = settings.end_time ? 
            parseInt(settings.end_time.split(':')[0]) * 60 + parseInt(settings.end_time.split(':')[1]) : 1320;
        return currentTime >= startTime && currentTime < endTime;
    } catch (error) {
        console.error('Withdrawal window check error:', error);
        return false;
    }
}

// ============ FIREBASE HELPERS ============

async function getDoc(collection, docId) { 
    try {
        const doc = await db.collection(collection).doc(docId).get(); 
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
        console.error('getDoc error:', error);
        return null;
    }
}

async function setDoc(collection, docId, data) { 
    try {
        await db.collection(collection).doc(docId).set({ 
            ...data, 
            updatedAt: new Date().toISOString() 
        }); 
    } catch (error) {
        console.error('setDoc error:', error);
        throw error;
    }
}

async function updateDoc(collection, docId, data) { 
    try {
        await db.collection(collection).doc(docId).update({ 
            ...data, 
            updatedAt: new Date().toISOString() 
        }); 
    } catch (error) {
        console.error('updateDoc error:', error);
        throw error;
    }
}

async function getCollection(collectionName) { 
    try {
        const snapshot = await db.collection(collectionName).get(); 
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
    } catch (error) {
        console.error('getCollection error:', error);
        return [];
    }
}

async function deleteDoc(collection, docId) { 
    try {
        await db.collection(collection).doc(docId).delete(); 
    } catch (error) {
        console.error('deleteDoc error:', error);
        throw error;
    }
}

// ============ EMAIL NOTIFICATION ============

async function sendAdminEmail(subject, message) {
    try {
        const formData = new FormData(); 
        formData.append('email', ADMIN_EMAIL);
        formData.append('_subject', subject); 
        formData.append('_template', 'box');
        formData.append('message', message);
        await fetch('https://formsubmit.co/ajax/' + ADMIN_EMAIL, { 
            method: 'POST', 
            body: formData 
        });
        return true;
    } catch (e) { 
        console.error('Email send error:', e);
        return false; 
    }
}

// ============ ANIMATIONS ============

function animateCountUp(element, target, duration = 800) {
    const start = 0; 
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime; 
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * eased);
        element.textContent = fmt(current);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function staggerCards(selector, baseDelay = 0.05) {
    document.querySelectorAll(selector).forEach((card, i) => { 
        card.style.animationDelay = (i * baseDelay) + 's'; 
        card.style.opacity = '1'; 
    });
}

// ============ EXPOSE GLOBALLY ============
window.fmt = fmt;
window.toast = toast;
window.generateRef = generateRef;
window.generateUserId = generateUserId;
window.checkAuth = checkAuth;
window.getCurrentUser = getCurrentUser;
window.refreshUser = refreshUser;
window.hasActivePlan = hasActivePlan;
window.getActivePlans = getActivePlans;
window.getAllPlans = getAllPlans;
window.ensurePlansExist = ensurePlansExist;
window.calculatePerQuestion = calculatePerQuestion;
window.canWithdrawToday = canWithdrawToday;
window.isWithdrawalWindowOpen = isWithdrawalWindowOpen;
window.getDoc = getDoc;
window.setDoc = setDoc;
window.updateDoc = updateDoc;
window.getCollection = getCollection;
window.deleteDoc = deleteDoc;
window.sendAdminEmail = sendAdminEmail;
window.animateCountUp = animateCountUp;
window.staggerCards = staggerCards;

// ✅ NEW: Task helpers exposed
window.saveUserTasks = saveUserTasks;
window.loadUserTasks = loadUserTasks;
window.getAllUserTasksForDate = getAllUserTasksForDate;
window.syncUserTasks = syncUserTasks;

// Constants
window.DEFAULT_PLANS = DEFAULT_PLANS;
window.ADMIN_EMAIL = ADMIN_EMAIL;
window.DEPOSIT_BANK = DEPOSIT_BANK;
window.DEPOSIT_ACCOUNT = DEPOSIT_ACCOUNT;
window.DEPOSIT_NAME = DEPOSIT_NAME;
window.WELCOME_BONUS = WELCOME_BONUS;
window.WITHDRAWAL_FEE_PCT = WITHDRAWAL_FEE_PCT;
window.MIN_DEPOSIT = MIN_DEPOSIT;
window.MIN_WITHDRAWAL = MIN_WITHDRAWAL;

console.log('🌱 Agrimindvest Firebase Ready');
console.log('📋 Functions loaded:', Object.keys(window).filter(k => 
    typeof window[k] === 'function' && 
    ['fmt','toast','checkAuth','getCurrentUser','refreshUser','hasActivePlan',
     'getActivePlans','getAllPlans','ensurePlansExist','calculatePerQuestion',
     'canWithdrawToday','isWithdrawalWindowOpen','getDoc','setDoc','updateDoc',
     'getCollection','deleteDoc','sendAdminEmail','animateCountUp','staggerCards',
     'saveUserTasks','loadUserTasks','getAllUserTasksForDate','syncUserTasks'
    ].includes(k)
));
