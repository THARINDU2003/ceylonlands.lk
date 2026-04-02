const API_URL = 'http://localhost:5000/api';

// Load all properties
async function loadProperties(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/properties?${params}`);
    const properties = await response.json();

    const grid = document.getElementById('propertiesGrid');
    if (grid) {
        grid.innerHTML = properties.map(prop => {
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
            <div class="property-card" onclick="window.location.href='/property-detail.html?id=${prop.id}'">
                <div class="card-image">
                    <img src="${firstImage}" alt="${prop.title}">
                    <span class="sale-badge">For ${prop.offer_type || 'Sale'}</span>
                    <div class="wishlist-btn">
                        <i class="far fa-heart"></i>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="property-title">${prop.title}</h3>
                    <div class="property-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${prop.city}, ${prop.district}</span>
                    </div>
                    <div class="divider"></div>
                    <div class="price-section">
                        <div class="price">
                            LKR ${prop.price.toLocaleString()}
                        </div>
                        <button class="view-btn">
                            View Property &rarr;
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }
}

// Apply filters
function applyFilters() {
    const filters = {
        type: document.getElementById('filterType')?.value,
        offer: document.getElementById('filterOffer')?.value,
        minPrice: document.getElementById('filterMinPrice')?.value,
        maxPrice: document.getElementById('filterMaxPrice')?.value,
        bedrooms: document.getElementById('filterBedrooms')?.value
    };
    loadProperties(filters);
}

// Load property details
async function loadPropertyDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
        const response = await fetch(`${API_URL}/properties/${id}`);
        const property = await response.json();

        // Display property details
        document.getElementById('propertyTitle').innerHTML = property.title;
        document.getElementById('propertyPrice').innerHTML = `LKR ${property.price.toLocaleString()}`;
        document.getElementById('propertyDetails').innerHTML = `
            <p><strong>Type:</strong> ${property.property_type}</p>
            <p><strong>Offer:</strong> ${property.offer_type}</p>
            <p><strong>Bedrooms:</strong> ${property.bedrooms || 'N/A'}</p>
            <p><strong>Bathrooms:</strong> ${property.bathrooms || 'N/A'}</p>
            <p><strong>Land Area:</strong> ${property.land_area || 'N/A'} perches</p>
            <p><strong>Location:</strong> ${property.city}, ${property.district}</p>
            <p><strong>Description:</strong> ${property.description || 'No description available'}</p>
        `;

        // Set seller contact
        document.getElementById('sellerName').innerHTML = property.seller_name;
        document.getElementById('sellerPhone').innerHTML = property.seller_phone;
        document.getElementById('whatsappLink').href = `https://wa.me/94${property.seller_phone}`;

        // Store property ID for inquiry form
        document.getElementById('propertyId').value = property.id;
    }
}

// Submit inquiry
async function submitInquiry() {
    const propertyId = document.getElementById('propertyId').value;
    const name = document.getElementById('inquiryName').value;
    const phone = document.getElementById('inquiryPhone').value;
    const email = document.getElementById('inquiryEmail').value;
    const message = document.getElementById('inquiryMessage').value;

    const response = await fetch(`${API_URL}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId, name, phone, email, message })
    });

    if (response.ok) {
        alert('Your inquiry has been sent successfully!');
        document.getElementById('inquiryForm').reset();
    } else {
        alert('Error sending inquiry. Please try again.');
    }
}

// Post new property
async function postProperty(event) {
    event.preventDefault();

    const formData = {
        title: document.getElementById('propTitle').value,
        description: document.getElementById('propDesc').value,
        price: document.getElementById('propPrice').value,
        property_type: document.getElementById('propType').value,
        offer_type: document.getElementById('propOffer').value,
        bedrooms: document.getElementById('propBedrooms').value || null,
        bathrooms: document.getElementById('propBathrooms').value || null,
        land_area: document.getElementById('propLandArea').value || null,
        address: document.getElementById('propAddress').value,
        city: document.getElementById('propCity').value,
        district: document.getElementById('propDistrict').value,
        seller_name: document.getElementById('sellerNameInput').value,
        seller_phone: document.getElementById('sellerPhoneInput').value,
        seller_email: document.getElementById('sellerEmail').value,
        images: '[]' // For now empty array
    };

    const response = await fetch(`${API_URL}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });

    if (response.ok) {
        alert('Property posted successfully! It will appear after admin approval.');
        window.location.href = '/';
    } else {
        alert('Error posting property. Please try again.');
    }
}

// Initialize page based on current URL
if (window.location.pathname === '/properties.html') {
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters = Object.fromEntries(urlParams.entries());

    // Populate initial filter inputs if they exist
    if (initialFilters.type) {
        const typeEl = document.getElementById('filterType');
        if (typeEl) typeEl.value = initialFilters.type;
    }
    if (initialFilters.offer) {
        const offerEl = document.getElementById('filterOffer');
        if (offerEl) offerEl.value = initialFilters.offer;
    }

    loadProperties(initialFilters);
}

if (window.location.pathname === '/property-detail.html') {
    loadPropertyDetail();
}
