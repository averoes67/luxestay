/* ═══════════════════════════════════════════════
   LUXESTAY — Admin Dashboard
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── State ──
    let currentUser   = null;
    let activePanel   = 'overview';
    let loadedPanels  = {};
    let revenueChart  = null;
    let roomTypeChart = null;
    let revBigChart   = null;
    let revByTypeChart = null;

    let resPage       = 1;
    let guestPage     = 1;
    let guestSearch   = '';
    let guestDebounce = null;
    let revDays       = 30;
    let editRoomTypeId = null;

    // ── Chart.js Theme ──
    const chartColors = {
        gold:    '#d4a853',
        goldFade: 'rgba(212, 168, 83, 0.15)',
        blue:    '#60a5fa',
        green:   '#4ade80',
        purple:  '#a855f7',
        orange:  '#fb923c',
        red:     '#f87171',
        grid:    'rgba(255,255,255,0.05)',
        text:    'rgba(245, 240, 232, 0.7)',
        tooltipBg: 'rgba(10, 14, 26, 0.95)'
    };

    Chart.defaults.color = chartColors.text;
    Chart.defaults.font.family = "'Inter', sans-serif";

    // ── Init ──
    async function init() {
        try {
            const user = typeof checkAuth === 'function' ? await checkAuth() : null;
            if (!user || user.role !== 'admin') {
                window.location.href = 'login.html';
                return;
            }
            currentUser = user;
            document.getElementById('adminName').textContent = currentUser.full_name || 'Admin';
            document.getElementById('adminAvatar').textContent = (currentUser.full_name || 'A').charAt(0).toUpperCase();
        } catch (_) {
            window.location.href = 'login.html';
            return;
        }

        bindEvents();
        handleHash();
        lucide.createIcons();
    }

    // ── Events ──
    function bindEvents() {
        // Sidebar nav
        document.querySelectorAll('.sidebar-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const panel = item.dataset.panel;
                window.location.hash = panel;
                switchPanel(panel);
            });
        });

        // Sidebar toggle (mobile)
        const toggle  = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('adminSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (toggle) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            });
        }
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }

        // Logout
        document.getElementById('adminLogout').addEventListener('click', async () => {
            try {
                await apiRequest('auth.php?action=logout', { method: 'POST' });
            } catch (_) {}
            window.location.href = 'login.html';
        });

        // Reservations filter
        const filterStatus = document.getElementById('filterStatus');
        const filterSearch = document.getElementById('filterSearch');
        if (filterStatus) filterStatus.addEventListener('change', () => { resPage = 1; loadReservations(); });
        if (filterSearch) filterSearch.addEventListener('input', () => { resPage = 1; loadReservations(); });

        // Guest search
        const guestSearchEl = document.getElementById('guestSearch');
        if (guestSearchEl) {
            guestSearchEl.addEventListener('input', (e) => {
                clearTimeout(guestDebounce);
                guestDebounce = setTimeout(() => {
                    guestSearch = e.target.value.trim();
                    guestPage = 1;
                    loadGuests();
                }, 300);
            });
        }

        // Revenue date range
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                revDays = parseInt(btn.dataset.days);
                loadRevenue();
            });
        });

        // Save price
        document.getElementById('savePriceBtn').addEventListener('click', savePrice);

        // Hash changes
        window.addEventListener('hashchange', handleHash);
    }

    function handleHash() {
        const hash = (window.location.hash || '#overview').replace('#', '');
        switchPanel(hash);
    }

    function switchPanel(panel) {
        activePanel = panel;

        // Update sidebar
        document.querySelectorAll('.sidebar-nav-item').forEach(i => {
            i.classList.toggle('active', i.dataset.panel === panel);
        });

        // Update panels
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('panel-' + panel);
        if (target) target.classList.add('active');

        // Update title
        const titles = { overview: 'Overview', rooms: 'Rooms', reservations: 'Reservations', guests: 'Guests', revenue: 'Revenue' };
        document.getElementById('panelTitle').textContent = titles[panel] || 'Overview';

        // Lazy-load panel data
        if (!loadedPanels[panel]) {
            loadedPanels[panel] = true;
            switch (panel) {
                case 'overview':     loadDashboard(); break;
                case 'rooms':        loadRooms(); break;
                case 'reservations': loadReservations(); break;
                case 'guests':       loadGuests(); break;
                case 'revenue':      loadRevenue(); break;
            }
        }

        // Close mobile sidebar
        document.getElementById('adminSidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');

        lucide.createIcons();
    }

    // ═══════════════════════════════
    //  OVERVIEW PANEL
    // ═══════════════════════════════

    async function loadDashboard() {
        try {
            const res = await apiRequest('admin.php?action=dashboard');
            if (res.success && res.data) {
                const d = res.data;
                animateCounter('kpiTotalRooms', d.total_rooms || 0);
                animateCounter('kpiOccupancy', d.occupancy_rate || 0, '%');
                animateCounter('kpiRevenue', d.today_revenue || 0, '', 'IDR');
                animateCounter('kpiGuests', d.active_reservations || 0);
            }
        } catch (_) {
            showToast('Failed to load dashboard stats.', 'error');
        }

        initRevenueChart();
        initRoomTypeChart();
        loadRecentReservations();
    }

    function animateCounter(id, target, suffix = '', prefix = '') {
        const el = document.getElementById(id);
        if (!el) return;
        const num = parseFloat(target);
        const duration = 1500;
        const start = performance.now();

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = Math.round(eased * num);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    async function initRevenueChart() {
        try {
            const res = await apiRequest('admin.php?action=revenue&days=30');
            const data = res.success && res.data ? res.data : [];
            const labels = data.map(d => {
                const dt = new Date(d.date + 'T00:00:00');
                return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const values = data.map(d => parseFloat(d.revenue || 0));

            const ctx = document.getElementById('revenueChart').getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, 'rgba(212, 168, 83, 0.25)');
            gradient.addColorStop(1, 'rgba(212, 168, 83, 0)');

            if (revenueChart) revenueChart.destroy();
            revenueChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Revenue',
                        data: values,
                        borderColor: chartColors.gold,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: chartColors.gold,
                        pointBorderColor: chartColors.gold,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        borderWidth: 2.5
                    }]
                },
                options: chartOptions('$')
            });
        } catch (_) {}
    }

    async function initRoomTypeChart() {
        try {
            const res = await apiRequest('admin.php?action=revenue_by_type');
            const data = res.success && res.data ? res.data : [];
            const labels = data.map(d => d.room_type);
            const values = data.map(d => parseFloat(d.revenue || 0));
            const colors = [chartColors.gold, chartColors.blue, chartColors.green, chartColors.purple, chartColors.orange];

            const ctx = document.getElementById('roomTypeChart').getContext('2d');
            if (roomTypeChart) roomTypeChart.destroy();
            roomTypeChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.slice(0, labels.length),
                        borderColor: 'rgba(10, 14, 26, 0.8)',
                        borderWidth: 3,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', color: chartColors.text, font: { size: 12 } }
                        },
                        tooltip: tooltipConfig('$')
                    }
                }
            });
        } catch (_) {}
    }

    async function loadRecentReservations() {
        const tbody = document.getElementById('recentReservationsBody');
        try {
            const res = await apiRequest('admin.php?action=recent&limit=10');
            const data = res.success && res.data ? res.data : [];
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="admin-empty"><p>No recent reservations</p></td></tr>';
                return;
            }
            tbody.innerHTML = data.map(r => `
                <tr>
                    <td style="font-weight:500;">${r.guest_name || r.full_name || '—'}</td>
                    <td>${r.room_type_name || '—'} ${r.room_number ? '#' + r.room_number : ''}</td>
                    <td>${formatDateTbl(r.check_in)}</td>
                    <td>${formatDateTbl(r.check_out)}</td>
                    <td style="color:var(--gold);font-weight:600;">${window.formatCurrency(r.total_price || 0)}</td>
                    <td><span class="badge badge-${(r.status || '').replace('_','-')}">${(r.status || '').replace('_',' ')}</span></td>
                    <td>
                        <select class="status-select" data-res-id="${r.id}" onchange="window._updateResStatus(this)">
                            <option value="pending" ${r.status==='pending'?'selected':''}>Pending</option>
                            <option value="confirmed" ${r.status==='confirmed'?'selected':''}>Confirmed</option>
                            <option value="checked_in" ${r.status==='checked_in'?'selected':''}>Checked In</option>
                            <option value="checked_out" ${r.status==='checked_out'?'selected':''}>Checked Out</option>
                            <option value="cancelled" ${r.status==='cancelled'?'selected':''}>Cancelled</option>
                        </select>
                    </td>
                </tr>
            `).join('');
        } catch (_) {
            tbody.innerHTML = '<tr><td colspan="7" class="admin-empty"><p>Error loading data</p></td></tr>';
        }
        lucide.createIcons();
    }

    // ═══════════════════════════════
    //  ROOMS PANEL
    // ═══════════════════════════════

    async function loadRooms() {
        const tbody = document.getElementById('roomsTableBody');
        tbody.innerHTML = '<tr><td colspan="6"><div class="admin-loading"><div class="admin-spinner"></div></div></td></tr>';

        try {
            const res = await apiRequest('admin.php?action=rooms');
            const data = res.success && res.data ? res.data : [];

            // Summary counts
            const avail = data.filter(r => r.status === 'available').length;
            const occup = data.filter(r => r.status === 'occupied').length;
            const maint = data.filter(r => r.status === 'maintenance').length;
            document.getElementById('roomsAvailable').textContent   = avail;
            document.getElementById('roomsOccupied').textContent    = occup;
            document.getElementById('roomsMaintenance').textContent  = maint;

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="admin-empty"><p>No rooms found</p></td></tr>';
                return;
            }

            tbody.innerHTML = data.map(r => `
                <tr>
                    <td style="font-weight:600;">${r.room_number}</td>
                    <td>${r.floor || '—'}</td>
                    <td>${r.room_type_name || '—'}</td>
                    <td style="color:var(--gold);font-weight:600;">${window.formatCurrency(r.base_price || 0)}</td>
                    <td>
                        <select class="status-select" data-room-id="${r.id}" onchange="window._updateRoomStatus(this)">
                            <option value="available" ${r.status==='available'?'selected':''}>Available</option>
                            <option value="occupied" ${r.status==='occupied'?'selected':''}>Occupied</option>
                            <option value="maintenance" ${r.status==='maintenance'?'selected':''}>Maintenance</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn" onclick="window._openEditPrice(${r.room_type_id || r.id}, '${(r.room_type_name || '').replace("'", "\\'")}', ${r.base_price})">
                            <i data-lucide="edit-3"></i> Edit Price
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (_) {
            tbody.innerHTML = '<tr><td colspan="6" class="admin-empty"><p>Error loading rooms</p></td></tr>';
        }
        lucide.createIcons();
    }

    // ═══════════════════════════════
    //  RESERVATIONS PANEL
    // ═══════════════════════════════

    async function loadReservations() {
        const tbody = document.getElementById('reservationsTableBody');
        tbody.innerHTML = '<tr><td colspan="9"><div class="admin-loading"><div class="admin-spinner"></div></div></td></tr>';

        const status = document.getElementById('filterStatus')?.value || '';
        const search = document.getElementById('filterSearch')?.value || '';

        try {
            let url = `admin.php?action=recent&limit=50`;
            if (status) url += `&status=${status}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const res = await apiRequest(url);
            const data = res.success && res.data ? res.data : [];

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="admin-empty"><p>No reservations found</p></td></tr>';
                return;
            }

            tbody.innerHTML = data.map(r => `
                <tr>
                    <td>#${r.id}</td>
                    <td style="font-weight:500;">${r.guest_name || r.full_name || '—'}</td>
                    <td>${r.room_type_name || '—'}</td>
                    <td>${formatDateTbl(r.check_in)}</td>
                    <td>${formatDateTbl(r.check_out)}</td>
                    <td>${r.guests_count || '—'}</td>
                    <td style="color:var(--gold);font-weight:600;">${window.formatCurrency(r.total_price || 0)}</td>
                    <td><span class="badge badge-${(r.status||'').replace('_','-')}">${(r.status||'').replace('_',' ')}</span></td>
                    <td>
                        <select class="status-select" data-res-id="${r.id}" onchange="window._updateResStatus(this)">
                            <option value="pending" ${r.status==='pending'?'selected':''}>Pending</option>
                            <option value="confirmed" ${r.status==='confirmed'?'selected':''}>Confirmed</option>
                            <option value="checked_in" ${r.status==='checked_in'?'selected':''}>Checked In</option>
                            <option value="checked_out" ${r.status==='checked_out'?'selected':''}>Checked Out</option>
                            <option value="cancelled" ${r.status==='cancelled'?'selected':''}>Cancelled</option>
                        </select>
                    </td>
                </tr>
            `).join('');
        } catch (_) {
            tbody.innerHTML = '<tr><td colspan="9" class="admin-empty"><p>Error loading reservations</p></td></tr>';
        }
        lucide.createIcons();
    }

    // ═══════════════════════════════
    //  GUESTS PANEL
    // ═══════════════════════════════

    async function loadGuests() {
        const tbody = document.getElementById('guestsTableBody');
        tbody.innerHTML = '<tr><td colspan="5"><div class="admin-loading"><div class="admin-spinner"></div></div></td></tr>';

        try {
            let url = `admin.php?action=guests&page=${guestPage}`;
            if (guestSearch) url += `&search=${encodeURIComponent(guestSearch)}`;

            const res = await apiRequest(url);
            const data = res.success && res.data ? res.data : [];
            const totalPages = res.total_pages || 1;

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="admin-empty"><p>No guests found</p></td></tr>';
                renderPagination('guestsPagination', guestPage, totalPages, (p) => { guestPage = p; loadGuests(); });
                return;
            }

            tbody.innerHTML = data.map(g => `
                <tr>
                    <td style="font-weight:500;">${g.full_name || '—'}</td>
                    <td>${g.email || '—'}</td>
                    <td>${g.phone || '—'}</td>
                    <td style="text-align:center;">${g.total_bookings || 0}</td>
                    <td style="color:var(--gold);font-weight:600;">${window.formatCurrency(g.total_spent || 0)}</td>
                </tr>
            `).join('');

            renderPagination('guestsPagination', guestPage, totalPages, (p) => { guestPage = p; loadGuests(); });
        } catch (_) {
            tbody.innerHTML = '<tr><td colspan="5" class="admin-empty"><p>Error loading guests</p></td></tr>';
        }
        lucide.createIcons();
    }

    // ═══════════════════════════════
    //  REVENUE PANEL
    // ═══════════════════════════════

    async function loadRevenue() {
        try {
            const res = await apiRequest(`admin.php?action=revenue&days=${revDays}`);
            const data = res.success && res.data ? res.data : [];

            // Summary cards
            const totalRev = data.reduce((s, d) => s + parseFloat(d.revenue || 0), 0);
            const avgDaily = data.length > 0 ? totalRev / data.length : 0;
            const highest  = data.length > 0 ? Math.max(...data.map(d => parseFloat(d.revenue || 0))) : 0;

            document.getElementById('revTotal').textContent = window.formatCurrency(totalRev);
            document.getElementById('revAvg').textContent      = '$' + Math.round(avgDaily).toLocaleString();
            document.getElementById('revHighest').textContent   = '$' + highest.toLocaleString();
            document.getElementById('revBookings').textContent  = data.length;

            // Big Revenue Chart
            const labels = data.map(d => {
                const dt = new Date(d.date + 'T00:00:00');
                return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const values = data.map(d => parseFloat(d.revenue || 0));

            const ctx = document.getElementById('revenueBigChart').getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 360);
            gradient.addColorStop(0, 'rgba(212, 168, 83, 0.3)');
            gradient.addColorStop(1, 'rgba(212, 168, 83, 0)');

            if (revBigChart) revBigChart.destroy();
            revBigChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Revenue',
                        data: values,
                        borderColor: chartColors.gold,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: chartColors.gold,
                        pointBorderColor: chartColors.gold,
                        pointRadius: 2,
                        pointHoverRadius: 7,
                        borderWidth: 2.5
                    }]
                },
                options: chartOptions('$')
            });

            // Revenue table
            const tblBody = document.getElementById('revenueTableBody');
            tblBody.innerHTML = data.slice().reverse().map(d => `
                <tr>
                    <td>${formatDateTbl(d.date)}</td>
                    <td style="color:var(--gold);font-weight:600;">${window.formatCurrency(d.revenue || 0)}</td>
                </tr>
            `).join('');

        } catch (_) {
            showToast('Failed to load revenue data.', 'error');
        }

        // Revenue by type chart
        try {
            const res2 = await apiRequest('admin.php?action=revenue_by_type');
            const data2 = res2.success && res2.data ? res2.data : [];
            const labels = data2.map(d => d.room_type);
            const values = data2.map(d => parseFloat(d.revenue || 0));
            const colors = [chartColors.gold, chartColors.blue, chartColors.green, chartColors.purple, chartColors.orange];

            const ctx2 = document.getElementById('revenueByTypeChart').getContext('2d');
            if (revByTypeChart) revByTypeChart.destroy();
            revByTypeChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Revenue',
                        data: values,
                        backgroundColor: colors.slice(0, labels.length),
                        borderRadius: 6,
                        borderSkipped: false,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: tooltipConfig('$')
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: chartColors.text, font: { size: 11 } }
                        },
                        y: {
                            grid: { color: chartColors.grid },
                            ticks: {
                                color: chartColors.text,
                                callback: v => '$' + v.toLocaleString()
                            }
                        }
                    }
                }
            });
        } catch (_) {}

        lucide.createIcons();
    }

    // ═══════════════════════════════
    //  SHARED HELPERS
    // ═══════════════════════════════

    function formatDateTbl(str) {
        if (!str) return '—';
        const d = new Date(str + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function chartOptions(prefix = '') {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: tooltipConfig(prefix)
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: chartColors.text, maxRotation: 45, font: { size: 11 } }
                },
                y: {
                    grid: { color: chartColors.grid },
                    ticks: {
                        color: chartColors.text,
                        callback: v => prefix + v.toLocaleString()
                    }
                }
            }
        };
    }

    function tooltipConfig(prefix = '') {
        return {
            backgroundColor: chartColors.tooltipBg,
            borderColor: chartColors.gold,
            borderWidth: 1,
            titleColor: '#f5f0e8',
            bodyColor: chartColors.gold,
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
                label: ctx => prefix + parseFloat(ctx.parsed.y || ctx.parsed || 0).toLocaleString()
            }
        };
    }

    function renderPagination(containerId, current, total, onPage) {
        const container = document.getElementById(containerId);
        if (!container || total <= 1) { if (container) container.innerHTML = ''; return; }

        let html = `<button class="page-btn" ${current <= 1 ? 'disabled' : ''} data-page="${current - 1}"><i data-lucide="chevron-left"></i></button>`;
        for (let i = 1; i <= total; i++) {
            if (total > 7 && i > 2 && i < total - 1 && Math.abs(i - current) > 1) {
                if (i === 3 || i === total - 2) html += '<span class="page-info">…</span>';
                continue;
            }
            html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button class="page-btn" ${current >= total ? 'disabled' : ''} data-page="${current + 1}"><i data-lucide="chevron-right"></i></button>`;

        container.innerHTML = html;
        container.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (!isNaN(p) && p >= 1 && p <= total) onPage(p);
            });
        });
        lucide.createIcons();
    }

    // ═══════════════════════════════
    //  GLOBAL ACTION HANDLERS
    // ═══════════════════════════════

    window._updateResStatus = async function (select) {
        const id = select.dataset.resId;
        const status = select.value;
        try {
            const res = await apiRequest('admin.php?action=update_reservation', {
                method: 'POST',
                body: { reservation_id: id, status }
            });
            if (res.success) {
                showToast('Reservation status updated.', 'success');
                // Refresh the table that triggered it
                if (activePanel === 'overview') {
                    loadRecentReservations();
                } else {
                    loadReservations();
                }
            } else {
                showToast(res.message || 'Update failed.', 'error');
            }
        } catch (_) {
            showToast('Error updating status.', 'error');
        }
    };

    window._updateRoomStatus = async function (select) {
        const id = select.dataset.roomId;
        const status = select.value;
        try {
            const res = await apiRequest('admin.php?action=update_room_status', {
                method: 'POST',
                body: { room_id: id, status }
            });
            if (res.success) {
                showToast('Room status updated.', 'success');
                loadedPanels['rooms'] = false;
                loadRooms();
            } else {
                showToast(res.message || 'Update failed.', 'error');
            }
        } catch (_) {
            showToast('Error updating room status.', 'error');
        }
    };

    window._openEditPrice = function (typeId, typeName, currentPrice) {
        editRoomTypeId = typeId;
        document.getElementById('editRoomTypeName').textContent = typeName;
        document.getElementById('editCurrentPrice').textContent = window.formatCurrency(currentPrice);
        document.getElementById('newPriceInput').value = '';
        openModal('editPriceModal');
        lucide.createIcons();
    };

    async function savePrice() {
        const price = parseFloat(document.getElementById('newPriceInput').value);
        if (!price || price <= 0) {
            showToast('Please enter a valid price.', 'error');
            return;
        }
        try {
            const res = await apiRequest('admin.php?action=update_price', {
                method: 'POST',
                body: { room_type_id: editRoomTypeId, price }
            });
            if (res.success) {
                showToast('Price updated successfully.', 'success');
                closeModal('editPriceModal');
                loadedPanels['rooms'] = false;
                loadRooms();
            } else {
                showToast(res.message || 'Failed to update price.', 'error');
            }
        } catch (_) {
            showToast('Error updating price.', 'error');
        }
    }

    // ── Boot ──
    document.addEventListener('DOMContentLoaded', init);
})();
