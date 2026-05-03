const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') && window.location.port !== '5000' ? 'http://localhost:5000/api' : '/api';
const UPLOADS_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') && window.location.port !== '5000' ? 'http://localhost:5000/uploads/' : '/uploads/';

// Helper to resolve property images
function resolveImagePath(path, size = '500') {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return UPLOADS_URL + path;
}

// Load all properties with optional filters
async function loadProperties(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_URL}/properties?${params}`);
        if (!response.ok) throw new Error('Failed to fetch properties');
        const properties = await response.json();

        const grid = document.getElementById('propertiesGrid');
        if (!grid) return;

        if (properties.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-20 text-center">
                    <i class="fas fa-search fa-3x text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg">No properties found matching your criteria.</p>
                    <button onclick="window.location.href='/properties.html'" class="mt-4 text-blue-600 font-bold">Clear All Filters</button>
                </div>
            `;
            return;
        }

        const countSpan = document.getElementById('propertyCount');
        if (countSpan) countSpan.innerText = properties.length.toLocaleString();

        grid.innerHTML = properties.map(prop => {
            let imagesArray = [];
            try { imagesArray = JSON.parse(prop.images || '[]'); } catch(e){}
            const firstImage = resolveImagePath(imagesArray[0]);
            const imageHtml = firstImage ? `<img src="${firstImage}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" alt="${prop.title}" loading="lazy">` : `<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400"><i class="fas fa-image fa-3x"></i></div>`;
            
            return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden hover:shadow-lg transition-shadow cursor-pointer mb-6" onclick="window.location.href='/property-detail.html?id=${prop.id}'">
                <!-- Left Image Area -->
                <div class="w-full md:w-2/5 relative h-64 md:h-auto overflow-hidden">
                    ${imageHtml}
                    <span class="absolute top-4 left-4 bg-purple-700 text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded shadow">For ${prop.offer_type || 'Sale'}</span>
                    <button class="absolute top-4 right-4 bg-white/90 p-2 rounded shadow hover:text-red-500 transition" onclick="event.stopPropagation(); toggleWishlist(${prop.id})">
                        <i class="far fa-bookmark text-lg"></i>
                    </button>
                </div>
                <!-- Right Content Area -->
                <div class="w-full md:w-3/5 flex flex-col pt-0 bg-purple-50">
                    <div class="p-6 flex-grow flex flex-col justify-between">
                        <div>
                            <h3 class="text-2xl font-black text-gray-900 mb-3 hover:text-purple-700 transition-colors">${prop.title}</h3>
                            <div class="flex items-center text-gray-600 text-sm font-semibold mb-6">
                                <span><i class="far fa-calendar-alt mr-2 text-purple-600"></i>${new Date(prop.created_at || Date.now()).toISOString().split('T')[0]}</span>
                                <span class="mx-3 text-gray-300">|</span>
                                <span><i class="fas fa-map-marker-alt text-purple-600 mr-2"></i>${prop.city}, ${prop.district}</span>
                            </div>
                            <div class="flex items-center gap-3 text-sm text-gray-700 font-bold mb-6">
                                <span class="bg-white border border-purple-100 text-purple-900 px-4 py-1.5 rounded-lg shadow-sm">${prop.property_type || 'Land'}</span>
                                <span class="bg-white border border-purple-100 text-purple-900 px-4 py-1.5 rounded-lg shadow-sm">${prop.land_area || '0'} ${prop.property_type === 'House' ? 'Sqft' : 'Perches'}</span>
                            </div>
                        </div>
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-end mt-4">
                            <div class="mb-4 md:mb-0">
                                <div class="text-sm font-bold text-gray-500 mb-1">Asking Price</div>
                                <div class="text-3xl font-black text-purple-800">Rs: ${prop.price.toLocaleString()}</div>
                            </div>
                            <button class="bg-purple-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-900 transition shadow-lg w-full md:w-auto">FIND OUT MORE</button>
                        </div>
                    </div>
                    <!-- Bottom Loan Banner -->
                    <div class="bg-yellow-400 px-6 py-3 flex justify-between items-center text-sm font-black text-yellow-900 hover:bg-yellow-500 transition border-t-4 border-yellow-500">
                        <span>Best Loan Rental: <span class="text-black ml-1 text-base">Rs: ${Math.round(prop.price * 0.012).toLocaleString()}</span></span>
                        <span class="flex items-center gap-2">REQUEST FINANCIAL AID <i class="fas fa-chevron-right"></i></span>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading properties:', error);
        const grid = document.getElementById('propertiesGrid');
        if (grid) grid.innerHTML = '<p class="text-red-500 text-center py-10">Error loading properties. Please try again later.</p>';
    }
}

