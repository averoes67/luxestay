const data = {"success":true,"data":[{"id":1,"name":"Standard Room","slug":"standard-room","description":"A refined retreat.","base_price":120,"capacity":2,"size_sqm":28,"amenities":["King-size bed"],"image_url":"assets/images/room-standard-room.jpg","is_active":true},{"id":2,"name":"Superior Room","slug":"superior-room","description":"Elevated comfort.","base_price":180,"capacity":2,"size_sqm":35,"amenities":["King-size bed"],"image_url":"assets/images/room-superior-room.jpg","is_active":true},{"id":3,"name":"Deluxe Suite","slug":"deluxe-suite","description":"Spacious elegance.","base_price":280,"capacity":3,"size_sqm":48,"amenities":["King-size bed"],"image_url":"assets/images/room-deluxe-suite.jpg","is_active":true},{"id":4,"name":"Premium Suite","slug":"premium-suite","description":"Unrivaled experience.","base_price":420,"capacity":4,"size_sqm":65,"amenities":["King-size bed"],"image_url":"assets/images/room-premium-suite.jpg","is_active":true},{"id":5,"name":"Presidential Suite","slug":"presidential-suite","description":"The crown jewel.","base_price":750,"capacity":6,"size_sqm":120,"amenities":["Master king-size bed"],"image_url":"assets/images/room-presidential-suite.jpg","is_active":true}],"count":5};

global.window = { formatCurrency: (v) => '$' + v };

try {
  const rooms = data.data;
  const html = rooms.map((room, index) => `
    <div class="room-card animate-on-scroll delay-${(index % 3) + 1}" style="opacity: 1; transform: translateY(0);" data-price="${room.base_price}" data-capacity="${room.capacity}" data-size="${room.size || 45}" data-index="${index}">
      <div class="room-card-image">
        <img src="${room.image_url || 'assets/images/room-standard.jpg'}" alt="${room.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;">
        <div class="overlay"></div>
        <div class="price-badge">${window.formatCurrency(room.base_price)} <small>/night</small></div>
      </div>
      <div class="room-card-content">
        <h3>${room.name}</h3>
        <p class="room-desc">${room.description || 'Experience ultimate comfort and luxury.'}</p>
        <div class="room-meta">
          <div class="room-meta-item">
            <i data-lucide="users"></i>
            <span>${room.capacity} Guests</span>
          </div>
          <div class="room-meta-item">
            <i data-lucide="maximize"></i>
            <span>${room.size || '45'} m²</span>
          </div>
          <div class="room-meta-item">
            <i data-lucide="bed-double"></i>
            <span>${room.bed_type || 'King Bed'}</span>
          </div>
        </div>
        <div class="room-amenities">
          ${(Array.isArray(room.amenities) ? room.amenities : (room.amenities || 'WiFi,TV,AC').split(',')).slice(0,4).map(a => `<span class="amenity-tag"><i data-lucide="check"></i> ${a.trim()}</span>`).join('')}
        </div>
        <button class="btn btn-secondary w-full" onclick="openAvailabilityModal('${room.name.replace(/'/g, "\\'")}', ${room.id})">
          <i data-lucide="calendar"></i> Check Availability
        </button>
      </div>
    </div>
  `).join('');
  console.log("SUCCESS, html length:", html.length);
} catch (e) {
  console.error("ERROR:", e);
}
