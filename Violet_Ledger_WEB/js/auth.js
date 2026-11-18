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

  function logout(notice) {
    try {
      window.LedgerStorage.logActivity('Logged out');
      localStorage.removeItem(sessionKey);
      window.location.assign('account.html');
    } catch (_) {
      notice.textContent = 'We could not log out. Allow local storage in your browser and try again.';
    }
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
        try { sessionStorage.setItem('violet-ledger-login-event', email); } catch (_) { /* Login also works without tab storage. */ }
        window.location.assign('profile.html');
      } catch (_) {
        message.textContent = 'We could not open your local account. Allow local storage in your browser and try again.';
      }
    });
  }

  const dashboard = document.getElementById('account-dashboard');
  if (dashboard && window.LedgerStorage.isSignedIn) {
    try {
      const storage = window.LedgerStorage;
      const user = readUsers().find(account => normalizeEmail(account.email) === storage.owner);
      if (user) {
        document.getElementById('account-guest').hidden = true;
        dashboard.hidden = false;
        document.getElementById('account-title').textContent = 'Your account.';
        document.getElementById('account-intro-label').textContent = 'Your workspace';
        document.getElementById('account-intro-text').hidden = true;
        document.getElementById('account-welcome').textContent = 'Welcome back, ' + user.name + '.';
        document.getElementById('account-email').textContent = user.email;
        document.getElementById('account-logout').addEventListener('click', () => logout(document.getElementById('account-status')));

        function renderActivity() {
          const list = document.getElementById('account-activity');
          const saved = storage.read('violet-ledger-activity', []);
          const entries = Array.isArray(saved) ? saved.filter(entry => {
            return entry && typeof entry.message === 'string' && typeof entry.time === 'string' && Number.isFinite(Date.parse(entry.time));
          }).slice(0, 100) : [];
          list.replaceChildren();
          entries.forEach(entry => {
            const item = document.createElement('li');
            const message = document.createElement('p');
            message.textContent = entry.message;
            const time = document.createElement('time');
            time.dateTime = entry.time;
            time.textContent = new Date(entry.time).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
            item.append(message, time);
            list.append(item);
          });
          document.getElementById('account-activity-empty').hidden = entries.length > 0;
          list.hidden = entries.length === 0;
        }
        renderActivity();
        window.addEventListener('storage', event => {
          if (event.key === 'violet-ledger-activity:' + encodeURIComponent(storage.owner) || event.key === null) renderActivity();
        });
        window.addEventListener('focus', renderActivity);
        window.addEventListener('pageshow', renderActivity);
        document.addEventListener('ledger:activity', renderActivity);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) renderActivity(); });
      }
    } catch (_) {
      document.getElementById('signup-message').textContent = 'Your account could not be loaded. Check your browser storage settings.';
    }
  }

  const profile = document.getElementById('profile-details');
  if (profile) {
    const notice = document.getElementById('profile-notice');
    try {
      const email = window.LedgerStorage.owner;
      const user = readUsers().find(account => normalizeEmail(account.email) === email);
      if (user && window.LedgerStorage.isSignedIn) {
        document.getElementById('profile-guest').hidden = true;
        profile.hidden = false;
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-phone').textContent = user.phone;
        document.getElementById('profile-avatar').textContent = user.name.charAt(0).toUpperCase();
        const joined = new Date(user.createdAt);
        document.getElementById('profile-joined').textContent = Number.isNaN(joined.getTime()) ? 'Saved in this browser' : joined.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

        document.getElementById('logout-button').addEventListener('click', () => logout(notice));
      }
    } catch (_) {
      notice.textContent = 'Your local account could not be loaded. Check your browser storage settings.';
    }
  }

  // The storage helper selects this account's records, or the separate guest workspace.
  const browserSummary = document.getElementById('browser-summary');
  if (browserSummary) {
    try {
      const storage = window.LedgerStorage;
      const budget = storage.read('violet-ledger-budget', {});
      const expenses = storage.read('violet-ledger-expenses', []);
      const incomeText = String(budget?.total_sum ?? '').trim();
      const income = Number(incomeText.replace(/,/g, ''));
      document.getElementById('workspace-title').textContent = storage.isSignedIn ? 'Your account workspace' : 'Guest workspace';
      document.getElementById('workspace-note').textContent = storage.isSignedIn
        ? 'These records belong to your account in this browser. They stay saved when you log out.'
        : 'These are your guest records in this browser. Log in to use a separate account workspace.';
      document.getElementById('profile-income').textContent = incomeText && Number.isFinite(income) && income >= 0 ? money(income) : 'No budget yet';
      document.getElementById('profile-expense-count').textContent = Array.isArray(expenses) ? String(expenses.filter(entry => entry && typeof entry.item === 'string' && Number(entry.amount) > 0).length) : '0';
    } catch (_) {
      document.getElementById('profile-income').textContent = 'Unavailable';
      document.getElementById('profile-expense-count').textContent = 'Unavailable';
    }
  }
})();
