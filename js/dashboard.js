/* ============================================================
   LUXESTAY — Guest Dashboard JavaScript
   Reservation management, tab filtering, cancel flow
   ============================================================ */

(function () {
  'use strict';

  let allReservations = [];
  let currentUser = null;
  let currentTab = 'all';

  // ── Initialization ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    await initDashboard();
    initTabs();
    initCancelFlow();
  });

  async function initDashboard() {
    try {
      const user = await checkAuth();

      if (!user) {
        window.location.href = 'login.html';
        return;
      }

      // If admin, redirect to admin dashboard
      if (user.role === 'admin') {
        window.location.href = 'admin.html';
        return;
      }

      currentUser = user;

      // Update welcome banner
      const nameEl = document.getElementById('userName');
      if (nameEl) {
        nameEl.textContent = user.full_name || user.email;
      }

      // Update nav auth state
      const navAuth = document.getElementById('navAuth');
      if (navAuth) {
        navAuth.innerHTML = `
          <span style="color:var(--text-secondary);font-size:0.9rem;display:flex;align-items:center;gap:6px;">
            <i data-lucide="user" style="width:16px;height:16px;color:var(--gold)"></i>
            ${user.full_name || user.email}
          </span>
          <button class="btn btn-ghost btn-logout" onclick="handleLogout()">
            <i data-lucide="log-out" style="width:16px;height:16px;"></i> Logout
          </button>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }

      // Load reservations
      await loadReservations();
    } catch (err) {
      console.error('Dashboard init error:', err);
      showToast('Failed to load dashboard', 'error');
    }
  }

  // ── Load Reservations ──────────────────────────────────
  async function loadReservations() {
    const list = document.getElementById('reservationsList');
    const loading = document.getElementById('dashLoading');

    try {
      const response = await apiRequest('reservations.php?action=user');

      if (response.success) {
        allReservations = response.data || [];
      } else {
        allReservations = [];
      }
    } catch (err) {
      console.error('Failed to load reservations:', err);
      allReservations = [];
      showToast('Failed to load reservations', 'error');
    }

    // Hide loading
    if (loading) loading.style.display = 'none';

    // Update stats
    updateStats();

    // Update tab counts
    updateTabCounts();

    // Render current tab
    renderReservations();
  }

  // ── Update Stats ───────────────────────────────────────
  function updateStats() {
    const today = new Date().toISOString().split('T')[0];

    const totalStays = allReservations.filter(r => r.status !== 'cancelled').length;
    const upcomingStays = allReservations.filter(r =>
      r.check_in > today && ['pending', 'confirmed'].includes(r.status)
    ).length;
    const totalSpent = allReservations
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => sum + parseFloat(r.total_price || 0), 0);

    const totalEl = document.getElementById('totalStays');
    const upcomingEl = document.getElementById('upcomingStays');
    const spentEl = document.getElementById('totalSpent');

    if (totalEl) animateValue(totalEl, 0, totalStays, 800);
    if (upcomingEl) animateValue(upcomingEl, 0, upcomingStays, 800);
    if (spentEl) animateValue(spentEl, 0, totalSpent, 1000, '$');
  }

  function animateValue(el, start, end, duration, prefix = '') {
    const startTime = performance.now();
    const isDecimal = end % 1 !== 0;

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      if (prefix === '$') {
        el.textContent = '$' + Math.round(current).toLocaleString();
      } else {
        el.textContent = Math.round(current);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // ── Tabs ───────────────────────────────────────────────
  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.getAttribute('data-tab');
        renderReservations();
      });
    });
  }

  function updateTabCounts() {
    const today = new Date().toISOString().split('T')[0];

    const all = allReservations.length;
    const upcoming = allReservations.filter(r =>
      r.check_in > today && ['pending', 'confirmed'].includes(r.status)
    ).length;
    const completed = allReservations.filter(r =>
      ['checked_out'].includes(r.status)
    ).length;
    const cancelled = allReservations.filter(r =>
      r.status === 'cancelled'
    ).length;

    setCount('countAll', all);
    setCount('countUpcoming', upcoming);
    setCount('countCompleted', completed);
    setCount('countCancelled', cancelled);
  }

  function setCount(id, count) {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  }

  // ── Filter Reservations ────────────────────────────────
  function getFilteredReservations() {
    const today = new Date().toISOString().split('T')[0];

    switch (currentTab) {
      case 'upcoming':
        return allReservations.filter(r =>
          r.check_in > today && ['pending', 'confirmed'].includes(r.status)
        );
      case 'completed':
        return allReservations.filter(r =>
          ['checked_out'].includes(r.status)
        );
      case 'cancelled':
        return allReservations.filter(r => r.status === 'cancelled');
      default:
        return allReservations;
    }
  }

  // ── Render Reservations ────────────────────────────────
  function renderReservations() {
    const list = document.getElementById('reservationsList');
    const emptyState = document.getElementById('emptyState');
    const filtered = getFilteredReservations();

    if (filtered.length === 0) {
      list.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    list.innerHTML = filtered.map((res, i) => {
      const canCancel = ['pending', 'confirmed'].includes(res.status);
      const statusClass = res.status.replace('_', '-');

      return `
        <div class="reservation-card" style="animation: fadeInUp 0.4s ease ${i * 0.05}s both;">
          <div class="res-room">
            <h3>${escapeHtml(res.room_type_name || res.room_type || 'Room')}</h3>
            <span class="room-number">Room ${escapeHtml(res.room_number || 'N/A')}</span>
          </div>
          <div class="res-dates">
            <div>
              <div class="date-label">Check-in</div>
              <div class="date-value">${formatDate(res.check_in)}</div>
            </div>
            <div style="margin-top:8px;">
              <div class="date-label">Check-out</div>
              <div class="date-value">${formatDate(res.check_out)}</div>
            </div>
          </div>
          <div class="res-guests">
            <i data-lucide="users"></i>
            ${res.guests_count || 1} Guest${(res.guests_count || 1) > 1 ? 's' : ''}
          </div>
          <div class="res-price">$${parseFloat(res.total_price || 0).toLocaleString()}</div>
          <div class="res-actions">
            <span class="status-badge ${statusClass}">${formatStatus(res.status)}</span>
            ${canCancel ? `<button class="cancel-btn" onclick="openCancelModal(${res.id})">
              <i data-lucide="x" style="width:12px;height:12px;"></i> Cancel
            </button>` : ''}
            ${['confirmed', 'checked_out'].includes(res.status) ? `<button class="cancel-btn" style="color:var(--gold);border-color:var(--gold);background:transparent;" onclick="openReviewModal(${res.room_type_id || (res.room_type_name ? 1 : 1)})">
              <i data-lucide="star" style="width:12px;height:12px;"></i> Review
            </button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Re-initialize icons for dynamically created elements
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // ── Cancel Flow ────────────────────────────────────────
  let cancelReservationId = null;

  window.openCancelModal = function (id) {
    cancelReservationId = id;
    const res = allReservations.find(r => r.id === id);
    if (!res) return;

    const details = document.getElementById('cancelDetails');
    if (details) {
      details.innerHTML = `
        <div class="detail-row">
          <span class="detail-label">Room</span>
          <span class="detail-value">${escapeHtml(res.room_type_name || res.room_type || 'Room')} — ${escapeHtml(res.room_number || 'N/A')}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Check-in</span>
          <span class="detail-value">${formatDate(res.check_in)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Check-out</span>
          <span class="detail-value">${formatDate(res.check_out)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total</span>
          <span class="detail-value" style="color:var(--gold);">$${parseFloat(res.total_price || 0).toLocaleString()}</span>
        </div>
      `;
    }

    openModal('cancelModal');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  };

  function initCancelFlow() {
    const confirmBtn = document.getElementById('confirmCancelBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        if (!cancelReservationId) return;

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Cancelling...';

        try {
          const response = await apiRequest('reservations.php?action=cancel', {
            method: 'POST',
            body: { reservation_id: cancelReservationId }
          });

          if (response.success) {
            showToast('Reservation cancelled successfully', 'success');
            closeModal('cancelModal');
            await loadReservations();
          } else {
            showToast(response.message || 'Failed to cancel reservation', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('An error occurred. Please try again.', 'error');
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Cancel Reservation';
          cancelReservationId = null;
        }
      });
    }

    // Review flow initialization
    const reviewStars = document.getElementById('reviewStarsInput');
    const ratingInput = document.getElementById('reviewRating');
    if (reviewStars) {
      reviewStars.addEventListener('click', (e) => {
        const star = e.target.closest('svg') || e.target.closest('i');
        if (!star) return;
        
        const children = Array.from(reviewStars.querySelectorAll('svg, i'));
        const index = children.indexOf(star);
        if (index === -1) return;

        const val = index + 1;
        ratingInput.value = val;
        
        // Re-color all children
        children.forEach((s, idx) => {
          if (idx < val) {
            s.classList.add('star-filled');
            s.style.color = 'var(--gold)';
            // Also color the paths inside the svg
            s.querySelectorAll('path').forEach(p => {
              p.style.fill = 'var(--gold)';
            });
          } else {
            s.classList.remove('star-filled');
            s.style.color = 'var(--text-muted)';
            s.querySelectorAll('path').forEach(p => {
              p.style.fill = 'none'; // Unfill
            });
          }
        });
      });
    }

    const submitReviewBtn = document.getElementById('submitReviewBtn');
    if (submitReviewBtn) {
      submitReviewBtn.addEventListener('click', async () => {
        const roomTypeId = document.getElementById('reviewRoomTypeId').value;
        const rating = document.getElementById('reviewRating').value;
        const comment = document.getElementById('reviewComment').value;

        if (!rating || rating === '0') {
          showToast('Please select a rating.', 'error');
          return;
        }

        submitReviewBtn.disabled = true;
        submitReviewBtn.textContent = 'Submitting...';

        try {
          const response = await apiRequest('reviews.php?action=create', {
            method: 'POST',
            body: { room_type_id: roomTypeId, rating, comment }
          });

          if (response.success) {
            showToast('Review submitted successfully!', 'success');
            closeModal('reviewModal');
            // reset form
            document.getElementById('reviewRating').value = '0';
            document.getElementById('reviewComment').value = '';
            document.querySelectorAll('#reviewStarsInput i').forEach(s => {
              s.classList.remove('star-filled');
              s.style.color = 'var(--text-muted)';
            });
          } else {
            showToast(response.error || 'Failed to submit review', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast(err.message || 'An error occurred. Please try again.', 'error');
        } finally {
          submitReviewBtn.disabled = false;
          submitReviewBtn.textContent = 'Submit Review';
        }
      });
    }
  }

  window.openReviewModal = function(roomTypeId) {
    document.getElementById('reviewRoomTypeId').value = roomTypeId || 1;
    openModal('reviewModal');
  };

  // ── Logout ─────────────────────────────────────────────
  window.handleLogout = async function () {
    try {
      await apiRequest('auth.php?action=logout', { method: 'POST' });
      showToast('Logged out successfully', 'success');
      setTimeout(() => window.location.href = 'index.html', 800);
    } catch (err) {
      showToast('Logout failed', 'error');
    }
  };

  // ── Helpers ────────────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatStatus(status) {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
