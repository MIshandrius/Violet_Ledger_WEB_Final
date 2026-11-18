/* Expense log, feedback dialog, FAQ and clock. Shared calculations are in calc.js. */
(function () {
  'use strict';

  const expenseForm = document.getElementById('expense-form');
  const expenseRows = document.getElementById('expense-rows');
  const expenseStorageKey = 'violet-ledger-expenses';

  function money(amount) {
    return '₸' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function saveExpenses() {
    const expenses = [];
    expenseRows.querySelectorAll('tr[data-added="true"]').forEach(function (row) {
      expenses.push({
        date: row.children[0].textContent,
        item: row.children[1].textContent,
        category: row.dataset.category,
        payment: row.children[3].textContent,
        amount: Number(row.dataset.amount)
      });
    });
    try {
      localStorage.setItem(expenseStorageKey, JSON.stringify(expenses));
    } catch (error) {
      console.warn('Unable to save expenses:', error);
    }
  }

  function updateExpenseSummary() {
    let total = 0;
    const totals = { Food: 0, Transport: 0, Fun: 0, Home: 0, Other: 0 };
    expenseRows.querySelectorAll('tr').forEach(function (row) {
      const amount = Number(row.dataset.amount) || 0;
      total += amount;
      if (row.dataset.category in totals) totals[row.dataset.category] += amount;
    });
    document.getElementById('expense-total').textContent = money(total);
    for (const category in totals) {
      const field = document.getElementById(category.toLowerCase() + '-total');
      if (field) field.textContent = money(totals[category]);
    }
  }

  // Saved and newly submitted expenses use the same row and Remove button.
  function addExpenseRow(expense) {
    const row = document.createElement('tr');
    row.dataset.amount = expense.amount;
    row.dataset.category = expense.category;
    row.dataset.added = 'true';
    const values = [expense.date, expense.item, expense.category, expense.payment, money(expense.amount)];
    for (const value of values) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    const actionCell = document.createElement('td');
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'delete-entry';
    removeButton.textContent = 'Remove';
    removeButton.setAttribute('aria-label', 'Remove ' + expense.item);
    removeButton.addEventListener('click', function () {
      row.remove();
      saveExpenses();
      updateExpenseSummary();
    });
    actionCell.appendChild(removeButton);
    row.appendChild(actionCell);
    expenseRows.appendChild(row);
  }

  function restoreExpenses() {
    try {
      const expenses = JSON.parse(localStorage.getItem(expenseStorageKey) || '[]');
      if (!Array.isArray(expenses)) return;
      for (const expense of expenses) {
        if (!expense || typeof expense.item !== 'string' || !expense.item.trim()) continue;
        const amount = Number(expense.amount);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        if (!['Food', 'Transport', 'Fun', 'Home', 'Other'].includes(expense.category)) continue;
        if (!['Card', 'Cash', 'Transfer'].includes(expense.payment)) continue;
        addExpenseRow({
          date: typeof expense.date === 'string' ? expense.date : '',
          item: expense.item,
          category: expense.category,
          payment: expense.payment,
          amount: amount
        });
      }
    } catch (error) {
      console.warn('Unable to restore expenses:', error);
    }
  }

  if (expenseForm && expenseRows) {
    const dateField = document.getElementById('expense-date');
    dateField.value = today();
    restoreExpenses();
    updateExpenseSummary();
    expenseForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const item = document.getElementById('expense-item').value.trim();
      const amount = Number(document.getElementById('expense-amount').value);
      if (!item || !Number.isFinite(amount) || amount <= 0) return;
      addExpenseRow({
        date: dateField.value,
        item: item,
        category: document.getElementById('expense-category').value,
        payment: document.getElementById('payment-method').value,
        amount: amount
      });
      saveExpenses();
      updateExpenseSummary();
      document.getElementById('expense-message').textContent = 'Added ' + item + ' to your expense log.';
      expenseForm.reset();
      dateField.value = today();
    });
    document.getElementById('clear-expenses').addEventListener('click', function () {
      expenseRows.querySelectorAll('tr[data-added="true"]').forEach(function (row) { row.remove(); });
      saveExpenses();
      updateExpenseSummary();
    });
  }

  const feedbackForm = document.getElementById('feedback-form');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const name = document.getElementById('feedback-name').value.trim();
      document.getElementById('feedback-message').textContent = 'Thank you, ' + name + '. This is a local preview; your feedback has not been sent.';
    });
  }
  const budgetForm = document.getElementById('budget-form');
  if (budgetForm) budgetForm.addEventListener('submit', function (event) { event.preventDefault(); });

  document.querySelectorAll('.faq-question').forEach(function (question) {
    question.addEventListener('click', function () {
      const answer = question.nextElementSibling;
      const isOpen = question.getAttribute('aria-expanded') === 'true';
      answer.style.maxHeight = isOpen ? '0px' : answer.scrollHeight + 'px';
      question.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  const overlay = document.getElementById('feedback-overlay');
  const openButton = document.querySelector('.feedback-open');
  if (overlay && openButton) {
    const dialog = overlay.querySelector('.feedback-dialog');
    const closeButton = overlay.querySelector('.feedback-close');
    function closeFeedback() {
      overlay.hidden = true;
      document.body.classList.remove('feedback-modal-open');
      openButton.focus();
    }
    openButton.addEventListener('click', function () {
      overlay.hidden = false;
      document.body.classList.add('feedback-modal-open');
      closeButton.focus();
    });
    closeButton.addEventListener('click', closeFeedback);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeFeedback();
    });
    document.addEventListener('keydown', function (event) {
      if (overlay.hidden) return;
      if (event.key === 'Escape') closeFeedback();
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll('button, input, select, textarea, a[href]')).filter(function (field) { return !field.disabled; });
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  const clock = document.getElementById('current-datetime');
  if (clock) {
    function updateClock() {
      clock.textContent = new Date().toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
      });
    }
    updateClock();
    setInterval(updateClock, 1000);
  }
})();
