// Super Admin Logic for CeylonTerrece

const API_BAR = '/api/admin';

async function initSuperAdmin() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        window.location.href = '/login.html';
        return;
    }

    // Load initial data
    loadDashboardStats();
    loadAllProperties();
    loadAllUsers();
    loadAllInquiries();
    loadFinanceData();
    loadAllAgents();
    checkSuperAdminAccess();
}

function checkSuperAdminAccess() {
    const user = JSON.parse(localStorage.getItem('user'));
    const isSuper = true; // Give full Super Admin privileges to all admins for now
    
    // Transfer access only for Super Admin
    if (isSuper) {
        document.getElementById('transferBtn').classList.remove('hidden');
        document.getElementById('transferRestricted').classList.add('hidden');
        const companyBankSection = document.getElementById('companyBankDetailsSection');
        if(companyBankSection) companyBankSection.classList.remove('hidden');
        
        // Load bank settings
        fetch('/api/settings/bank')
            .then(r => r.json())
            .then(data => {
                if(!data.error) {
                    document.getElementById('pbBank').value = data.bank || '';
                    document.getElementById('pbName').value = data.name || '';
                    document.getElementById('pbAccount').value = data.account || '';
                    document.getElementById('pbBranch').value = data.branch || '';
                }
            }).catch(e => console.error(e));

    } else {
        // Hide entire staff creation tab for normal staff members
        const staffTab = document.querySelector('button[onclick="showTab(\\\'staff\\\')"]');
        if (staffTab) staffTab.style.display = 'none';
        
        // Example: Only show Users if they have user_mgmt permission
        if (!user.permissions || !user.permissions.includes('user_mgmt')) {
            const userTab = document.querySelector('button[onclick="showTab(\'users\')"]');
            if (userTab) userTab.style.display = 'none';
        }

        // Hide Agents for non-super admins
        const agentTab = document.querySelector('button[onclick="showTab(\'agents\')"]');
        if (agentTab) agentTab.style.display = 'none';
    }
}

// Tab Management
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
    
    document.getElementById('pageTitle').innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1) + ' Management';
    if(tabId === 'dashboard') document.getElementById('pageTitle').innerText = 'System Dashboard';
}

// DASHBOARD STATS
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        const resStats = await fetch('/api/dashboard-stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await resStats.json();
        
        const resUsers = await fetch(`${API_BAR}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await resUsers.json();

        const resInq = await fetch(`${API_BAR}/inquiries`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const inq = await resInq.json();

        document.getElementById('statTotal').innerText = stats.total.count;
        document.getElementById('statUsers').innerText = users.length;
        document.getElementById('statSales').innerText = stats.sale.count;
        document.getElementById('statInquiries').innerText = inq.length;

    } catch (e) { console.error('Stats error:', e); }
}

// PROPERTIES MANAGEMENT
async function loadAllProperties() {
    const table = document.getElementById('propertiesTable');
    table.innerHTML = '<tr><td colspan="5" class="p-10 text-center text-gray-400">Loading data...</td></tr>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BAR}/properties`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const properties = await res.json();

        table.innerHTML = properties.map(p => `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800">${p.title}</div>
                    <div class="text-xs text-gray-400">${p.city}, ${p.district}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">${p.seller_name}</td>
                <td class="px-6 py-4 font-bold text-blue-600">Rs. ${p.price.toLocaleString()}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-black uppercase ${getStatusClass(p.status)}">
                        ${p.status}
                    </span>
                </td>
                <td class="px-6 py-4 flex gap-4">
                    <button onclick='openEditModal(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="text-blue-500 hover:text-blue-700 transition"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProperty(${p.id})" class="text-red-400 hover:text-red-600 transition"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) { table.innerHTML = '<tr><td colspan="5" class="p-10 text-center text-red-400">Error loading properties.</td></tr>'; }
}

function getStatusClass(status) {
    if(status === 'active') return 'bg-green-100 text-green-700';
    if(status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
}

// USERS MANAGEMENT
async function loadAllUsers() {
    const table = document.getElementById('usersTable');
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BAR}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();

        table.innerHTML = users.map(u => `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800">${u.name}</div>
                    <div class="text-xs text-gray-400">Joined ${new Date(u.created_at).toLocaleDateString()}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">${u.email}</td>
                <td class="px-6 py-4">
                    <select onchange="updateUserRole(${u.id}, this.value)" class="bg-transparent border-0 font-black text-xs uppercase cursor-pointer ${u.role === 'admin' ? 'text-purple-600' : 'text-gray-500'}">
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td class="px-6 py-4">
                    <button onclick="deleteUser(${u.id})" class="text-red-400 hover:text-red-600 transition"><i class="fas fa-user-minus"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) { }
}

// INQUIRIES MANAGEMENT
async function loadAllInquiries() {
    const table = document.getElementById('inquiriesTable');
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BAR}/inquiries`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const inq = await res.json();

        table.innerHTML = inq.map(i => `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 text-sm text-gray-800">${i.message}</td>
                <td class="px-6 py-4">
                    <div class="font-bold text-xs uppercase text-gray-600">${i.name}</div>
                    <div class="text-xs text-blue-500">${i.phone}</div>
                </td>
                <td class="px-6 py-4 text-xs font-bold text-gray-400 italic">${i.property_title || 'Deleted Property'}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="deleteInquiry(${i.id})" class="text-gray-300 hover:text-red-500 transition"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) { }
}

