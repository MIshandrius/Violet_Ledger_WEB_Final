/* Daily exchange rates for a quick budget estimate. No API key is needed. */
(function () {
  'use strict';

  const form = document.getElementById('currency-form');
  if (!form) return;

  const amount = document.getElementById('currency-amount');
  const from = document.getElementById('currency-from');
  const to = document.getElementById('currency-to');
  const error = document.getElementById('currency-amount-error');
  const result = document.getElementById('currency-result');
  const rateNote = document.getElementById('currency-rate-note');
  const status = document.getElementById('currency-status');
  const refresh = document.getElementById('currency-refresh');
  const cacheKey = 'violet-ledger-currency-rates';
  const currencies = ['KZT', 'USD', 'EUR', 'GBP'];
  const cacheLifetime = 24 * 60 * 60 * 1000;
  let rateData = null;

  function validRates(data) {
    if (!data || data.result !== 'success' || data.base_code !== 'KZT' || !data.rates) return false;
    if (!Number.isFinite(data.time_last_update_unix) || data.time_last_update_unix <= 0) return false;
    for (const code of currencies) {
      if (!Number.isFinite(data.rates[code]) || data.rates[code] <= 0) return false;
    }
    return true;
  }

  function rateDate() {
    return new Date(rateData.time_last_update_unix * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
    });
  }

  function formatMoney(value, code) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: code, maximumFractionDigits: 2
    }).format(value);
  }

  function convert() {
    const value = Number(amount.value);
    error.textContent = '';
    rateNote.textContent = '';
    amount.setAttribute('aria-invalid', 'false');

    if (!Number.isFinite(value) || value <= 0) {
      error.textContent = 'Enter an amount greater than zero.';
      amount.setAttribute('aria-invalid', 'true');
      result.textContent = 'Enter a valid amount to see your estimate.';
      return false;
    }
    if (!currencies.includes(from.value) || !currencies.includes(to.value)) {
      result.textContent = 'Choose one of the listed currencies.';
      return true;
    }
    if (!rateData) {
      result.textContent = 'Loading rates…';
      if (!refresh.disabled) {
        result.textContent = 'Conversion unavailable.';
        rateNote.textContent = 'Choose Refresh rates to try again.';
      }
      return true;
    }

    // All rates share a KZT base, so dividing also supports USD → KZT, etc.
    const exchangeRate = rateData.rates[to.value] / rateData.rates[from.value];
    const converted = value * exchangeRate;
    if (!Number.isFinite(converted)) {
      error.textContent = 'This amount is too large. Please enter a smaller amount.';
      amount.setAttribute('aria-invalid', 'true');
      result.textContent = 'Enter a smaller amount to see your estimate.';
      return false;
    }
    result.textContent = formatMoney(value, from.value) + ' ≈ ' + formatMoney(converted, to.value);
    rateNote.textContent = '1 ' + from.value + ' ≈ ' +
      new Intl.NumberFormat('en-US', { maximumSignificantDigits: 6 }).format(exchangeRate) + ' ' + to.value;
    return true;
  }

  function readCache() {
    try {
      const saved = JSON.parse(localStorage.getItem(cacheKey));
      if (saved && validRates(saved.data) && Number.isFinite(saved.savedAt)) return saved;
    } catch (_) {}
    return null;
  }

  async function loadRates() {
    if (refresh.disabled) return;
    refresh.disabled = true;
    refresh.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading daily exchange rates…';
    convert();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/KZT', { signal: controller.signal });
      if (!response.ok) throw new Error('Exchange rate request failed.');
      const received = await response.json();
      if (!validRates(received)) throw new Error('Exchange rate response was incomplete.');
      rateData = received;
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: rateData, savedAt: Date.now() }));
      } catch (_) {}
      status.textContent = 'Daily rates updated ' + rateDate() + ' (UTC).';
    } catch (_) {
      status.textContent = 'Rates could not load. Check your connection and choose Refresh rates to try again.';
      if (rateData) {
        status.textContent = 'Could not refresh. Showing saved rates updated ' + rateDate() + ' (UTC). Try again when online.';
      }
    } finally {
      window.clearTimeout(timeout);
      refresh.disabled = false;
      refresh.removeAttribute('aria-busy');
      convert();
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!convert()) amount.focus();
  });
  amount.addEventListener('input', convert);
  from.addEventListener('change', convert);
  to.addEventListener('change', convert);
  refresh.addEventListener('click', loadRates);

  // Reuse today's saved response; older rates remain available if a request fails.
  const saved = readCache();
  if (saved) rateData = saved.data;
  const cacheAge = saved ? Date.now() - saved.savedAt : cacheLifetime;
  if (saved && cacheAge >= 0 && cacheAge < cacheLifetime) {
    status.textContent = 'Saved daily rates · updated ' + rateDate() + ' (UTC).';
    convert();
  } else {
    loadRates();
  }
}());
