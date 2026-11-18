// Classroom-only authentication simulation. There is no server or secure account storage.
(() => {
  'use strict';

  const usersKey = 'violet-ledger-users';
  const sessionKey = 'violet-ledger-session';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/;
  const passwordHelp = 'Use at least 8 characters with uppercase, lowercase, a number and a symbol.';
  const normalizeEmail = value => value.trim().toLowerCase();
  const money = value => '₸' + Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });

  function readUsers() {
    const saved = JSON.parse(localStorage.getItem(usersKey) || '[]');
    if (!Array.isArray(saved)) throw new Error('Invalid account data');
    return saved.filter(user => user && ['name', 'email', 'phone', 'password'].every(key => typeof user[key] === 'string'));
  }

  function setError(input, message) {
    const error = document.getElementById(input.id + '-error');
    if (error) error.textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  }

  function validate(form) {
    let valid = true;
    form.querySelectorAll('input').forEach(input => {
      const value = input.type === 'password' ? input.value : input.value.trim();
      let error = '';
      if (!value) error = 'Please enter ' + input.dataset.label + '.';
      else if (input.dataset.validate === 'name' && (value.length < 2 || value.length > 60)) error = 'Please use a name between 2 and 60 characters.';
      else if (input.dataset.validate === 'email' && (!emailPattern.test(value) || value.length > 254)) error = 'Enter an email address such as name@example.com.';
      else if (input.dataset.validate === 'phone' && !/^\+?\d{10,15}$/.test(value.replace(/[\s()-]/g, ''))) error = 'Enter 10–15 digits, with an optional country code, such as +7 701 234 5678.';
      else if (input.dataset.validate === 'password' && !passwordPattern.test(value)) error = passwordHelp;
      else if (input.dataset.validate === 'confirm' && value !== document.getElementById('signup-password').value) error = 'The passwords do not match. Please try again.';
      if (!setError(input, error)) valid = false;
    });
    if (!valid) form.querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  }

  const signup = document.getElementById('signup-form');
  const login = document.getElementById('login-form');
  if (signup && login) {
    document.querySelectorAll('[data-account-panel]').forEach(button => {
      button.addEventListener('click', () => showPanel(button.dataset.accountPanel));
    });

    function showPanel(panel) {
      const isSignup = panel === 'signup';
      document.getElementById('signup-panel').hidden = !isSignup;
      document.getElementById('login-panel').hidden = isSignup;
      document.querySelectorAll('[data-account-panel]').forEach(button => {
        const active = button.dataset.accountPanel === panel;
        button.setAttribute('aria-pressed', String(active));
      });
    }

    [signup, login].forEach(form => {
      form.addEventListener('input', event => {
        if (event.target instanceof HTMLInputElement) setError(event.target, '');
        document.getElementById(form.id === 'signup-form' ? 'signup-message' : 'login-message').textContent = '';
      });
    });

    signup.addEventListener('submit', event => {
      event.preventDefault();
      const message = document.getElementById('signup-message');
      message.textContent = '';
      if (!validate(signup)) return;

      const email = normalizeEmail(document.getElementById('signup-email').value);
      try {
        const users = readUsers();
        if (users.some(user => normalizeEmail(user.email) === email)) {
          setError(document.getElementById('signup-email'), 'This email already has a local account. Choose Log in.');
          document.getElementById('signup-email').focus();
          return;
        }
        users.push({
          name: document.getElementById('signup-name').value.trim(),
          email,
          phone: document.getElementById('signup-phone').value.trim(),
          password: document.getElementById('signup-password').value,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem(usersKey, JSON.stringify(users));
        signup.reset();
        document.getElementById('login-email').value = email;
        document.getElementById('login-message').textContent = 'Your demo account is ready. Enter your password to log in.';
        showPanel('login');
        document.getElementById('login-password').focus();
      } catch (_) {
        message.textContent = 'We could not save this account. Allow local storage in your browser and try again.';
      }
    });

    login.addEventListener('submit', event => {
      event.preventDefault();
      const message = document.getElementById('login-message');
      message.textContent = '';
      if (!validate(login)) return;
      const email = normalizeEmail(document.getElementById('login-email').value);
      const password = document.getElementById('login-password').value;
      try {
        const user = readUsers().find(account => normalizeEmail(account.email) === email && account.password === password);
        if (!user) {
          message.textContent = 'The email or password does not match. Check your details or sign up first.';
          return;
        }
        localStorage.setItem(sessionKey, email);
        window.location.assign('profile.html');
      } catch (_) {
        message.textContent = 'We could not open your local account. Allow local storage in your browser and try again.';
      }
    });
  }

  const profile = document.getElementById('profile-details');
  if (profile) {
    const notice = document.getElementById('profile-notice');
    try {
      const email = localStorage.getItem(sessionKey);
      const user = readUsers().find(account => normalizeEmail(account.email) === email);
      if (user) {
        document.getElementById('profile-guest').hidden = true;
        profile.hidden = false;
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-phone').textContent = user.phone;
        document.getElementById('profile-avatar').textContent = user.name.charAt(0).toUpperCase();
        const joined = new Date(user.createdAt);
        document.getElementById('profile-joined').textContent = Number.isNaN(joined.getTime()) ? 'Saved in this browser' : joined.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

        document.getElementById('logout-button').addEventListener('click', () => {
          try {
            localStorage.removeItem(sessionKey);
            profile.hidden = true;
            document.getElementById('profile-guest').hidden = false;
            notice.textContent = 'You are logged out. Your demo account is still saved in this browser.';
            document.getElementById('profile-login-link').focus();
          } catch (_) {
            notice.textContent = 'We could not log out. Allow local storage in your browser and try again.';
          }
        });
      }
    } catch (_) {
      notice.textContent = 'Your local account could not be loaded. Check your browser storage settings.';
    }
  }

  // Budget records belong to this browser, independently of the classroom demo account.
  const browserSummary = document.getElementById('browser-summary');
  if (browserSummary) {
    try {
      const budget = JSON.parse(localStorage.getItem('violet-ledger-budget') || '{}');
      const expenses = JSON.parse(localStorage.getItem('violet-ledger-expenses') || '[]');
      const income = Number(budget?.total_sum);
      document.getElementById('profile-income').textContent = budget?.total_sum !== undefined && Number.isFinite(income) && income >= 0 ? money(income) : 'No budget yet';
      document.getElementById('profile-expense-count').textContent = Array.isArray(expenses) ? String(expenses.filter(entry => entry && typeof entry.item === 'string' && Number(entry.amount) > 0).length) : '0';
    } catch (_) {
      document.getElementById('profile-income').textContent = 'Unavailable';
      document.getElementById('profile-expense-count').textContent = 'Unavailable';
    }
  }
})();
