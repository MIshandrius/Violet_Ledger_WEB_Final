/* Forms use novalidate so JavaScript can show clear errors beside each field. */
(function () {
  'use strict';

  const formIds = ['budget-form', 'expense-form', 'record-bill-form', 'pay-bill-form', 'savings-goal-form', 'goal-update-form', 'coach-form', 'feedback-form'];
  const fieldRules = {
    'total_sum': { type: 'amount', optional: true, allowZero: true },
    'rent': { type: 'amount', optional: true, allowZero: true },
    'utilities': { type: 'amount', optional: true, allowZero: true },
    'subscriptions': { type: 'amount', optional: true, allowZero: true },
    'savings-goal': { type: 'amount', optional: true, allowZero: true },
    'expense-date': { type: 'date' },
    'expense-item': { type: 'text', label: 'an item name', limit: 40 },
    'expense-category': { type: 'choice', options: ['Food', 'Transport', 'Home', 'Fun', 'Other'] },
    'payment-method': { type: 'choice', options: ['Card', 'Cash', 'Transfer'] },
    'expense-amount': { type: 'amount' },
    'bill-date': { type: 'date' },
    'bill-name': { type: 'text', label: 'a bill name', limit: 40 },
    'bill-category': { type: 'choice', options: ['Loans', 'Credits', 'Debts'] },
    'bill-payment': { type: 'choice', options: ['Card', 'Cash', 'Transfer'] },
    'bill-amount': { type: 'amount' },
    'payment-bill-name': { type: 'selection', label: 'an unpaid bill' },
    'payment-bill-amount': { type: 'amount' },
    'goal-date': { type: 'date' },
    'goal-name': { type: 'text', label: 'a goal name', limit: 60 },
    'goal-actual': { type: 'amount', allowZero: true },
    'goal-ideal': { type: 'amount' },
    'goal-update-amount': { type: 'amount', allowZero: true },
    'coach-name': { type: 'text', label: 'your name', limit: 40 },
    'coach-goal': { type: 'text', label: 'a savings goal', limit: 60 },
    'coach-amount': { type: 'amount' },
    'coach-months': { type: 'months' }
  };
  const feedbackRules = {
    'name': { type: 'text', label: 'your name', limit: 60 },
    'email': { type: 'email' },
    'favorite-page': { type: 'page' },
    'message': { type: 'text', label: 'a message', limit: 1000 }
  };

  function getRule(field) {
    if (fieldRules[field.id]) return fieldRules[field.id];
    if (field.form && field.form.id === 'feedback-form') return feedbackRules[field.name];
  }

  function validateField(field, rule) {
    const value = field.value.trim();

    if (rule.type === 'text') {
      if (!value) return 'Please enter ' + rule.label + '.';
      if (value.length > rule.limit) return 'Please keep ' + rule.label + ' to ' + rule.limit + ' characters or fewer.';
    }
    if (rule.type === 'amount') {
      if (!value) return rule.optional ? '' : 'Please enter an amount.';
      const amount = Number(value.replace(/,/g, ''));
      // Commas must group thousands; money can have up to two decimal places.
      const amountPattern = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;
      if (!amountPattern.test(value) || !Number.isFinite(amount)) {
        return 'Enter a valid amount with up to two decimal places (for example, 1,250.50).';
      }
      if (!rule.allowZero && amount === 0) return 'Enter an amount greater than zero.';
      if (amount > 1000000000) return 'Please enter an amount below ₸1,000,000,001.';
    }
    if (rule.type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Please choose a valid date.';
      const date = new Date(value + 'T00:00:00Z');
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Please choose a valid date.';
    }
    if (rule.type === 'choice' && !rule.options.includes(value)) return 'Please choose an option from the list.';
    if (rule.type === 'selection' && !value) return 'Please choose ' + rule.label + '.';
    if (rule.type === 'months') {
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 120) return 'Enter a whole number of months from 1 to 120.';
    }
    if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter an email such as name@example.com.';
    if (rule.type === 'page' && !value) return 'Please choose your favorite page.';
    return '';
  }

  function showError(field, message) {
    if (!field.id) field.id = field.form.id + '-' + field.name;
    const errorId = field.id + '-validation-error';
    let error = document.getElementById(errorId);
    if (!error && message) {
      error = document.createElement('span');
      error.id = errorId;
      error.className = 'field-error';
      error.setAttribute('aria-live', 'polite');
      const container = field.closest('label') || field.parentElement;
      container.appendChild(error);
      const description = field.getAttribute('aria-describedby') || '';
      field.setAttribute('aria-describedby', (description + ' ' + errorId).trim());
    }
    if (error) error.textContent = message;
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function validate(scope, focus = true) {
    if (!scope) return true;
    let firstInvalid = null;
    const fields = scope.querySelectorAll('input, select, textarea');
    for (const field of fields) {
      const rule = getRule(field);
      if (!rule || field.matches(':disabled')) continue;
      const message = validateField(field, rule);
      showError(field, message);
      if (message && !firstInvalid) firstInvalid = field;
    }
    if (firstInvalid && focus) firstInvalid.focus();
    return firstInvalid === null;
  }
  window.VioletValidation = { validate };

  // The capture listener checks input before the page's submit handler runs.
  document.addEventListener('submit', function (event) {
    if (!formIds.includes(event.target.id)) return;
    if (!validate(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  function recheckField(event) {
    const field = event.target;
    if (!field.form || !formIds.includes(field.form.id)) return;
    const rule = getRule(field);
    if (rule && field.getAttribute('aria-invalid') === 'true') showError(field, validateField(field, rule));
  }
  document.addEventListener('input', recheckField);
  document.addEventListener('change', recheckField);
  document.addEventListener('reset', function (event) {
    event.target.querySelectorAll('.field-error').forEach(function (error) { error.textContent = ''; });
    event.target.querySelectorAll('[aria-invalid]').forEach(function (field) { field.removeAttribute('aria-invalid'); });
  });
})();
