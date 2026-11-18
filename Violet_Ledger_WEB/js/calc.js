/* Budget, bills and savings calculations. Data stays in this browser. */
(() => {
  'use strict';
  const money = amount => '₸' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const number = value => Number(String(value || '0').replace(/,/g, '')) || 0;
  const localDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  function read(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  }
  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (_) {
      const note = document.querySelector('.demo-note');
      if (note) note.textContent = 'Browser storage is unavailable. Your changes work until you reload this page.';
    }
  }
  function cell(row, value, className = '') {
    const td = document.createElement('td');
    td.textContent = value;
    if (className) td.className = className;
    row.appendChild(td);
    return td;
  }
  function badge(parent, text, className) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    parent.appendChild(span);
  }
  const budgetIds = ['total_sum', 'rent', 'utilities', 'subscriptions', 'savings-goal'];
  function calculateSummary() {
    const target = document.getElementById('summary_total');
    if (!target) return;
    if (window.VioletValidation && !window.VioletValidation.validate(document.getElementById('budget-form'), false)) return;
    const values = {};
    budgetIds.forEach(id => { values[id] = document.getElementById(id)?.value || ''; });
    const remaining = number(values.total_sum) - budgetIds.slice(1).reduce((sum, id) => sum + number(values[id]), 0);
    target.textContent = money(remaining);
    save('violet-ledger-budget', values);
  }
  function initBudget() {
    const saved = read('violet-ledger-budget', {});
    budgetIds.forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;
      if (typeof saved?.[id] === 'string') input.value = saved[id];
      input.addEventListener('input', calculateSummary);
      input.addEventListener('change', calculateSummary);
    });
    calculateSummary();
  }

  function initBills() {
    const rows = document.getElementById('bill-rows');
    if (!rows) return;
    const date = document.getElementById('bill-date');
    const recordForm = document.getElementById('record-bill-form');
    const payForm = document.getElementById('pay-bill-form');
    let paidOff = 0;
    date.value = localDate();
    function addRecord(record) {
      const row = document.createElement('tr');
      row.dataset.amount = record.amount;
      row.dataset.category = record.category;
      cell(row, record.date);
      cell(row, record.name);
      const categoryClass = { Loans: 'food-tag', Credits: 'transport-tag', Debts: 'fun-tag' }[record.category];
      badge(cell(row, ''), record.category, 'category-tag ' + categoryClass);
      cell(row, record.payment);
      cell(row, money(record.amount), 'amount-cell');
      badge(cell(row, ''), record.amount === 0 ? 'Paid off' : 'Active', 'status ' + (record.amount === 0 ? 'on-track' : 'under'));
      rows.appendChild(row);
    }
    function persist() {
      const records = Array.from(rows.children).map(row => ({
        date: row.children[0].textContent, name: row.children[1].textContent,
        category: row.dataset.category, payment: row.children[3].textContent, amount: Number(row.dataset.amount)
      }));
      save('violet-ledger-bills', { records, paidOff });
    }
    function summarize() {
      const totals = { Loans: 0, Credits: 0, Debts: 0 };
      rows.querySelectorAll('tr').forEach(row => { totals[row.dataset.category] += number(row.dataset.amount); });
      document.getElementById('total-paid-off').textContent = money(paidOff);
      document.getElementById('remaining-debt').textContent = money(Object.values(totals).reduce((sum, value) => sum + value, 0));
      Object.entries(totals).forEach(([category, total]) => { document.getElementById(category.toLowerCase() + '-total').textContent = money(total); });
    }
    const saved = read('violet-ledger-bills');
    if (Array.isArray(saved?.records) && Number.isFinite(saved.paidOff) && saved.paidOff >= 0) {
      rows.replaceChildren();
      paidOff = saved.paidOff;
      saved.records.forEach(record => {
        if (typeof record?.name !== 'string' || typeof record.date !== 'string' || !['Loans', 'Credits', 'Debts'].includes(record.category) || !['Card', 'Cash', 'Transfer'].includes(record.payment) || !Number.isFinite(record.amount) || record.amount < 0) return;
        addRecord(record);
      });
    }
    recordForm.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('bill-name').value.trim();
      const message = document.getElementById('record-bill-message');
      if (Array.from(rows.children).some(row => row.children[1].textContent.trim().toLowerCase() === name.toLowerCase())) {
        message.textContent = 'A bill with this name already exists. Choose a unique name.';
        return;
      }
      const amount = number(document.getElementById('bill-amount').value);
      addRecord({ date: date.value, name, category: document.getElementById('bill-category').value, payment: document.getElementById('bill-payment').value, amount });
      summarize();
      persist();
      message.textContent = `Recorded "${name}" for ${money(amount)}.`;
      recordForm.reset();
      date.value = localDate();
    });
    payForm.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('payment-bill-name').value.trim().toLowerCase();
      const message = document.getElementById('pay-bill-message');
      const row = Array.from(rows.children).find(item => item.children[1].textContent.trim().toLowerCase() === name);
      if (!row) { message.textContent = 'No bill found with this name. Check the records below.'; return; }
      const current = number(row.dataset.amount);
      if (current === 0) { message.textContent = 'This bill has already been paid off.'; return; }
      const deduction = Math.min(current, number(document.getElementById('payment-bill-amount').value));
      const remaining = Math.round((current - deduction) * 100) / 100;
      row.dataset.amount = remaining;
      row.querySelector('.amount-cell').textContent = money(remaining);
      if (remaining === 0) {
        row.children[5].replaceChildren();
        badge(row.children[5], 'Paid off', 'status on-track');
      }
      paidOff = Math.round((paidOff + deduction) * 100) / 100;
      summarize();
      persist();
      message.textContent = `Deducted ${money(deduction)} from "${row.children[1].textContent}".`;
      payForm.reset();
    });
    document.getElementById('clear-bills').addEventListener('click', () => {
      rows.replaceChildren();
      paidOff = 0;
      summarize();
      persist();
    });
    summarize();
  }

  function initSavings() {
    const rows = document.getElementById('savings-rows');
    if (!rows) return;
    const form = document.getElementById('savings-goal-form');
    const date = document.getElementById('goal-date');
    const milestones = document.getElementById('achieved-goals-list');
    date.value = localDate();
    function addRecord(goal) {
      const row = document.createElement('tr');
      row.dataset.name = goal.name;
      row.dataset.ideal = goal.ideal;
      row.dataset.actual = goal.actual;
      row.dataset.date = goal.date;
      cell(row, goal.name);
      cell(row, money(goal.ideal));
      cell(row, money(goal.actual));
      const done = goal.actual >= goal.ideal;
      badge(cell(row, ''), done ? 'Done' : 'In progress', 'status ' + (done ? 'on-track' : 'under'));
      cell(row, goal.date || '—');
      rows.appendChild(row);
    }
    function summarize() {
      milestones.replaceChildren();
      rows.querySelectorAll('tr').forEach(row => {
        if (number(row.dataset.actual) < number(row.dataset.ideal)) return;
        const item = document.createElement('div');
        item.className = 'achieved-item';
        const title = document.createElement('strong');
        title.textContent = row.dataset.name;
        const value = document.createElement('span');
        value.textContent = money(row.dataset.actual);
        item.append(title, value);
        milestones.appendChild(item);
      });
      if (!milestones.children.length) {
        const empty = document.createElement('p');
        empty.className = 'form-note';
        empty.textContent = 'No completed goals yet. Keep saving!';
        milestones.appendChild(empty);
      }
    }
    function persist() {
      save('violet-ledger-goals', Array.from(rows.children).map(row => ({ name: row.dataset.name, ideal: number(row.dataset.ideal), actual: number(row.dataset.actual), date: row.dataset.date || '' })));
    }
    const saved = read('violet-ledger-goals');
    if (Array.isArray(saved)) {
      rows.replaceChildren();
      saved.forEach(goal => {
        if (typeof goal?.name !== 'string' || !Number.isFinite(goal.ideal) || goal.ideal <= 0 || !Number.isFinite(goal.actual) || goal.actual < 0 || typeof goal.date !== 'string') return;
        addRecord(goal);
      });
    } else {
      rows.querySelectorAll('tr').forEach(row => { if (row.children.length === 4) cell(row, '—'); });
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('goal-name').value.trim();
      const actual = number(document.getElementById('goal-actual').value);
      const ideal = number(document.getElementById('goal-ideal').value);
      addRecord({ name, actual, ideal, date: date.value });
      summarize();
      persist();
      document.getElementById('savings-message').textContent = actual >= ideal ? `Goal "${name}" is already achieved! Added to milestones.` : `Added goal "${name}". Keep going!`;
      form.reset();
      date.value = localDate();
    });
    document.getElementById('clear-goals').addEventListener('click', () => { rows.replaceChildren(); summarize(); persist(); });
    summarize();
  }

  function init() {
    initBudget();
    initBills();
    initSavings();
  }
  window.calculateSummary = calculateSummary;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
