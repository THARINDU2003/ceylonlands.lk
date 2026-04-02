const API_URL = 'http://localhost:5000/api';
const UPLOADS_URL = 'http://localhost:5000/uploads/';

// Helper to resolve property images
function resolveImagePath(path, size = '500') {
    if (!path) return `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=${size}`;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return UPLOADS_URL + path;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_URL}/dashboard-stats`);
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