// AGENTS MANAGEMENT
async function loadAllAgents() {
    const table = document.getElementById('agentsTable');
    if(!table) return;
    table.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-gray-400 italic">Loading agents...</td></tr>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/agents');
        const agents = await res.json();

        if (agents.length === 0) {
            table.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-gray-400 italic">No agents found.</td></tr>';
            return;
        }

        table.innerHTML = agents.map(a => `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 flex items-center gap-4">
                    <img src="${a.photo || 'https://ui-avatars.com/api/?name=' + a.name}" class="w-10 h-10 rounded-full object-cover">
                    <div class="font-bold text-gray-800">${a.name}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-bold text-gray-700">${a.phone}</div>
                    <div class="text-xs text-gray-400">${a.email || 'No email'}</div>
                </td>
                <td class="px-6 py-4 text-xs font-black text-gray-400">${a.license_number || 'REG-PENDING'}</td>
                <td class="px-6 py-4 text-right text-sm">
                    <button onclick="deleteAgent(${a.id})" class="text-red-400 hover:text-red-600 transition p-2"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

function openAgentModal() {
    document.getElementById('agentModal').classList.remove('hidden');
}

function closeAgentModal() {
    document.getElementById('agentModal').classList.add('hidden');
}

async function deleteAgent(id) {
    if(!confirm("Remove this agent from the company?")) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/agents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if(res.ok) loadAllAgents();
    else alert("Failed to delete agent.");
}

const addAgentForm = document.getElementById('addAgentForm');
if(addAgentForm) {
    addAgentForm.onsubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        
        const agentData = {
            name: document.getElementById('agentName').value,
            email: document.getElementById('agentEmail').value,
            phone: document.getElementById('agentPhone').value,
            whatsapp: document.getElementById('agentWhatsapp').value,
            photo: document.getElementById('agentPhoto').value,
            license_number: document.getElementById('agentLicense').value
        };

        const res = await fetch('/api/admin/agents', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(agentData)
        });

        if(res.ok) {
            alert("New agent added successfully!");
            e.target.reset();
            closeAgentModal();
            loadAllAgents();
        } else {
            const err = await res.json();
            alert(err.error || "Failed to add agent.");
        }
    };
}


// FINANCE & BALANCE
async function loadFinanceData() {
    try {
        const token = localStorage.getItem('token');
        const resBalance = await fetch(`${API_BAR}/system-balance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const balanceData = await resBalance.json();
        document.getElementById('financeBalance').innerText = `LKR ${balanceData.balance.toLocaleString('en-LK', {minimumFractionDigits: 2})}`;

        const resTransfers = await fetch(`${API_BAR}/transfers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const transfers = await resTransfers.json();
        
        const table = document.getElementById('transfersTable');
        if(transfers.length > 0) {
            table.innerHTML = transfers.map(t => `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4 font-bold text-gray-800">LKR ${t.amount.toLocaleString()}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                            ${t.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-gray-400 font-mono">${new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
    } catch (e) { }
}

function openTransferModal() {
    document.getElementById('transferModal').classList.remove('hidden');
}

function closeTransferModal() {
    document.getElementById('transferModal').classList.add('hidden');
}

function toggleTransferFields() {
    const type = document.getElementById('transferType').value;
    const bankFields = document.getElementById('bankFields');
    const cardFields = document.getElementById('cardFields');
    
    if (type === 'bank') {
        bankFields.classList.remove('hidden');
        cardFields.classList.add('hidden');
    } else {
        bankFields.classList.add('hidden');
        cardFields.classList.remove('hidden');
    }
}

document.getElementById('transferForm').onsubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const amount = document.getElementById('transferAmount').value;
    const type = document.getElementById('transferType').value;
    
    let bank_details = "";
    if (type === 'bank') {
        bank_details = document.getElementById('transferBankDetails').value;
    } else {
        const cardName = document.getElementById('transferCardName').value;
        const cardNum = document.getElementById('transferCardNumber').value;
        bank_details = `Card: ${cardName} - ${cardNum}`;
    }

    const res = await fetch(`${API_BAR}/transfers`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, bank_details })
    });

    if(res.ok) {
        alert("Transfer request submitted successfully.");
        closeTransferModal();
        loadFinanceData();
    } else {
        const err = await res.json();
        alert(err.error || "Transfer failed.");
    }
};