// Load Featured Properties for Homepage
async function loadFeaturedProperties() {
    try {
        const grid = document.getElementById('featuredProperties');
        if (!grid) return;

        const response = await fetch(`${API_URL}/featured`);
        if (!response.ok) throw new Error('Failed to fetch featured properties');
        const properties = await response.json();

        grid.innerHTML = properties.map(prop => {
            let imagesArray = [];
            try { imagesArray = JSON.parse(prop.images || '[]'); } catch(e){}
            const firstImage = resolveImagePath(imagesArray[0]);
            const imageHtml = firstImage ? `<img src="${firstImage}" alt="${prop.title}">` : `<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400"><i class="fas fa-star fa-3x"></i></div>`;
            
            return `
            <div class="property-card flex-shrink-0" onclick="window.location.href='/property-detail.html?id=${prop.id}'">
                <div class="card-image">
                    ${imageHtml}
                    <span class="sale-badge">Featured</span>
                </div>
                <div class="card-content">
                    <h3 class="property-title truncate text-gray-800">${prop.title}</h3>
                    <p class="text-sm text-gray-500 mb-2">${prop.city}, ${prop.district}</p>
                    <div class="price text-blue-600 font-bold">LKR ${prop.price.toLocaleString()}</div>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading featured properties:', error);
    }
}

// Load property details for detail page
async function loadPropertyDetail() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (!id) return;

        const response = await fetch(`${API_URL}/properties/${id}`);
        if (!response.ok) throw new Error('Property not found');
        const property = await response.json();

        // Basic Info
        document.getElementById('propertyTitle').innerText = property.title;
        document.getElementById('propertyPrice').innerText = `LKR ${property.price.toLocaleString()}`;
        document.getElementById('propertyLocation').innerText = `${property.city}, ${property.district}`;
        document.getElementById('propertyDescription').innerText = property.description || 'No description provided.';
        
        // Key Features
        document.getElementById('propType').innerText = property.property_type;
        document.getElementById('propOffer').innerText = `For ${property.offer_type}`;
        document.getElementById('propBeds').innerText = property.bedrooms || '0';
        document.getElementById('propBaths').innerText = property.bathrooms || '0';
        document.getElementById('propArea').innerText = `${property.land_area || '0'} Perches`;

        // Features List
        let featuresArray = [];
        try { featuresArray = JSON.parse(property.features || '[]'); } catch(e){}
        const featuresList = document.getElementById('featuresList');
        if (featuresList && featuresArray.length > 0) {
            featuresList.innerHTML = featuresArray.map(f => `
                <div class="flex items-center space-x-3 bg-gray-50 p-4 rounded-xl">
                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <i class="fas fa-check"></i>
                    </div>
                    <span class="font-medium text-gray-700">${f}</span>
                </div>
            `).join('');
        }

        // Image Gallery
        let imagesArray = [];
        try { imagesArray = JSON.parse(property.images || '[]'); } catch(e){}
        const mainImg = document.getElementById('mainImage');
        const thumbnails = document.getElementById('thumbnails');
        
        if (imagesArray.length > 0) {
            mainImg.src = resolveImagePath(imagesArray[0], '1200');
            if (thumbnails) {
                thumbnails.innerHTML = imagesArray.map((img, idx) => `
                    <div class="cursor-pointer rounded-lg overflow-hidden border-2 ${idx === 0 ? 'border-blue-600' : 'border-transparent'}" onclick="updateMainImage('${resolveImagePath(img, '1200')}', this)">
                        <img src="${resolveImagePath(img, '200')}" class="w-full h-20 object-cover" alt="Thumb">
                    </div>
                `).join('');
            }
        }

        // Seller Info
        document.getElementById('sellerName').innerText = property.seller_name;
        document.getElementById('sellerPhone').innerText = property.seller_phone;
        document.getElementById('whatsappBtn').href = `https://wa.me/94${property.seller_phone.replace(/\s/g, '')}`;
        
        // Update Mortgage Calculator Base Price
        const mortgagePriceInput = document.getElementById('mortgageAmount');
        if (mortgagePriceInput) mortgagePriceInput.value = property.price;

    } catch (error) {
        console.error('Error loading property detail:', error);
        alert('Could not load property details.');
    }
}

// Helper to update main image in gallery
function updateMainImage(src, el) {
    document.getElementById('mainImage').src = src;
    document.querySelectorAll('#thumbnails > div').forEach(div => div.classList.replace('border-blue-600', 'border-transparent'));
    el.classList.replace('border-transparent', 'border-blue-600');
}

// Submit inquiry
async function submitInquiry(event) {
    if (event) event.preventDefault();
    
    try {
        const id = new URLSearchParams(window.location.search).get('id');
        const name = document.getElementById('inquiryName').value;
        const phone = document.getElementById('inquiryPhone').value;
        const message = document.getElementById('inquiryMessage').value;

        if (!name || !phone) {
            alert('Please provide your name and phone number.');
            return;
        }

        const response = await fetch(`${API_URL}/inquiries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: id, name, phone, message })
        });

        if (response.ok) {
            alert('Inquiry sent successfully! The seller will contact you soon.');
            document.getElementById('inquiryForm').reset();
        } else {
            throw new Error('Inquiry failed');
        }
    } catch (error) {
        alert('Error sending inquiry. Please try again.');
    }
}

// Post property form handler
async function postProperty(event) {
    event.preventDefault();
    // Implementation for posting property - remains largely same but adds validation
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const formData = new FormData(event.target);
        // Add images if any
        const response = await fetch(`${API_URL}/properties`, {
            method: 'POST',
            body: formData // Backend handles multipart
        });

        if (response.ok) {
            alert('Property posted successfully! Awaiting approval.');
            window.location.href = '/dashboard.html';
        } else {
            throw new Error('Post failed');
        }
    } catch (error) {
        alert('Error posting property. Check your connection.');
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    if (path === '/' || path === '/index.html') {
        loadFeaturedProperties();
    } else if (path === '/properties.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const filters = Object.fromEntries(urlParams.entries());
        // Sync filter inputs
        if (filters.location) document.getElementById('filterLocation').value = filters.location;
        if (filters.type) document.getElementById('filterType').value = filters.type;
        if (filters.offer) document.getElementById('filterOffer').value = filters.offer;
        
        loadProperties(filters);
    } else if (path === '/property-detail.html') {
        loadPropertyDetail();
    }

    setupMobileNav();
});

// Mobile Nav Setup
function setupMobileNav() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!mobileMenuBtn || !mobileMenu) return;

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
    });

    // Close menu when clicking on a link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        });
    });
}


function toggleWishlist(id) {
    alert('Wishlist feature coming soon!');
}
