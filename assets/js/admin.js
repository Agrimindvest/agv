// ============ AGRIMINDVEST - ADMIN LOGIC (COMPLETE) ============

const ADMIN_CREDENTIALS = { email: 'agrimindvest@gmail.com', pass: 'LEGALCHECKVERSION1.0' };
let isAdminLoggedIn = false;

// ============ LOGIN / LOGOUT ============
function adminLogin() {
    const email = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value;
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.pass) {
        isAdminLoggedIn = true;
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('sidebar').style.display = 'block';
        document.getElementById('mainContent').style.display = 'block';
        loadDashboard();
        toast('Welcome Admin');
    } else { toast('Access Denied'); }
}

function adminLogout() {
    isAdminLoggedIn = false;
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('adminUser').value = '';
    document.getElementById('adminPass').value = '';
}

// ============ NAVIGATION ============
function switchSection(section) {
    document.querySelectorAll('.admin-sidebar .nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.admin-sidebar .nav-item[data-section="${section}"]`)?.classList.add('active');
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + section).classList.add('active');
    document.getElementById('sectionTitle').textContent = document.querySelector(`.admin-sidebar .nav-item[data-section="${section}"]`)?.textContent.trim() || '';
    if (section === 'dashboard') loadDashboard();
    if (section === 'users') loadUsers();
    if (section === 'deposits') loadDeposits();
    if (section === 'withdrawals') loadWithdrawals();
    if (section === 'content') loadContent();
    if (section === 'referrals') loadReferrals();
    if (section === 'tasks') loadTaskReports();
    if (section === 'plans') loadPlansAdmin();
    if (section === 'notices') loadNotices();
    if (section === 'settings') loadSettingsData();
}

document.querySelectorAll('.admin-sidebar .nav-item[data-section]').forEach(item => {
    item.addEventListener('click', function() { switchSection(this.dataset.section); });
});

// ============ DASHBOARD ============
async function loadDashboard() {
    try {
        const users = await getCollection('users');
        const payments = await db.collection('payments').where('status', '==', 'approved').get();
        const withdrawals = await db.collection('withdrawals').where('status', '==', 'approved').get();
        const pendingDep = await db.collection('deposits').where('status', '==', 'pending').get();
        const pendingWth = await db.collection('withdrawals').where('status', '==', 'pending').get();
        document.getElementById('sUsers').textContent = users.length;
        document.getElementById('sActive').textContent = users.filter(u => u.plan && u.plan !== 'none').length;
        document.getElementById('sInvested').textContent = fmt(payments.docs.reduce((s, d) => s + (d.data().amount || 0), 0));
        document.getElementById('sPaid').textContent = fmt(withdrawals.docs.reduce((s, d) => s + (d.data().amount || 0), 0));
        document.getElementById('sPendingDep').textContent = pendingDep.size;
        document.getElementById('sPendingWth').textContent = pendingWth.size;
    } catch (error) {
        console.error('Dashboard error:', error);
        toast('Error loading dashboard');
    }
}

// ============ USERS ============
async function loadUsers() {
    try {
        const users = await getCollection('users');
        const search = (document.getElementById('userSearch')?.value || '').toLowerCase();
        let html = '';
        if (users.length === 0) {
            html = '<tr><td colspan="8" style="text-align:center;color:var(--text-dim);">No users found</td></tr>';
        } else {
            users.forEach(u => {
                if (search && !u.name?.toLowerCase().includes(search) && !u.email?.includes(search)) return;
                const statusClass = u.status === 'active' ? 'success' : 'danger';
                html += `<tr>
                    <td>${u.id}</td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.phone}</td>
                    <td>${u.plan || 'None'}</td>
                    <td>${fmt(u.balance || 0)}</td>
                    <td><span class="badge badge-${statusClass}">${u.status || 'active'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="editUser('${u.id}')">Edit</button>
                        <button class="btn btn-success btn-sm" onclick="quickAdd('${u.id}','${u.name}')">+₦</button>
                    </td>
                </tr>`;
            });
        }
        document.getElementById('usersTable').innerHTML = html;
    } catch (error) {
        console.error('Load users error:', error);
        document.getElementById('usersTable').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger);">Error loading users</td></tr>';
    }
}

