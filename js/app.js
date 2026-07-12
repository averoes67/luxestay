/* ============================================================
   LUXESTAY — Global Application JavaScript
   Navigation, Animations, Toasts, Modals, API Helper, Auth
   ============================================================ */

(function () {
  'use strict';

  // ── Base API URL ──────────────────────────────────────────
  const API_BASE = '/api/';

  // ── Global Currency Formatter (IDR) ───────────────────────
  window.formatCurrency = function(amount) {
    const rate = 16000;
    const converted = Number(amount) * rate;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(converted);
  };

  // ── Navigation Scroll Effect ──────────────────────────────
  function initNavScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const onScroll = () => {
      if (window.scrollY > 50) {
        navbar.classList.add('nav-scrolled');
      } else {
        navbar.classList.remove('nav-scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // check initial state
  }

  // ── Mobile Menu Toggle ────────────────────────────────────
  function initMobileMenu() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    const actions = document.querySelector('.nav-actions');
    const navGuest = document.querySelector('.nav-auth-guest');
    const navUser = document.querySelector('.nav-auth-user');
    const navAuth = document.querySelector('.nav-auth');

    if (toggle) {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        links?.classList.toggle('mobile-open');
        actions?.classList.toggle('mobile-open');
        navGuest?.classList.toggle('mobile-open');
        navUser?.classList.toggle('mobile-open');
        navAuth?.classList.toggle('mobile-open');
        document.body.style.overflow = toggle.classList.contains('active') ? 'hidden' : '';
      });

      // Close mobile menu when a link is clicked
      links?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          toggle.classList.remove('active');
          links.classList.remove('mobile-open');
          actions?.classList.remove('mobile-open');
          navGuest?.classList.remove('mobile-open');
          navUser?.classList.remove('mobile-open');
          navAuth?.classList.remove('mobile-open');
          document.body.style.overflow = '';
        });
      });
    }
  }

  // ── Lucide Icons ──────────────────────────────────────────
  function initIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // ── Scroll-Triggered Animations ───────────────────────────
  function initScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
  }

  // ── Animated Counters (Stats Section) ─────────────────────
  function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const animateCounter = (el) => {
      const target = parseFloat(el.getAttribute('data-counter'));
      const suffix = el.getAttribute('data-suffix') || '';
      const prefix = el.getAttribute('data-prefix') || '';
      const decimals = target % 1 !== 0 ? 1 : 0;
      const duration = 2000;
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = (eased * target).toFixed(decimals);
        el.textContent = prefix + current + suffix;

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  // ── Toast Notification System ─────────────────────────────
  function getToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const iconMap = {
    success: 'check-circle',
    error: 'x-circle',
    info: 'info',
    warning: 'alert-triangle',
  };

  window.showToast = function (message, type = 'info', duration = 3500) {
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i data-lucide="${iconMap[type] || 'info'}" class="toast-icon"></i>
      <span class="toast-message">${message}</span>
      <i data-lucide="x" class="toast-close" onclick="this.closest('.toast').remove()"></i>
    `;

    container.appendChild(toast);
    initIcons();

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.add('toast-removing');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  };

  // ── Modal System ──────────────────────────────────────────
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  function initModals() {
    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach((overlay) => {
          overlay.classList.remove('active');
        });
        document.body.style.overflow = '';
      }
    });

    // Close buttons
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', () => {
        const overlay = btn.closest('.modal-overlay');
        if (overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  }

  // ── API Request Helper ────────────────────────────────────
  window.apiRequest = async function (endpoint, options = {}) {
    const url = API_BASE + endpoint;
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
      credentials: 'same-origin',
      cache: 'no-store',
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  // ── Auth State Checker ────────────────────────────────────
    window.checkAuth = async function () {
      try {
        const data = await apiRequest('auth.php?action=check');
        if ((data.loggedIn || data.authenticated) && data.user) {
          updateNavForAuth(data.user);
          return data.user;
        }
      } catch (e) {
        // Not logged in — that's fine
      }
      document.body.classList.add('logged-out');
      document.body.classList.remove('logged-in');
      return null;
    };

    function updateNavForAuth(user) {
      document.body.classList.add('logged-in');
      document.body.classList.remove('logged-out');
      
      const loginBtns = document.querySelectorAll('.nav-auth-guest');
    const userBtns = document.querySelectorAll('.nav-auth-user');
    const userNameEls = document.querySelectorAll('.nav-user-name');

    loginBtns.forEach((el) => (el.style.display = 'none'));
    userBtns.forEach((el) => (el.style.display = 'flex'));
    userNameEls.forEach((el) => (el.textContent = user.full_name || user.email));
  }

  window.updateNavForAuth = updateNavForAuth;

  // ── Logout Handler ────────────────────────────────────────
  function initLogout() {
    document.querySelectorAll('.btn-logout').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await apiRequest('auth.php?action=logout', { method: 'POST' });
          showToast('Logged out successfully', 'success');
          setTimeout(() => (window.location.href = 'index.html'), 800);
        } catch (err) {
          showToast('Logout failed', 'error');
        }
      });
    });
  }

  // ── Smooth Scroll for Anchor Links ────────────────────────
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ── Active Nav Link ───────────────────────────────────────
  function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  // ── Initialize Everything ─────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initNavScroll();
    initMobileMenu();
    initIcons();
    initScrollAnimations();
    initCounters();
    initModals();
    initSmoothScroll();
    initLogout();
    setActiveNavLink();
    checkAuth();
  });
})();
