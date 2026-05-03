const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') && window.location.port !== '5000' ? 'http://localhost:5000/api' : '/api';
const UPLOADS_URL = '/uploads/';

// Helper to resolve property images
function resolveImagePath(path, size = '500') {
    if (!path) return `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=${size}`;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return UPLOADS_URL + path;
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Handle Tab Navigation
    document.querySelectorAll('#adminNav .nav-item[data-view]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#adminNav .nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            document.getElementById('dashboardView').classList.add('hidden');
            document.getElementById('manageView').classList.add('hidden');
            document.getElementById(item.dataset.view).classList.remove('hidden');
            if (item.dataset.view === 'manageView') loadAdminProperties();
        });
    });

    try {
        const response = await fetch(`${API_URL}/dashboard-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        const stats = await response.json();

        // Update Summary Cards
        document.getElementById('totalValue').innerText = `LKR ${stats.total.totalValue ? stats.total.totalValue.toLocaleString() : 0}`;
        document.getElementById('totalCount').innerText = `${stats.total.count || 0} properties listed`;

        document.getElementById('saleValue').innerText = `LKR ${stats.sale.totalValue ? stats.sale.totalValue.toLocaleString() : 0}`;
        document.getElementById('saleCount').innerText = `${stats.sale.count || 0} Total Sales`;

        document.getElementById('rentValue').innerText = `LKR ${stats.rent.totalValue ? stats.rent.totalValue.toLocaleString() : 0}`;
        document.getElementById('rentCount').innerText = `${stats.rent.count || 0} Total Rent`;

        // Update Percentages
        const total = stats.sale.count + stats.rent.count;
        if (total > 0) {
            const salePercent = Math.round((stats.sale.count / total) * 100);
            const rentPercent = 100 - salePercent;
            document.getElementById('salePercent').innerText = `${salePercent}%`;
            document.getElementById('rentPercent').innerText = `${rentPercent}%`;
        }

        // Render Overview Chart
        const ctxOverview = document.getElementById('overviewChart').getContext('2d');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const labels = stats.monthlyData.map(d => monthNames[parseInt(d.month) - 1] || `Month ${d.month}`);
        const dataPoints = stats.monthlyData.map(d => d.count);
        
        new Chart(ctxOverview, {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Properties Added',
                    data: dataPoints.length ? dataPoints : [12, 19, 3, 5, 2, 3],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, 
                    x: { grid: { display: false } } 
                }
            }
        });

        // Render Donut Chart
        const ctxDonut = document.getElementById('donutChart').getContext('2d');
        new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: ['Sale', 'Rent'],
                datasets: [{
                    data: [stats.sale.count || 1, stats.rent.count || 1],
                    backgroundColor: ['#2563eb', '#10b981'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });

        // Render Revenue Chart (Bar) - Placeholder for now
        const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
        new Chart(ctxRevenue, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: stats.revenueData || [650, 590, 800, 810, 560, 550],
                    backgroundColor: '#2563eb',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, 
                    x: { grid: { display: false } } 
                }
            }
        });

        // Update Recent List
        const recentList = document.getElementById('recentList');
        if (recentList) {
            recentList.innerHTML = stats.recent.map(prop => {
                let imagesArray = [];
                try { imagesArray = JSON.parse(prop.images || '[]'); } catch(e){}
                const firstImage = resolveImagePath(imagesArray[0], '200');
                
                return `
                <div class="recent-item cursor-pointer hover:bg-gray-50 transition p-2 rounded-lg" onclick="window.location.href='/property-detail.html?id=${prop.id}'">
                    <img src="${firstImage}" class="recent-thumbnail" alt="${prop.title}">
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-gray-800 text-sm truncate">${prop.title}</div>
                        <div class="text-xs text-gray-500">${prop.city}</div>
                    </div>
                    <div class="text-right ml-2">
                        <div class="font-bold text-blue-600 text-xs whitespace-nowrap">LKR ${prop.price.toLocaleString()}</div>
                        <div class="text-xs text-gray-400 capitalize">${prop.offer_type || 'Sale'}</div>
                    </div>
                </div>
                `;
            }).join('');
        }

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
});

// --- Admin Property Management ---
window.loadAdminProperties = async function() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('adminPropertiesList');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6">Loading properties...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/admin/properties`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch properties');
        const properties = await res.json();
        
        if (properties.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-gray-500">No properties found.</td></tr>';
            return;
        }

        tbody.innerHTML = properties.map(prop => {
            let imagesArray = [];
            try { imagesArray = JSON.parse(prop.images || '[]'); } catch(e){}
            const firstImage = resolveImagePath(imagesArray[0], '200');
            const imgBlock = firstImage ? `<img src="${firstImage}" class="w-12 h-12 rounded object-cover">` : `<div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center"><i class="fas fa-home"></i></div>`;
            
            let statusBadge = `<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">${prop.status}</span>`;
            if (prop.status === 'active') statusBadge = `<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>`;
            if (prop.status === 'deleted') statusBadge = `<span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Deleted</span>`;
            if (prop.status === 'draft') statusBadge = `<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Draft</span>`;

            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="py-3 px-4">${imgBlock}</td>
                    <td class="py-3 px-4">
                        <div class="font-bold text-sm truncate w-48">${prop.title}</div>
                        <div class="text-xs text-gray-500">${prop.city}, ${prop.district}</div>
                    </td>
                    <td class="py-3 px-4 text-sm">LKR ${prop.price.toLocaleString()}</td>
                    <td class="py-3 px-4">${statusBadge}</td>
                    <td class="py-3 px-4 text-right space-x-2">
                        ${prop.status !== 'active' ? `<button onclick="updatePropertyStatus(${prop.id}, 'active')" class="text-green-600 hover:text-green-800" title="Approve"><i class="fas fa-check-circle"></i></button>` : ''}
                        ${prop.status !== 'deleted' ? `<button onclick="updatePropertyStatus(${prop.id}, 'deleted')" class="text-red-600 hover:text-red-800" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                        <a href="/property-detail.html?id=${prop.id}" target="_blank" class="text-blue-600 hover:text-blue-800" title="View"><i class="fas fa-external-link-alt"></i></a>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-red-500">Error loading: ${err.message}</td></tr>`;
    }
}

window.updatePropertyStatus = async function(id, status) {
    if (!confirm(`Are you sure you want to mark this property as ${status}?`)) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/admin/properties/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            loadAdminProperties(); // Refresh list
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    } catch(err) {
        alert('Network error.');
    }
}