async function quickAdd(id, name) {
    const amount = prompt('Add balance to ' + name + '\n\nAmount (₦):', '500');
    if (!amount) return;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return toast('Invalid amount');
    if (!confirm('Add ₦' + amt.toLocaleString() + ' to ' + name + '?')) return;
    try {
        await db.collection('users').doc(id).update({ 
            balance: firebase.firestore.FieldValue.increment(amt) 
        });
        await db.collection('deposits').add({ 
            userId: id, 
            userName: name, 
            amount: amt, 
            channel: 'admin', 
            date: new Date().toISOString(), 
            status: 'approved', 
            ref: 'ADMIN-BONUS' 
        });
        toast('✅ Added ₦' + amt.toLocaleString());
        loadUsers(); 
        loadDashboard();
    } catch (error) {
        console.error('Quick add error:', error);
        toast('❌ Failed to add balance');
    }
}

async function editUser(id) {
    try {
        const u = await getDoc('users', id);
        if (!u) return toast('User not found');
        const action = prompt(`Edit: ${u.name}\nBalance: ${fmt(u.balance)}\nPlan: ${u.plan || 'None'}\nStatus: ${u.status}\n\nCommands:\n"status active/suspended"\n"add 5000"\n"remove 2000"\n"plan pro/none"`);
        if (!action) return;
        const parts = action.trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const val = parts[1];
        
        if (cmd === 'status' && ['active', 'suspended'].includes(val)) { 
            await db.collection('users').doc(id).update({ status: val }); 
            toast('✅ Status: ' + val); 
        }
        else if (cmd === 'add' && parseInt(val) > 0) { 
            const addAmount = parseInt(val);
            await db.collection('users').doc(id).update({ 
                balance: firebase.firestore.FieldValue.increment(addAmount) 
            }); 
            toast('✅ Added ₦' + addAmount.toLocaleString()); 
        }
        else if (cmd === 'remove' && parseInt(val) > 0) { 
            const removeAmount = parseInt(val);
            const currentBalance = u.balance || 0;
            if (removeAmount > currentBalance) {
                toast('❌ User only has ' + fmt(currentBalance) + '. Cannot remove more.');
                return;
            }
            await db.collection('users').doc(id).update({ 
                balance: firebase.firestore.FieldValue.increment(-removeAmount) 
            }); 
            toast('✅ Removed ₦' + removeAmount.toLocaleString()); 
        }
        else if (cmd === 'plan') {
            if (val === 'none') { 
                await db.collection('users').doc(id).update({ plan: 'none', invested: false }); 
                toast('✅ Plan removed'); 
            } else { 
                const plansDoc = await db.collection('settings').doc('plans').get();
                const plans = plansDoc.exists ? plansDoc.data() : {};
                if (plans[val]) { 
                    const exp = new Date(); 
                    exp.setDate(exp.getDate() + 365); 
                    await db.collection('users').doc(id).update({ 
                        plan: val, 
                        expiryDate: exp.toISOString(), 
                        invested: true,
                        ownedPlans: firebase.firestore.FieldValue.arrayUnion(val)
                    }); 
                    toast('✅ Plan: ' + plans[val].name); 
                } else { 
                    toast('❌ Plan not found'); 
                } 
            }
        } else {
            toast('❌ Unknown command. Use: status, add, remove, or plan');
        }
        loadUsers(); 
        loadDashboard();
    } catch (error) {
        console.error('Edit user error:', error);
        toast('❌ Error editing user');
    }
}

// ============ DEPOSITS ============
async function loadDeposits() {
    try {
        const snapshot = await db.collection('deposits').orderBy('date', 'desc').limit(50).get();
        const search = (document.getElementById('depositSearch')?.value || '').toLowerCase();
        let html = '';
        if (snapshot.empty) {
            html = '<tr><td colspan="8" style="text-align:center;color:var(--text-dim);">No deposits found</td></tr>';
        } else {
            snapshot.forEach(d => {
                const dep = d.data();
                const userName = dep.userName || dep.userId || '';
                if (search && !userName.toLowerCase().includes(search) && !dep.ref?.toLowerCase().includes(search)) return;
                const statusClass = dep.status === 'approved' ? 'success' : dep.status === 'pending' ? 'warning' : 'danger';
                const statusLabel = dep.status === 'approved' ? '✅ Approved' : dep.status === 'pending' ? '⏳ Pending' : '❌ Rejected';
                html += `<tr>
                    <td>${userName}</td>
                    <td>${fmt(dep.amount)}</td>
                    <td>${dep.ref || '-'}</td>
                    <td>${dep.payerName || '-'}</td>
                    <td>${dep.payerAccount || '-'}</td>
                    <td>${new Date(dep.date).toLocaleDateString()}</td>
                    <td><span class="badge badge-${statusClass}">${statusLabel}</span></td>
                    <td>
                        ${dep.status === 'pending' ? 
                            `<button class="btn btn-success btn-sm" onclick="approveDeposit('${d.id}')">Approve</button>
                             <button class="btn btn-danger btn-sm" onclick="rejectDeposit('${d.id}')">Reject</button>` : 
                            '✅ Processed'}
                    </td>
                </tr>`;
            });
        }
        document.getElementById('depositsTable').innerHTML = html;
    } catch (error) {
        console.error('Load deposits error:', error);
        document.getElementById('depositsTable').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger);">Error loading deposits</td></tr>';
    }
}

