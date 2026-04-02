document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('http://localhost:5000/api/dashboard-stats');
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

        // Render Overview Chart (Spline Area)
        const ctxOverview = document.getElementById('overviewChart').getContext('2d');
        const labels = stats.monthlyData.map(d => `Month ${d.month}`);
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
                scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } }
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

        // Render Revenue Chart (Bar)
        const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
        new Chart(ctxRevenue, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Online Sales',
                    data: [65, 59, 80, 81, 56, 55],
                    backgroundColor: '#2563eb',
                    borderRadius: 6
                }, {
                    label: 'Offline Sales',
                    data: [28, 48, 40, 19, 86, 27],
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } }
            }
        });

        // Update Recent List
        const recentList = document.getElementById('recentList');
        recentList.innerHTML = stats.recent.map(prop => {
            let imagesArray = [];
            try { imagesArray = JSON.parse(prop.images || '[]'); } catch(e){}
            let firstImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500';
            if (imagesArray.length > 0) {
                firstImage = imagesArray[0];
                if (!firstImage.startsWith('data:') && !firstImage.startsWith('http')) {
                    firstImage = '/images/' + firstImage;
                }
            }
            
            return `
            <div class="recent-item">
                <img src="${firstImage}" class="recent-thumbnail" alt="Property">
                <div class="flex-1">
                    <div class="font-bold text-gray-800 text-sm truncate w-40">${prop.title}</div>
                    <div class="text-xs text-gray-500">${prop.city}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-blue-600 text-xs">LKR ${prop.price.toLocaleString()}</div>
                    <div class="text-xs text-gray-400">Fixed</div>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
});
