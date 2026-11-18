/* Financial records belong to one account, or to the separate guest workspace. */
(() => {
  'use strict';

  const sessionKey = 'violet-ledger-session';
  const usersKey = 'violet-ledger-users';

  function currentOwner() {
    try {
      const email = (localStorage.getItem(sessionKey) || '').trim().toLowerCase();
      const users = JSON.parse(localStorage.getItem(usersKey) || '[]');
      if (!email || !Array.isArray(users)) return '';
      const exists = users.some(user => user && typeof user.email === 'string' && user.email.trim().toLowerCase() === email);
      return exists ? email : '';
    } catch (_) {
      return '';
    }
  }

  // Keep this page bound to its original account until it reloads.
  const owner = currentOwner();

  function sameOwner() {
    if (currentOwner() === owner) return true;
    window.location.reload();
    return false;
  }

  function key(base) {
    return owner ? base + ':' + encodeURIComponent(owner) : base;
  }

  function read(base, fallback = null) {
    if (!sameOwner()) return fallback;
    try {
      return JSON.parse(localStorage.getItem(key(base))) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function write(base, value) {
    if (!sameOwner()) return false;
    try {
      localStorage.setItem(key(base), JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function logActivity(message) {
    if (!owner || typeof message !== 'string' || !message.trim() || !sameOwner()) return false;
    const saved = read('violet-ledger-activity', []);
    const history = Array.isArray(saved) ? saved.filter(entry =>
      entry && typeof entry.message === 'string' && typeof entry.time === 'string' && Number.isFinite(Date.parse(entry.time))
    ).slice(0, 99) : [];
    history.unshift({ message: message.trim().slice(0, 250), time: new Date().toISOString() });
    if (!write('violet-ledger-activity', history)) return false;
    document.dispatchEvent(new Event('ledger:activity'));
    return true;
  }

  window.LedgerStorage = { owner, isSignedIn: owner !== '', read, write, logActivity };

  const note = document.querySelector('.demo-note');
  if (note && ['budget', 'expenses', 'bills', 'savings'].includes(document.body.dataset.page)) {
    note.textContent = owner
      ? 'Your records are saved for ' + owner + ' in this browser.'
      : 'You are using the guest workspace. Log in to start your own plan.';
  }

  // Refresh an old tab or a restored Back/Forward page when the account changes.
  window.addEventListener('storage', event => {
    if (event.key === sessionKey || event.key === usersKey || event.key === null) sameOwner();
  });
  window.addEventListener('pageshow', event => {
    if (sameOwner() && event.persisted) logPageVisit();
  });
  window.addEventListener('focus', sameOwner);

  function guardOldPage(event) {
    if (sameOwner()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  for (const event of ['click', 'input', 'submit']) {
    document.addEventListener(event, guardOldPage, true);
  }

  function logPageVisit() {
    const pages = {
      budget: 'Monthly budget', expenses: 'Daily expenses', bills: 'Bills and debt',
      savings: 'Savings goals', account: 'Account', profile: 'Profile'
    };
    const page = pages[document.body.dataset.page];
    if (page) logActivity('Opened ' + page + '.');
  }

  // The login page leaves a one-time marker for the newly signed-in page.
  if (owner) {
    try {
      const pendingLogin = sessionStorage.getItem('violet-ledger-login-event');
      if (pendingLogin) {
        sessionStorage.removeItem('violet-ledger-login-event');
        if (pendingLogin === owner) logActivity('Logged in.');
      }
    } catch (_) { /* Page visits still work if session storage is blocked. */ }
    logPageVisit();
  }
})();