async function approveDeposit(id) {
    if (!confirm('✅ Approve this deposit?')) return;
    try {
        const dep = await getDoc('deposits', id);
        if (!dep) {
            toast('❌ Deposit not found');
            return;
        }
        await db.collection('deposits').doc(id).update({ 
            status: 'approved',
            processedAt: new Date().toISOString()
        });
        await db.collection('users').doc(dep.userId).update({
            balance: firebase.firestore.FieldValue.increment(dep.amount)
        });
        toast('✅ Deposit approved! ₦' + dep.amount.toLocaleString() + ' added to user balance');
        loadDeposits();
        loadDashboard();
    } catch (error) {
        console.error('Approve deposit error:', error);
        toast('❌ Failed to approve deposit: ' + error.message);
    }
}

async function rejectDeposit(id) {
    if (!confirm('❌ Reject this deposit?')) return;
    try {
        await db.collection('deposits').doc(id).update({ 
            status: 'rejected',
            processedAt: new Date().toISOString()
        });
        toast('❌ Deposit rejected');
        loadDeposits();
        loadDashboard();
    } catch (error) {
        console.error('Reject deposit error:', error);
        toast('❌ Failed to reject deposit: ' + error.message);
    }
}

// ============ WITHDRAWALS ============
async function loadWithdrawals() {
    try {
        const snapshot = await db.collection('withdrawals').orderBy('date', 'desc').limit(50).get();
        const search = (document.getElementById('withdrawalSearch')?.value || '').toLowerCase();
        let html = '';
        if (snapshot.empty) {
            html = '<tr><td colspan="8" style="text-align:center;color:var(--text-dim);">No withdrawals found</td></tr>';
        } else {
            snapshot.forEach(d => {
                const w = d.data();
                const userName = w.userName || w.userId || '';
                if (search && !userName.toLowerCase().includes(search) && !w.bankName?.toLowerCase().includes(search)) return;
                const statusClass = w.status === 'approved' ? 'success' : w.status === 'pending' ? 'warning' : 'danger';
                const statusLabel = w.status === 'approved' ? '✅ Approved' : w.status === 'pending' ? '⏳ Pending' : '❌ Rejected';
                html += `<tr>
                    <td>${userName}</td>
                    <td>${fmt(w.amount)}</td>
                    <td>${fmt(w.fee)}</td>
                    <td>${fmt(w.net)}</td>
                    <td>${w.bankName || '-'}<br><small>${w.acctNo || ''}</small></td>
                    <td>${new Date(w.date).toLocaleDateString()}</td>
                    <td><span class="badge badge-${statusClass}">${statusLabel}</span></td>
                    <td>
                        ${w.status === 'pending' ? 
                            `<button class="btn btn-success btn-sm" onclick="approveWithdrawal('${d.id}')">Approve</button>
                             <button class="btn btn-danger btn-sm" onclick="rejectWithdrawal('${d.id}')">Reject</button>` : 
                            '✅ Processed'}
                    </td>
                </tr>`;
            });
        }
        document.getElementById('withdrawalsTable').innerHTML = html;
    } catch (error) {
        console.error('Load withdrawals error:', error);
        document.getElementById('withdrawalsTable').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger);">Error loading withdrawals</td></tr>';
    }
}

