// ============ AGRIMINDVEST - SUPABASE CONFIG & HELPERS ============
// Drop-in replacement for firebase.js
// Uses @supabase/supabase-js (loaded via CDN in HTML)

const SUPABASE_URL = 'https://nnbriglozlojgtawempq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYnJpZ2xvemxvamd0YXdlbXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4Njk5MTQsImV4cCI6MjEwNTQ0NTkxNH0.f6K2r6GisAVv9_QV-nPCGs6eJM8z8YpiAJn2KNYpEgE';

// Create the Supabase client (uses global from CDN: window.supabase)
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ CONSTANTS ============
const ADMIN_EMAIL = 'agrimindvest@gmail.com';
const DEPOSIT_BANK = 'Safe Haven Microfinance Bank';
const DEPOSIT_ACCOUNT = '5012552807';
const DEPOSIT_NAME = 'PEERPURSETECHNO';
const WELCOME_BONUS = 300;
const WITHDRAWAL_FEE_PCT = 15;
const MIN_DEPOSIT = 5000;
const MIN_WITHDRAWAL = 500;

// ============ DEFAULT PLANS ============
const DEFAULT_PLANS = {
    sproutplus: { name: 'AGV Sprout Plus', price: 5000, perQ: 45, daily: 225, status: 'active' },
    sapling:    { name: 'AGV Sapling',    price: 7500, perQ: 67.5, daily: 337.5, status: 'active' },
    growth:     { name: 'AGV Growth',     price: 10000, perQ: 90, daily: 450, status: 'active' },
    harvest:    { name: 'AGV Harvest',    price: 15000, perQ: 135, daily: 675, status: 'active' },
    farmer:     { name: 'AGV Farmer',     price: 20000, perQ: 180, daily: 900, status: 'active' },
    pro:        { name: 'AGV Pro',        price: 30000, perQ: 270, daily: 1350, status: 'active' },
    elite:      { name: 'AGV Elite',      price: 50000, perQ: 450, daily: 2250, status: 'active' },
    premier:    { name: 'AGV Premier',    price: 75000, perQ: 675, daily: 3375, status: 'active' },
    executive:  { name: 'AGV Executive',  price: 100000, perQ: 900, daily: 4500, status: 'active' },
    investor:   { name: 'AGV Investor',   price: 125000, perQ: 1125, daily: 5625, status: 'active' },
    legend:     { name: 'AGV Legend',     price: 200000, perQ: 1800, daily: 9000, status: 'soldout' }
};

// ============ HELPERS ============
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

// Convert snake_case (DB) <-> camelCase (JS) for a plain object
function snakeToCamel(obj) {
    if (Array.isArray(obj)) return obj.map(snakeToCamel);
    if (obj === null || typeof obj !== 'object') return obj;
    const out = {};
    for (const k in obj) {
        const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        out[camel] = snakeToCamel(obj[k]);
    }
    return out;
}
function camelToSnake(obj) {
    if (Array.isArray(obj)) return obj.map(camelToSnake);
    if (obj === null || typeof obj !== 'object') return obj;
    const out = {};
    for (const k in obj) {
        const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
        out[snake] = camelToSnake(obj[k]);
    }
    return out;
}

// ============ AUTH CHECK ============
function checkAuth() {
    const userData = localStorage.getItem('agv_u');
    if (!userData) {
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
        window.location.href = 'login.html';
        return null;
    }
}

function getCurrentUser() {
    const userData = localStorage.getItem('agv_u');
    if (!userData) return null;
    try { return JSON.parse(userData); } catch (e) { return null; }
}