// STAFF MANAGEMENT
document.getElementById('createStaffForm').onsubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const permissions = [];
    document.querySelectorAll('input[name="perm"]:checked').forEach(cb => permissions.push(cb.value));

    const staffData = {
        name: document.getElementById('staffName').value,
        email: document.getElementById('staffEmail').value,
        password: document.getElementById('staffPassword').value,
        permissions: permissions
    };

    const res = await fetch(`${API_BAR}/staff`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(staffData)
    });

    if(res.ok) {
        alert("Staff account created successfully.");
        e.target.reset();
        loadAllUsers();
    } else {
        const err = await res.json();
        alert(err.error || "Failed to create staff.");
    }
};

// Public Bank Details Form Submit
const pbForm = document.getElementById('publicBankForm');
if(pbForm) {
    pbForm.onsubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const payload = {
            bank: document.getElementById('pbBank').value,
            name: document.getElementById('pbName').value,
            account: document.getElementById('pbAccount').value,
            branch: document.getElementById('pbBranch').value
        };

        const res = await fetch('/api/admin/settings/bank', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if(res.ok) alert("Public Bank Details updated successfully.");
        else {
            const err = await res.json();
            alert(err.error || "Failed to update.");
        }
    };
}

// ACTIONS
async function deleteProperty(id) {
    if(!confirm("Are you sure you want to delete this property PERMANENTLY?")) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BAR}/properties/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if(res.ok) { loadAllProperties(); loadDashboardStats(); }
}

async function deleteUser(id) {
    if(!confirm("Delete this user? This cannot be undone.")) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BAR}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if(res.ok) loadAllUsers();
}

async function updateUserRole(id, role) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BAR}/users/${id}/role`, {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
    });
    if(res.ok) loadAllUsers();
}

async function deleteInquiry(id) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BAR}/inquiries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if(res.ok) loadAllInquiries();
}

// MODAL HANDLING
function openEditModal(p) {
    document.getElementById('editPropId').value = p.id;
    document.getElementById('editTitle').value = p.title;
    document.getElementById('editPrice').value = p.price;
    document.getElementById('editStatus').value = p.status;
    document.getElementById('editDescription').value = p.description;
    document.getElementById('editModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('editModal').classList.add('hidden');
}

document.getElementById('editPropertyForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editPropId').value;
    const token = localStorage.getItem('token');
    
    // Simple fetch of full record to preserve unspecified fields if needed
    // In a real app we'd get the full record, but for now we'll send the updated fields
    const updated = {
        title: document.getElementById('editTitle').value,
        price: document.getElementById('editPrice').value,
        status: document.getElementById('editStatus').value,
        description: document.getElementById('editDescription').value
    };

    const res = await fetch(`${API_BAR}/properties/${id}`, {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updated)
    });

    if(res.ok) {
        closeModal();
        loadAllProperties();
    }
}

// Run init
initSuperAdmin();