async function approveWithdrawal(id) {
    if (!confirm('✅ Approve this withdrawal?')) return;
    try {
        const w = await getDoc('withdrawals', id);
        if (!w) {
            toast('❌ Withdrawal not found');
            return;
        }
        await db.collection('withdrawals').doc(id).update({ 
            status: 'approved',
            processedAt: new Date().toISOString()
        });
        toast('✅ Withdrawal approved! ₦' + w.net.toLocaleString() + ' will be sent to user');
        loadWithdrawals();
        loadDashboard();
    } catch (error) {
        console.error('Approve withdrawal error:', error);
        toast('❌ Failed to approve withdrawal: ' + error.message);
    }
}

async function rejectWithdrawal(id) {
    if (!confirm('❌ Reject this withdrawal and refund user?')) return;
    try {
        const w = await getDoc('withdrawals', id);
        if (!w) {
            toast('❌ Withdrawal not found');
            return;
        }
        await db.collection('withdrawals').doc(id).update({ 
            status: 'rejected',
            processedAt: new Date().toISOString()
        });
        await db.collection('users').doc(w.userId).update({
            balance: firebase.firestore.FieldValue.increment(w.amount)
        });
        toast('❌ Rejected - ₦' + w.amount.toLocaleString() + ' refunded to user');
        loadWithdrawals();
        loadDashboard();
    } catch (error) {
        console.error('Reject withdrawal error:', error);
        toast('❌ Failed to reject withdrawal: ' + error.message);
    }
}

// ============ CONTENT ============
async function loadContent() {
    try {
        const snapshot = await db.collection('articles').get();
        let html = '<p style="color:var(--text-dim);">Built-in: 5 articles</p>';
        if (snapshot.empty) {
            html += '<p style="color:var(--text-dim);">No custom articles</p>';
        } else {
            snapshot.forEach(d => { 
                const a = d.data(); 
                html += `<div class="card" style="margin-bottom:8px;">
                    <strong>${a.title}</strong>
                    <button class="btn btn-danger btn-sm" style="float:right;" onclick="deleteArticle('${d.id}')">Delete</button>
                </div>`; 
            });
        }
        document.getElementById('articlesAdminList').innerHTML = html;
    } catch (error) {
        console.error('Load content error:', error);
        document.getElementById('articlesAdminList').innerHTML = '<p style="color:var(--danger);">Error loading articles</p>';
    }
}

function showAddArticle() {
    document.getElementById('addArticleForm').style.display = 'block';
    document.getElementById('aTitle').value = ''; 
    document.getElementById('aContent').value = '';
    let qHTML = '';
    for (let i = 1; i <= 5; i++) {
        qHTML += `<div class="card" style="margin-bottom:10px;">
            <strong>Q${i}</strong>
            <input type="text" class="form-input" id="q${i}q" placeholder="Question" style="margin-bottom:5px;">
            <input type="text" class="form-input" placeholder="Option A" id="q${i}a" style="margin-bottom:3px;">
            <input type="text" class="form-input" placeholder="Option B" id="q${i}b" style="margin-bottom:3px;">
            <input type="text" class="form-input" placeholder="Option C" id="q${i}c" style="margin-bottom:5px;">
            <label>Correct: <select class="form-select" id="q${i}ans">
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
            </select></label>
        </div>`;
    }
    document.getElementById('questionsContainer').innerHTML = qHTML;
}

async function saveArticle() {
    try {
        const t = document.getElementById('aTitle').value; 
        const c = document.getElementById('aContent').value;
        if (!t || !c) return toast('Fill title and content');
        const qs = [];
        for (let i = 1; i <= 5; i++) {
            qs.push({ 
                q: document.getElementById('q'+i+'q').value, 
                o: [
                    document.getElementById('q'+i+'a').value, 
                    document.getElementById('q'+i+'b').value, 
                    document.getElementById('q'+i+'c').value
                ], 
                a: parseInt(document.getElementById('q'+i+'ans').value) 
            });
        }
        await db.collection('articles').add({ 
            title: t, 
            content: c, 
            qs, 
            date: new Date().toISOString() 
        });
        toast('✅ Article saved!'); 
        document.getElementById('addArticleForm').style.display = 'none'; 
        loadContent();
    } catch (error) {
        console.error('Save article error:', error);
        toast('❌ Failed to save article');
    }
}

async function deleteArticle(id) { 
    if (confirm('Delete?')) { 
        await db.collection('articles').doc(id).delete(); 
        toast('Deleted'); 
        loadContent(); 
    } 
}

