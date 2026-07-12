/* ============================================================
   LUXESTAY — Authentication Page Logic
   Login / Register Forms, Validation, Redirects
   ============================================================ */

(function () {
  'use strict';

  // ── Tab Switching ─────────────────────────────────────────
  function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    const indicator = document.querySelector('.auth-tab-indicator');
    if (!tabs.length || !indicator) return;

    function activateTab(index) {
      tabs.forEach((t, i) => {
        t.classList.toggle('active', i === index);
      });
      forms.forEach((f, i) => {
        f.classList.toggle('active', i === index);
      });

      // Slide the indicator
      const activeTab = tabs[index];
      indicator.style.width = activeTab.offsetWidth + 'px';
      indicator.style.left = activeTab.offsetLeft + 'px';
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(index));
    });

    // Set initial position
    activateTab(0);

    // Recalculate on resize
    window.addEventListener('resize', () => {
      const activeIndex = [...tabs].findIndex((t) => t.classList.contains('active'));
      activateTab(activeIndex >= 0 ? activeIndex : 0);
    });
  }

  // ── Field Validation Helper ───────────────────────────────
  function setFieldError(input, message) {
    const group = input.closest('.form-group');
    if (!group) return;
    group.classList.add('has-error');
    let errorEl = group.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      group.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  function clearFieldError(input) {
    const group = input.closest('.form-group');
    if (!group) return;
    group.classList.remove('has-error');
    const errorEl = group.querySelector('.form-error');
    if (errorEl) errorEl.style.display = 'none';
  }

  function clearAllErrors(form) {
    form.querySelectorAll('.form-group').forEach((g) => {
      g.classList.remove('has-error');
      const err = g.querySelector('.form-error');
      if (err) err.style.display = 'none';
    });
  }

  // ── Login Form Handler ────────────────────────────────────
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors(form);

      const email = form.querySelector('[name="email"]');
      const password = form.querySelector('[name="password"]');
      let valid = true;

      if (!email.value.trim()) {
        setFieldError(email, 'Email is required');
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        setFieldError(email, 'Please enter a valid email');
        valid = false;
      }

      if (!password.value) {
        setFieldError(password, 'Password is required');
        valid = false;
      }

      if (!valid) return;

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span> Signing In...';

      try {
        const data = await apiRequest('auth.php?action=login', {
          method: 'POST',
          body: {
            email: email.value.trim(),
            password: password.value,
          },
        });

        if (data.success) {
          showToast('Welcome back, ' + (data.user?.full_name || 'Guest') + '!', 'success');

          setTimeout(() => {
            if (data.user?.role === 'admin') {
              window.location.href = 'admin.html';
            } else {
              window.location.href = 'dashboard.html';
            }
          }, 1000);
        } else {
          showToast(data.message || 'Invalid credentials', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Login failed. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  // ── Register Form Handler ─────────────────────────────────
  function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors(form);

      const fullName = form.querySelector('[name="full_name"]');
      const email = form.querySelector('[name="email"]');
      const phone = form.querySelector('[name="phone"]');
      const password = form.querySelector('[name="password"]');
      const confirmPassword = form.querySelector('[name="confirm_password"]');
      let valid = true;

      if (!fullName.value.trim()) {
        setFieldError(fullName, 'Full name is required');
        valid = false;
      }

      if (!email.value.trim()) {
        setFieldError(email, 'Email is required');
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        setFieldError(email, 'Please enter a valid email');
        valid = false;
      }

      if (!phone.value.trim()) {
        setFieldError(phone, 'Phone number is required');
        valid = false;
      }

      if (!password.value) {
        setFieldError(password, 'Password is required');
        valid = false;
      } else if (password.value.length < 6) {
        setFieldError(password, 'Password must be at least 6 characters');
        valid = false;
      }

      if (password.value !== confirmPassword.value) {
        setFieldError(confirmPassword, 'Passwords do not match');
        valid = false;
      }

      if (!valid) return;

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span> Creating Account...';

      try {
        const data = await apiRequest('auth.php?action=register', {
          method: 'POST',
          body: {
            full_name: fullName.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            password: password.value,
          },
        });

        if (data.success) {
          showToast('Account created successfully! Please sign in.', 'success');
          form.reset();
          // Switch to login tab
          const loginTab = document.querySelector('.auth-tab');
          if (loginTab) loginTab.click();
        } else {
          showToast(data.message || 'Registration failed', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Registration failed. Please try again.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  // ── Password Visibility Toggle ────────────────────────────
  function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const input = toggle.closest('.input-icon-wrapper')?.querySelector('input')
                   || toggle.previousElementSibling;
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        // Swap icon
        const icon = toggle.querySelector('i') || toggle;
        if (icon.dataset) {
          icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }
      });
    });
  }

  // ── Input Focus Animations ────────────────────────────────
  function initInputAnimations() {
    document.querySelectorAll('.auth-form input').forEach((input) => {
      input.addEventListener('focus', () => {
        const group = input.closest('.form-group');
        if (group) group.classList.add('focused');
      });

      input.addEventListener('blur', () => {
        const group = input.closest('.form-group');
        if (group) group.classList.remove('focused');
      });

      // Clear error on type
      input.addEventListener('input', () => clearFieldError(input));
    });
  }

  // ── Redirect If Already Logged In ─────────────────────────
  async function checkRedirect() {
    try {
      const user = await checkAuth();
      if (user) {
        if (user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }
    } catch (e) {
      // Not logged in — stay on this page
    }
  }

  // ── Initialize ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initAuthTabs();
    initLoginForm();
    initRegisterForm();
    initPasswordToggles();
    initInputAnimations();
    checkRedirect();
  });
})();
