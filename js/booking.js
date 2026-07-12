/* ═══════════════════════════════════════════════
   LUXESTAY — Multi-Step Booking Flow
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── State ──
    let currentStep = 1;
    let bookingData = {
        checkIn: '',
        checkOut: '',
        guests: 2,
        nights: 0,
        room: null,      // selected room object
        totalPrice: 0,
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        specialRequests: '',
        reservationId: null
    };
    let availableRooms = [];
    let currentUser = null;

    // ── DOM References ──
    const checkInEl      = document.getElementById('checkIn');
    const checkOutEl     = document.getElementById('checkOut');
    const guestsEl       = document.getElementById('guestsCount');
    const durationEl     = document.getElementById('durationDisplay');
    const nightsEl       = document.getElementById('nightsCount');
    const estPriceEl     = document.getElementById('estPrice');
    const roomsGrid      = document.getElementById('roomsGrid');
    const roomsLoading   = document.getElementById('roomsLoading');
    const roomsEmpty     = document.getElementById('roomsEmpty');
    const toStep3Btn     = document.getElementById('toStep3Btn');
    const summaryContent = document.getElementById('summaryContent');
    const confirmDetails = document.getElementById('confirmDetails');
    const bookingRefEl   = document.getElementById('bookingRef');

    // ── Init ──
    async function init() {
        setMinDates();
        bindEvents();

        try {
            const user = typeof checkAuth === 'function' ? await checkAuth() : null;
            if (user) {
                currentUser = user;
                if (typeof updateNavForAuth === 'function') updateNavForAuth(currentUser);
            }
        } catch (_) { /* guest mode */ }

        // Pre-populate from URL params
        const params = new URLSearchParams(window.location.search);
        let autoSearch = false;
        if (params.get('check_in')) {
            checkInEl.value = params.get('check_in');
            autoSearch = true;
        }
        if (params.get('check_out')) checkOutEl.value = params.get('check_out');
        if (params.get('guests'))    guestsEl.value   = params.get('guests');
        updateDuration();

        if (autoSearch && params.get('check_out')) {
            // Slight delay to allow UI to render first
            setTimeout(() => { searchRooms(); }, 300);
        }

        lucide.createIcons();
    }

    function setMinDates() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        checkInEl.min  = formatDate(today);
        checkOutEl.min = formatDate(tomorrow);
        checkInEl.value = formatDate(today);
        checkOutEl.value = formatDate(tomorrow);
    }

    function formatDate(d) {
        return d.toISOString().split('T')[0];
    }

    function formatDateDisplay(str) {
        if (!str) return '—';
        const d = new Date(str + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }

    // formatCurrency is now handled globally in app.js

    // ── Events ──
    function bindEvents() {
        checkInEl.addEventListener('change', onCheckInChange);
        checkOutEl.addEventListener('change', updateDuration);
        guestsEl.addEventListener('change', () => { bookingData.guests = parseInt(guestsEl.value); });

        document.getElementById('searchRoomsBtn').addEventListener('click', searchRooms);
        document.getElementById('backToStep1').addEventListener('click',  () => goToStep(1));
        toStep3Btn.addEventListener('click', () => goToStep(3));
        document.getElementById('backToStep2').addEventListener('click',  () => goToStep(2));
        document.getElementById('confirmBookingBtn').addEventListener('click', submitBooking);
        document.getElementById('processPaymentBtn')?.addEventListener('click', processPayment);

        // Payment Method selection style logic
        const paymentMethods = document.querySelectorAll('input[name="payment_method"]');
        paymentMethods.forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.querySelectorAll('.payment-method-card').forEach(card => {
                    card.style.border = '1px solid var(--border-color)';
                    card.style.background = 'transparent';
                    card.querySelector('i').style.color = 'var(--text-secondary)';
                });
                const activeCard = e.target.closest('.payment-method-card');
                activeCard.style.border = '2px solid var(--gold)';
                activeCard.style.background = 'rgba(212,168,83,.05)';
                activeCard.querySelector('i').style.color = 'var(--gold)';
            });
        });
    }

    function onCheckInChange() {
        const ci = new Date(checkInEl.value + 'T00:00:00');
        const next = new Date(ci);
        next.setDate(next.getDate() + 1);
        checkOutEl.min = formatDate(next);
        if (new Date(checkOutEl.value + 'T00:00:00') <= ci) {
            checkOutEl.value = formatDate(next);
        }
        updateDuration();
    }

    function updateDuration() {
        const ci = new Date(checkInEl.value + 'T00:00:00');
        const co = new Date(checkOutEl.value + 'T00:00:00');
        if (isNaN(ci) || isNaN(co) || co <= ci) {
            durationEl.style.display = 'none';
            return;
        }
        const nights = Math.round((co - ci) / (1000 * 60 * 60 * 24));
        bookingData.nights = nights;
        bookingData.checkIn = checkInEl.value;
        bookingData.checkOut = checkOutEl.value;
        bookingData.guests = parseInt(guestsEl.value);
        nightsEl.textContent = nights + (nights === 1 ? ' Night' : ' Nights');
        estPriceEl.textContent = formatCurrency(nights * 199);
        durationEl.style.display = 'flex';
    }

    // ── Step Controller ──
    function goToStep(n) {
        if (n > currentStep && !validateStep(currentStep)) return;

        // Update panels
        document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('step' + n).classList.add('active');

        // Update indicator
        document.querySelectorAll('.step-item').forEach(item => {
            const s = parseInt(item.dataset.step);
            item.classList.remove('active', 'completed');
            if (s < n)  item.classList.add('completed');
            if (s === n) item.classList.add('active');
        });
        document.querySelectorAll('.step-line').forEach((line, i) => {
            line.classList.toggle('completed', i + 1 < n);
        });

        currentStep = n;

        // Step-specific actions
        if (n === 3) buildSummary();

        window.scrollTo({ top: 200, behavior: 'smooth' });
        lucide.createIcons();
    }

    function validateStep(n) {
        if (n === 1) {
            if (!checkInEl.value || !checkOutEl.value) {
                showToast('Please select check-in and check-out dates.', 'error');
                return false;
            }
            if (bookingData.nights < 1) {
                showToast('Check-out must be after check-in.', 'error');
                return false;
            }
            return true;
        }
        if (n === 2) {
            if (!bookingData.room) {
                showToast('Please select a room to continue.', 'error');
                return false;
            }
            return true;
        }
        if (n === 3) {
            const name  = document.getElementById('guestName').value.trim();
            const email = document.getElementById('guestEmail').value.trim();
            if (!name) { showToast('Please enter your full name.', 'error'); return false; }
            if (!email || !email.includes('@')) { showToast('Please enter a valid email.', 'error'); return false; }
            bookingData.guestName = name;
            bookingData.guestEmail = email;
            bookingData.guestPhone = document.getElementById('guestPhone').value.trim();
            bookingData.specialRequests = document.getElementById('specialRequests').value.trim();
            
            if (!currentUser) {
                const pwd = document.getElementById('guestPassword').value;
                if (!pwd || pwd.length < 6) {
                    showToast('Please create a password (min. 6 characters).', 'error');
                    return false;
                }
                bookingData.guestPassword = pwd;
            }
            return true;
        }
        return true;
    }

    // ── Step 1 → Search Rooms ──
    async function searchRooms() {
        if (!validateStep(1)) return;

        goToStep(2);
        roomsGrid.innerHTML = '';
        roomsLoading.style.display = 'block';
        roomsEmpty.style.display   = 'none';
        bookingData.room = null;
        toStep3Btn.disabled = true;

        try {
            const res = await apiRequest('rooms.php?action=list');
            if (!res.success || !res.data || res.data.length === 0) {
                roomsLoading.style.display = 'none';
                roomsEmpty.style.display   = 'block';
                return;
            }

            // Check availability for each room type
            const roomsWithAvail = [];
            for (const room of res.data) {
                try {
                    const avail = await apiRequest(
                        `rooms.php?action=availability&type_id=${room.id}&check_in=${bookingData.checkIn}&check_out=${bookingData.checkOut}`
                    );
                    if (avail.success && avail.available_count > 0) {
                        room._availCount = avail.available_count;
                        roomsWithAvail.push(room);
                    }
                } catch (_) {
                    // Assume available on error
                    room._availCount = 1;
                    roomsWithAvail.push(room);
                }
            }

            availableRooms = roomsWithAvail;
            roomsLoading.style.display = 'none';

            if (availableRooms.length === 0) {
                roomsEmpty.style.display = 'block';
                return;
            }

            renderRoomCards();
        } catch (err) {
            roomsLoading.style.display = 'none';
            roomsEmpty.style.display = 'block';
            showToast('Error loading rooms. Please try again.', 'error');
        }
    }

    // ── Step 2 → Render Rooms ──
    function renderRoomCards() {
        roomsGrid.innerHTML = '';
        availableRooms.forEach(room => {
            const totalPrice = bookingData.nights * parseFloat(room.base_price);
            const amenities = room.amenities ? (typeof room.amenities === 'string' ? JSON.parse(room.amenities) : room.amenities) : [];
            const amenitiesHtml = (Array.isArray(amenities) ? amenities.slice(0, 4) : [])
                .map(a => `<span class="amenity-tag">${a}</span>`).join('');

            const card = document.createElement('div');
            card.className = 'room-card';
            card.dataset.roomId = room.id;
            card.innerHTML = `
                <div class="room-card-image">
                    ${room.image_url
                        ? `<img src="${room.image_url}" alt="${room.name}" loading="lazy">`
                        : `<i data-lucide="bed-double" class="room-placeholder-icon" style="width:64px;height:64px;"></i>`
                    }
                    <div class="room-price-tag">
                        <span class="price-amount">${formatCurrency(room.base_price)}</span>
                        <span class="price-unit"> / night</span>
                    </div>
                </div>
                <div class="room-card-body">
                    <h3>${room.name}</h3>
                    <div class="room-meta">
                        <span><i data-lucide="users"></i> ${room.capacity} Guests</span>
                        <span><i data-lucide="maximize"></i> ${room.size_sqm} m²</span>
                    </div>
                    <div class="room-amenities">${amenitiesHtml}</div>
                    <div class="room-total-price">
                        <span class="label">${bookingData.nights} night${bookingData.nights > 1 ? 's' : ''} total</span>
                        <span class="total">${formatCurrency(totalPrice)}</span>
                    </div>
                    <button class="select-btn">Select Room</button>
                </div>
            `;

            card.addEventListener('click', () => selectRoom(room, totalPrice, card));
            roomsGrid.appendChild(card);
        });

        lucide.createIcons();
    }

    function selectRoom(room, totalPrice, card) {
        document.querySelectorAll('.room-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        bookingData.room = room;
        bookingData.totalPrice = totalPrice;
        toStep3Btn.disabled = false;
    }

    // ── Step 3 → Build Summary ──
    function buildSummary() {
        // Auto-fill if logged in
        if (currentUser) {
            document.getElementById('guestName').value  = currentUser.full_name || '';
            document.getElementById('guestName').readOnly = true;
            document.getElementById('guestEmail').value = currentUser.email || '';
            document.getElementById('guestEmail').readOnly = true;
            document.getElementById('guestPhone').value = currentUser.phone || '';
            document.getElementById('guestPhone').readOnly = true;
            document.getElementById('loginPrompt').style.display = 'none';
            document.getElementById('guestPasswordGroup').style.display = 'none';
        } else {
            document.getElementById('loginPrompt').style.display = 'block';
            document.getElementById('guestPasswordGroup').style.display = 'block';
            document.getElementById('guestName').readOnly = false;
            document.getElementById('guestEmail').readOnly = false;
            document.getElementById('guestPhone').readOnly = false;
        }

        summaryContent.innerHTML = `
            <div class="summary-row">
                <span class="label">Room</span>
                <span class="value">${bookingData.room.name}</span>
            </div>
            <div class="summary-row">
                <span class="label">Check-in</span>
                <span class="value">${formatDateDisplay(bookingData.checkIn)}</span>
            </div>
            <div class="summary-row">
                <span class="label">Check-out</span>
                <span class="value">${formatDateDisplay(bookingData.checkOut)}</span>
            </div>
            <div class="summary-row">
                <span class="label">Duration</span>
                <span class="value">${bookingData.nights} Night${bookingData.nights > 1 ? 's' : ''}</span>
            </div>
            <div class="summary-row">
                <span class="label">Guests</span>
                <span class="value">${bookingData.guests}</span>
            </div>
            <div class="summary-row">
                <span class="label">Price / Night</span>
                <span class="value">${formatCurrency(bookingData.room.base_price)}</span>
            </div>
            <div class="summary-total">
                <span class="label">Total</span>
                <span class="value">${formatCurrency(bookingData.totalPrice)}</span>
            </div>
        `;
        lucide.createIcons();
    }

    // ── Step 4 → Submit ──
    async function submitBooking() {
        if (!validateStep(3)) return;

        const btn = document.getElementById('confirmBookingBtn');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto;"></div>';

        try {
            // Auto-register if not logged in
            if (!currentUser) {
                const regRes = await apiRequest('auth.php?action=register', {
                    method: 'POST',
                    body: {
                        full_name: bookingData.guestName,
                        email: bookingData.guestEmail,
                        phone: bookingData.guestPhone,
                        password: bookingData.guestPassword
                    }
                });
                
                if (!regRes.success) {
                    showToast(regRes.error || regRes.message || 'Registration failed. Email might already be in use.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i data-lucide="shield-check" style="width:16px;height:16px;"></i> Confirm Booking';
                    lucide.createIcons();
                    return;
                }
                
                currentUser = await window.checkAuth();
            }

            const payload = {
                room_type_id: bookingData.room.id,
                check_in: bookingData.checkIn,
                check_out: bookingData.checkOut,
                guests_count: bookingData.guests,
                special_requests: bookingData.specialRequests
            };
            const res = await apiRequest('reservations.php?action=create', {
                method: 'POST',
                body: payload
            });

            if (res.success) {
                bookingData.reservationId = res.reservation?.id || res.id || null;
                
                // Show Payment Step (Step 4)
                const paymentAmountDue = document.getElementById('paymentAmountDue');
                if (paymentAmountDue) paymentAmountDue.textContent = formatCurrency(bookingData.totalPrice);
                
                goToStep(4);
            } else {
                showToast(res.message || 'Booking failed. Please try again.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="shield-check" style="width:16px;height:16px;"></i> Confirm Booking';
                lucide.createIcons();
            }
        } catch (err) {
            showToast('An error occurred. Please try again.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="shield-check" style="width:16px;height:16px;"></i> Confirm Booking';
            lucide.createIcons();
        }
    }

    // ── Step 4 → Step 5 (Payment) ──
    async function processPayment() {
        const btn = document.getElementById('processPaymentBtn');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto;border-color:rgba(255,255,255,0.3);border-top-color:#fff;"></div>';

        // Payment Method Check
        const selectedMethod = document.querySelector('input[name="payment_method"]:checked')?.value;
        if (!selectedMethod) {
            showToast('Please select a payment method.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="lock" style="width:16px;height:16px;"></i> Pay Now';
            lucide.createIcons();
            return;
        }

        try {
            // Call API to mark as paid
            const res = await apiRequest('reservations.php?action=pay', {
                method: 'POST',
                body: { reservation_id: bookingData.reservationId }
            });

            if (res.success) {
                showConfirmation(res.reservation || bookingData);
                goToStep(5);
                showToast('Payment successful!', 'success');
            } else {
                showToast(res.message || 'Payment failed.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="lock" style="width:16px;height:16px;"></i> Pay Now';
                lucide.createIcons();
            }
        } catch (err) {
            showToast('An error occurred during payment.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="lock" style="width:16px;height:16px;"></i> Pay Now';
            lucide.createIcons();
        }
    }

    function showConfirmation(reservation) {
        const refId = 'LXS-' + String(Math.floor(100000 + Math.random() * 900000));
        bookingRefEl.textContent = refId;

        confirmDetails.innerHTML = `
            <div class="summary-row">
                <span class="label">Room</span>
                <span class="value">${bookingData.room.name}</span>
            </div>
            <div class="summary-row">
                <span class="label">Check-in</span>
                <span class="value">${formatDateDisplay(bookingData.checkIn)}</span>
            </div>
            <div class="summary-row">
                <span class="label">Check-out</span>
                <span class="value">${formatDateDisplay(bookingData.checkOut)}</span>
            </div>
            <div class="summary-row">
                <span class="label">Duration</span>
                <span class="value">${bookingData.nights} Night${bookingData.nights > 1 ? 's' : ''}</span>
            </div>
            <div class="summary-row">
                <span class="label">Guests</span>
                <span class="value">${bookingData.guests}</span>
            </div>
            <div class="summary-row">
                <span class="label">Guest Name</span>
                <span class="value">${bookingData.guestName}</span>
            </div>
            <div class="summary-total">
                <span class="label">Total Paid</span>
                <span class="value">${formatCurrency(bookingData.totalPrice)}</span>
            </div>
        `;
        lucide.createIcons();
    }

    // ── Boot ──
    document.addEventListener('DOMContentLoaded', init);
})();