// ============ REFERRALS ============
async function loadReferrals() {
    try {
        const snapshot = await db.collection('referrals').orderBy('date', 'desc').limit(50).get();
        let html = '';
        if (snapshot.empty) {
            html = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);">No referrals found</td></tr>';
        } else {
            snapshot.forEach(d => { 
                const r = d.data(); 
                html += `<tr>
                    <td>${r.referrerId}</td>
                    <td>${r.refereeName || r.refereeId}</td>
                    <td>${r.package || '-'}</td>
                    <td>${fmt(r.earned || 0)}</td>
                    <td>${new Date(r.date).toLocaleDateString()}</td>
                </tr>`; 
            });
        }
        document.getElementById('refTable').innerHTML = html;
    } catch (error) {
        console.error('Load referrals error:', error);
        document.getElementById('refTable').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger);">Error loading referrals</td></tr>';
    }
}

// ============ ✅ TASK REPORTS (NEW) ============
async function loadTaskReports() {
    const dateInput = document.getElementById('taskDateFilter');
    const date = dateInput?.value || new Date().toISOString().split('T')[0];
    
    if (dateInput && !dateInput.value) {
        dateInput.value = date;
    }

    const container = document.getElementById('taskReportsList');
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <div class="spinner"></div>
            <p>Loading tasks for ${date}...</p>
        </div>
    `;

    try {
        const tasks = await getAllUserTasksForDate(date);
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No tasks completed on ${date}</p>
                </div>
            `;
            return;
        }

        let html = '';
        let totalCompleted = 0;
        let totalEarned = 0;

        tasks.forEach(task => {
            const completed = task.tasks.filter(t => t.done).length;
            const earned = task.tasks.reduce((sum, t) => sum + (t.earned || 0), 0);
            const progress = (completed / 5) * 100;
            
            totalCompleted += completed;
            totalEarned += earned;

            html += `
                <div class="task-report-item">
                    <div class="user-info">
                        <span class="name">${task.userId}</span>
                        <span class="id">${completed}/5 questions completed</span>
                    </div>
                    <div class="task-stats">
                        <span class="completed">✅ ${completed}/5</span>
                        <div class="progress">
                            <div class="fill" style="width:${progress}%;"></div>
                        </div>
                        <span class="earned">${fmt(earned)}</span>
                    </div>
                </div>
            `;
        });

        // Add summary
        html = `
            <div class="card" style="border-color:var(--gold);margin-bottom:15px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <span style="color:var(--gold);font-weight:700;">📊 Daily Summary - ${date}</span>
                    <span>Total Users: <strong>${tasks.length}</strong></span>
                    <span>Total Tasks: <strong>${totalCompleted}/5</strong></span>
                    <span>Total Earned: <strong style="color:var(--gold);">${fmt(totalEarned)}</strong></span>
                </div>
            </div>
        ` + html;

        container.innerHTML = html;

    } catch (error) {
        console.error('Load task reports error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading tasks. Please refresh.</p>
            </div>
        `;
    }
}

// ============ PLANS ============
const defaultPlans = {
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

async function loadPlansAdmin() {
    try {
        const snap = await db.collection('settings').doc('plans').get();
        
        if (!snap.exists) {
            await db.collection('settings').doc('plans').set(defaultPlans);
            toast('✅ Default plans created');
        }
        
        const plansDoc = await db.collection('settings').doc('plans').get();
        const plans = plansDoc.exists ? plansDoc.data() : defaultPlans;
        
        let needsUpdate = false;
        const updatedPlans = { ...plans };
        Object.keys(defaultPlans).forEach(key => {
            if (!updatedPlans[key]) {
                updatedPlans[key] = defaultPlans[key];
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            await db.collection('settings').doc('plans').set(updatedPlans);
        }
        
        const finalPlans = needsUpdate ? updatedPlans : plans;
        let html = '';
        const sortedKeys = Object.keys(finalPlans).sort((a, b) => (finalPlans[a].price || 0) - (finalPlans[b].price || 0));
        
        if (sortedKeys.length === 0) {
            html = '<p style="color:var(--text-dim);text-align:center;">No plans found. <button class="btn btn-primary btn-sm" onclick="showAddPlan()">Add Plan</button></p>';
        } else {
            sortedKeys.forEach(key => {
                const p = finalPlans[key];
                const icon = p.status === 'active' ? '🟢' : p.status === 'disabled' ? '🔒' : '🔴';
                html += `<div class="card" style="opacity:${p.status === 'active' ? '1' : '0.6'}">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div>
                            <strong>${icon} ${p.name || key}</strong>
                            <br><small>${fmt(p.price || 0)} | Q: ${fmt(p.perQ || 0)} | Day: ${fmt(p.daily || 0)}</small>
                            <br><small style="color:var(--text-dim);">Key: ${key}</small>
                        </div>
                        <div style="display:flex;gap:5px;flex-wrap:wrap;">
                            ${p.status === 'active' ? 
                                `<button class="btn btn-warning btn-sm" onclick="togglePlan('${key}','disabled')">Disable</button>` : 
                                p.status === 'disabled' ? 
                                `<button class="btn btn-success btn-sm" onclick="togglePlan('${key}','active')">Enable</button>` : 
                                `<button class="btn btn-success btn-sm" onclick="togglePlan('${key}','active')">Activate</button>`}
                            <button class="btn btn-sm" style="background:var(--danger);color:white;" onclick="togglePlan('${key}','soldout')">Sold Out</button>
                            <button class="btn btn-primary btn-sm" onclick="editPlanValues('${key}')">✏️ Edit</button>
                        </div>
                    </div>
                </div>`;
            });
        }
        
        document.getElementById('plansAdminList').innerHTML = html;
    } catch (error) {
        console.error('Load plans error:', error);
        document.getElementById('plansAdminList').innerHTML = '<p style="color:var(--danger);">Error loading plans. <button class="btn btn-primary btn-sm" onclick="loadPlansAdmin()">Retry</button></p>';
        toast('⚠️ Error loading plans: ' + error.message);
    }
}

async function togglePlan(key, status) {
    try {
        const plansDoc = await db.collection('settings').doc('plans').get();
        const plans = plansDoc.exists ? plansDoc.data() : {};
        if (plans[key]) { 
            plans[key].status = status; 
            await db.collection('settings').doc('plans').set(plans); 
            loadPlansAdmin();
            toast('✅ Plan status updated to: ' + status);
        } else {
            toast('❌ Plan not found');
        }
    } catch (error) {
        console.error('Toggle plan error:', error);
        toast('❌ Failed to update plan status');
    }
}

async function editPlanValues(key) {
    try {
        const plansDoc = await db.collection('settings').doc('plans').get();
        const plans = plansDoc.exists ? plansDoc.data() : {};
        const p = plans[key];
        if (!p) return toast('Plan not found');
        
        const name = prompt('Plan name:', p.name); 
        if (!name) return;
        const price = parseInt(prompt('Price (₦):', p.price)); 
        if (!price) return;
        const perQ = parseInt(prompt('Per Question (₦):', p.perQ)); 
        if (!perQ) return;
        const daily = parseInt(prompt('Daily (₦):', p.daily)); 
        if (!daily) return;
        
        plans[key] = { ...p, name, price, perQ, daily };
        await db.collection('settings').doc('plans').set(plans);
        loadPlansAdmin();
        toast('✅ Plan updated!');
    } catch (error) {
        console.error('Edit plan error:', error);
        toast('❌ Failed to update plan');
    }
}

function showAddPlan() {
    const key = prompt('Plan key (e.g. "vip"):'); 
    if (!key) return;
    const name = prompt('Plan name:'); 
    const price = parseInt(prompt('Price (₦):'));
    const perQ = parseInt(prompt('Per Question (₦):')); 
    const daily = parseInt(prompt('Daily (₦):'));
    if (!name || !price) return;
    
    db.collection('settings').doc('plans').get().then(snap => { 
        const plans = snap.exists ? snap.data() : {}; 
        plans[key.toLowerCase()] = { name, price, perQ, daily, status: 'disabled' }; 
        db.collection('settings').doc('plans').set(plans); 
        loadPlansAdmin(); 
        toast('✅ Plan added!'); 
    }).catch(error => {
        console.error('Add plan error:', error);
        toast('❌ Failed to add plan');
    });
}

// ============ NOTICES & BROADCAST ============
async function loadNotices() {
    try {
        const n = await db.collection('settings').doc('notices').get(); 
        if (n.exists) { 
            const d = n.data(); 
            document.getElementById('noticeDeposit').value = d.deposit || ''; 
            document.getElementById('noticeWithdrawal').value = d.withdrawal || ''; 
            document.getElementById('noticeHome').value = d.home || ''; 
            document.getElementById('noticeTasks').value = d.tasks || ''; 
        }
    } catch (error) {
        console.error('Load notices error:', error);
    }
}

async function saveNotices() {
    try {
        await db.collection('settings').doc('notices').set({ 
            deposit: document.getElementById('noticeDeposit').value, 
            withdrawal: document.getElementById('noticeWithdrawal').value, 
            home: document.getElementById('noticeHome').value, 
            tasks: document.getElementById('noticeTasks').value 
        }); 
        toast('✅ Notices saved!');
    } catch (error) {
        console.error('Save notices error:', error);
        toast('❌ Failed to save notices');
    }
}

async function sendBroadcast() {
    try {
        const msg = document.getElementById('broadMsg').value; 
        if (!msg) return toast('Enter message'); 
        const dur = parseInt(document.getElementById('broadDuration').value) || 24; 
        await db.collection('settings').doc('broadcast').set({ 
            message: msg, 
            expiry: Date.now() + dur * 3600000, 
            date: new Date().toISOString() 
        }); 
        toast('✅ Broadcast sent!'); 
        document.getElementById('broadMsg').value = '';
    } catch (error) {
        console.error('Send broadcast error:', error);
        toast('❌ Failed to send broadcast');
    }
}

// ============ SETTINGS ============
async function loadSettingsData() {
    try {
        const s = await db.collection('settings').doc('siteSettings').get();
        if (s.exists) { 
            document.getElementById('setTelegram').value = s.data().telegramLink || ''; 
            document.getElementById('setSupportEmail').value = s.data().supportEmail || ''; 
        }
        const p = await db.collection('settings').doc('site').get();
        if (p.exists) { 
            document.getElementById('setBonus').value = p.data().bonus || 300; 
            document.getElementById('setCycle').value = p.data().cycle || 365; 
            document.getElementById('setRef1').value = p.data().ref1 || 10; 
            document.getElementById('setRef2').value = p.data().ref2 || 3; 
            document.getElementById('setRef3').value = p.data().ref3 || 1; 
        }
        const w = await db.collection('settings').doc('withdrawalSettings').get();
        if (w.exists) {
            document.getElementById('setWithdrawalMin').value = w.data().min_withdrawal || 500;
            document.getElementById('setWithdrawalStart').value = w.data().start_time || '10:00';
            document.getElementById('setWithdrawalEnd').value = w.data().end_time || '22:00';
            document.getElementById('setWithdrawalWeekday').value = w.data().max_weekday || 1;
            document.getElementById('setWithdrawalWeekend').value = w.data().max_weekend || 2;
        }
    } catch (error) {
        console.error('Load settings error:', error);
    }
}

async function saveSettings() {
    try {
        await db.collection('settings').doc('siteSettings').set({ 
            telegramLink: document.getElementById('setTelegram').value, 
            supportEmail: document.getElementById('setSupportEmail').value 
        });
        await db.collection('settings').doc('site').set({ 
            bonus: parseInt(document.getElementById('setBonus').value) || 300, 
            cycle: parseInt(document.getElementById('setCycle').value) || 365, 
            ref1: parseInt(document.getElementById('setRef1').value) || 10, 
            ref2: parseInt(document.getElementById('setRef2').value) || 3, 
            ref3: parseInt(document.getElementById('setRef3').value) || 1 
        });
        await db.collection('settings').doc('withdrawalSettings').set({ 
            min_withdrawal: parseInt(document.getElementById('setWithdrawalMin').value) || 500, 
            start_time: document.getElementById('setWithdrawalStart').value || '10:00', 
            end_time: document.getElementById('setWithdrawalEnd').value || '22:00', 
            max_weekday: parseInt(document.getElementById('setWithdrawalWeekday').value) || 1, 
            max_weekend: parseInt(document.getElementById('setWithdrawalWeekend').value) || 2 
        });
        toast('✅ Settings saved!');
    } catch (error) {
        console.error('Save settings error:', error);
        toast('❌ Failed to save settings');
    }
}

document.addEventListener('click', e => { 
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active'); 
});

console.log('🛡️ Admin JS Ready');