async function refreshUser() {
    const user = getCurrentUser();
    if (!user || !user.id) return null;
    try {
        const { data, error } = await _supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        if (error) throw error;
        if (data) {
            const updatedUser = { id: data.id, ...snakeToCamel(data) };
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
        const { data, error } = await _supabase
            .from('settings')
            .select('value')
            .eq('key', 'plans')
            .maybeSingle();
        if (error) throw error;

        let allPlans = data?.value || {};
        if (!allPlans || Object.keys(allPlans).length === 0) {
            await _supabase.from('settings')
                .upsert({ key: 'plans', value: DEFAULT_PLANS });
            return DEFAULT_PLANS;
        }

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
        const { data, error } = await _supabase
            .from('settings')
            .select('value')
            .eq('key', 'plans')
            .maybeSingle();
        if (error) throw error;

        if (!data || !data.value || Object.keys(data.value).length === 0) {
            await _supabase.from('settings')
                .upsert({ key: 'plans', value: DEFAULT_PLANS });
            return DEFAULT_PLANS;
        }

        const plans = data.value;
        const updatedPlans = { ...plans };
        let needsUpdate = false;
        Object.keys(DEFAULT_PLANS).forEach(key => {
            if (!updatedPlans[key]) {
                updatedPlans[key] = DEFAULT_PLANS[key];
                needsUpdate = true;
            }
        });
        if (needsUpdate) {
            await _supabase.from('settings')
                .upsert({ key: 'plans', value: updatedPlans });
            return updatedPlans;
        }
        return plans;
    } catch (error) {
        console.error('getAllPlans error:', error);
        return DEFAULT_PLANS;
    }
}

async function ensurePlansExist() {
    return await getAllPlans() !== null;
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

// ============ TASK HELPERS ============
async function saveUserTasks(userId, date, tasks) {
    try {
        const completedCount = tasks.filter(t => t.done).length;
        const totalEarned = tasks.reduce((sum, t) => sum + (t.earned || 0), 0);
        const { error } = await _supabase
            .from('user_tasks')
            .upsert({
                user_id: userId,
                date: date,
                tasks: tasks,
                completed_count: completedCount,
                total_earned: totalEarned,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,date' });
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Save tasks error:', error);
        return false;
    }
}

async function loadUserTasks(userId, date) {
    try {
        const { data, error } = await _supabase
            .from('user_tasks')
            .select('tasks')
            .eq('user_id', userId)
            .eq('date', date)
            .maybeSingle();
        if (error) throw error;
        return data?.tasks || [];
    } catch (error) {
        console.error('Load tasks error:', error);
        return [];
    }
}

async function syncUserTasks(userId, date) {
    try {
        const { data, error } = await _supabase
            .from('user_tasks')
            .select('tasks')
            .eq('user_id', userId)
            .eq('date', date)
            .maybeSingle();
        if (error) throw error;

        if (data) {
            const tasks = data.tasks || [];
            const saved = JSON.parse(localStorage.getItem('agv_t_' + date) || '{}');
            saved[userId] = tasks;
            localStorage.setItem('agv_t_' + date, JSON.stringify(saved));
            return tasks;
        }

        const saved = JSON.parse(localStorage.getItem('agv_t_' + date) || '{}');
        const tasks = saved[userId] || [];
        if (tasks.length > 0) {
            await saveUserTasks(userId, date, tasks);
        }
        return tasks;
    } catch (error) {
        console.error('Sync tasks error:', error);
        const saved = JSON.parse(localStorage.getItem('agv_t_' + date) || '{}');
        return saved[userId] || [];
    }
}

async function getAllUserTasksForDate(date) {
    try {
        const { data, error } = await _supabase
            .from('user_tasks')
            .select('*')
            .eq('date', date);
        if (error) throw error;
        return (data || []).map(r => snakeToCamel(r));
    } catch (error) {
        console.error('Get all user tasks error:', error);
        return [];
    }
}

// ============ WITHDRAWAL HELPERS ============
async function canWithdrawToday(userId) {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data, error } = await _supabase
            .from('withdrawals')
            .select('id, date')
            .eq('user_id', userId)
            .gte('date', todayStr);
        if (error) throw error;

        const todayCount = (data || []).length;

        const { data: settingsRow } = await _supabase
            .from('settings').select('value').eq('key', 'withdrawalSettings').maybeSingle();
        const settings = settingsRow?.value || {};

        const day = new Date().getDay();
        const maxPerDay = (day === 0 || day === 6)
            ? (settings.max_weekend || 2)
            : (settings.max_weekday || 1);

        return todayCount < maxPerDay;
    } catch (error) {
        console.error('Can withdraw today error:', error);
        return false;
    }
}

async function isWithdrawalWindowOpen() {
    try {
        const { data } = await _supabase
            .from('settings').select('value').eq('key', 'withdrawalSettings').maybeSingle();
        const settings = data?.value || {};
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const startTime = settings.start_time
            ? parseInt(settings.start_time.split(':')[0]) * 60 + parseInt(settings.start_time.split(':')[1])
            : 600;
        const endTime = settings.end_time
            ? parseInt(settings.end_time.split(':')[0]) * 60 + parseInt(settings.end_time.split(':')[1])
            : 1320;
        return currentTime >= startTime && currentTime < endTime;
    } catch (error) {
        console.error('Withdrawal window check error:', error);
        return false;
    }
}

// ============ GENERIC HELPERS ============
async function getDoc(collection, docId) {
    try {
        let query = _supabase.from(collection).select('*');
        if (collection === 'settings') {
            query = query.eq('key', docId);
        } else {
            query = query.eq('id', docId);
        }
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        if (!data) return null;
        if (collection === 'settings') return { key: data.key, ...(data.value || {}) };
        return { id: data.id, ...snakeToCamel(data) };
    } catch (error) {
        console.error('getDoc error:', error);
        return null;
    }
}

async function setDoc(collection, docId, data) {
    try {
        if (collection === 'settings') {
            await _supabase.from(collection).upsert({
                key: docId,
                value: data,
                updated_at: new Date().toISOString()
            });
        } else {
            const payload = { ...camelToSnake(data), id: docId, updated_at: new Date().toISOString() };
            await _supabase.from(collection).upsert(payload, { onConflict: 'id' });
        }
    } catch (error) {
        console.error('setDoc error:', error);
        throw error;
    }
}

async function updateDoc(collection, docId, data) {
    try {
        if (collection === 'settings') {
            // merge
            const existing = await getDoc('settings', docId);
            const merged = { ...(existing || {}), ...data };
            delete merged.key;
            await _supabase.from(collection).upsert({
                key: docId,
                value: merged,
                updated_at: new Date().toISOString()
            });
        } else {
            const payload = { ...camelToSnake(data), updated_at: new Date().toISOString() };
            const { error } = await _supabase.from(collection).update(payload).eq('id', docId);
            if (error) throw error;
        }
    } catch (error) {
        console.error('updateDoc error:', error);
        throw error;
    }
}

async function getCollection(collectionName) {
    try {
        const { data, error } = await _supabase.from(collectionName).select('*');
        if (error) throw error;
        return (data || []).map(r => {
            if (collectionName === 'settings') return { key: r.key, ...(r.value || {}) };
            return { id: r.id, ...snakeToCamel(r) };
        });
    } catch (error) {
        console.error('getCollection error:', error);
        return [];
    }
}

async function deleteDoc(collection, docId) {
    try {
        if (collection === 'settings') {
            await _supabase.from(collection).delete().eq('key', docId);
        } else {
            await _supabase.from(collection).delete().eq('id', docId);
        }
    } catch (error) {
        console.error('deleteDoc error:', error);
        throw error;
    }
}

// ============ ADD HELPERS (for inserts without an ID) ============
async function addDoc(collection, data) {
    try {
        const payload = camelToSnake(data);
        const { data: inserted, error } = await _supabase
            .from(collection).insert(payload).select().single();
        if (error) throw error;
        return { id: inserted.id, ...snakeToCamel(inserted) };
    } catch (error) {
        console.error('addDoc error:', error);
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
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(0 + (target - 0) * eased);
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
window.sb = _supabase; // direct access when needed
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
window.addDoc = addDoc;
window.sendAdminEmail = sendAdminEmail;
window.animateCountUp = animateCountUp;
window.staggerCards = staggerCards;

window.saveUserTasks = saveUserTasks;
window.loadUserTasks = loadUserTasks;
window.getAllUserTasksForDate = getAllUserTasksForDate;
window.syncUserTasks = syncUserTasks;

window.DEFAULT_PLANS = DEFAULT_PLANS;
window.ADMIN_EMAIL = ADMIN_EMAIL;
window.DEPOSIT_BANK = DEPOSIT_BANK;
window.DEPOSIT_ACCOUNT = DEPOSIT_ACCOUNT;
window.DEPOSIT_NAME = DEPOSIT_NAME;
window.WELCOME_BONUS = WELCOME_BONUS;
window.WITHDRAWAL_FEE_PCT = WITHDRAWAL_FEE_PCT;
window.MIN_DEPOSIT = MIN_DEPOSIT;
window.MIN_WITHDRAWAL = MIN_WITHDRAWAL;

console.log('🌱 Agrimindvest Supabase Ready');
