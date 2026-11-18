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

  window.LedgerStorage = { owner, isSignedIn: owner !== '', read, write };

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
  window.addEventListener('pageshow', sameOwner);
  window.addEventListener('focus', sameOwner);

  function guardOldPage(event) {
    if (sameOwner()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  for (const event of ['click', 'input', 'submit']) {
    document.addEventListener(event, guardOldPage, true);
  }
})();
