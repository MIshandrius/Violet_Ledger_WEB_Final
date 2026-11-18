/* Budget, bills and savings calculations for the current account or guest. */
(() => {
  'use strict';
  const money = amount => '₸' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const number = value => Number(String(value || '0').replace(/,/g, '')) || 0;
  const localDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  function read(key, fallback = null) {
    return window.LedgerStorage.read(key, fallback);
  }
  function save(key, data) {
    const saved = window.LedgerStorage.write(key, data);
    if (!saved) {
      const note = document.querySelector('.demo-note');
      if (note) note.textContent = 'Browser storage is unavailable. Your changes work until you reload this page.';
    }
    return saved;
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
  const budgetLabels = { total_sum: 'income', rent: 'rent', utilities: 'utilities', subscriptions: 'subscriptions', 'savings-goal': 'savings target' };
  function calculateSummary(event) {
    const target = document.getElementById('summary_total');
    if (!target) return;
    if (window.VioletValidation && !window.VioletValidation.validate(document.getElementById('budget-form'), false)) return;
    const values = {};
    budgetIds.forEach(id => { values[id] = document.getElementById(id)?.value || ''; });
    const remaining = number(values.total_sum) - budgetIds.slice(1).reduce((sum, id) => sum + number(values[id]), 0);
    target.textContent = money(remaining);
    const previous = read('violet-ledger-budget', {});
    const changedFields = budgetIds.filter(id => number(previous?.[id]) !== number(values[id]));
    const saved = save('violet-ledger-budget', values);
    if (saved && changedFields.length && (event?.type === 'input' || event?.type === 'change')) {
      window.LedgerStorage.logActivity('Updated monthly ' + changedFields.map(id => budgetLabels[id]).join(', ') + '. Money remaining: ' + money(remaining) + '.');
    }
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
    const billsKey = 'violet-ledger-bills';
    const draftsKey = 'violet-ledger-bill-drafts';
    const entryIds = ['bill-date', 'bill-name', 'bill-category', 'bill-payment', 'bill-amount'];
    const date = document.getElementById('bill-date');
    const recordForm = document.getElementById('record-bill-form');
    const payForm = document.getElementById('pay-bill-form');
    const billSelect = document.getElementById('payment-bill-name');
    const paymentAmount = document.getElementById('payment-bill-amount');
    const paymentLimit = document.getElementById('payment-bill-limit');
    const payButton = document.getElementById('pay-bill-submit');
    const clearButton = document.getElementById('clear-bills');
    const exampleButton = document.getElementById('load-example-bills');
    const tableMessage = document.getElementById('bills-table-message');
    const recordMessage = document.getElementById('record-bill-message');
    const payMessage = document.getElementById('pay-bill-message');
    const saved = read(billsKey);
    let savedVersion = JSON.stringify(saved);
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
    function selectedBill() {
      if (!billSelect.value) return null;
      const row = rows.children[Number(billSelect.value)];
      return row && number(row.dataset.amount) > 0 ? row : null;
    }
    function clearPaymentErrors() {
      [billSelect, paymentAmount].forEach(field => {
        document.getElementById(field.id + '-validation-error').textContent = '';
        field.setAttribute('aria-invalid', 'false');
      });
    }
    function paymentError(field, message) {
      document.getElementById(field.id + '-validation-error').textContent = message;
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
    function showPaymentLimit() {
      const row = selectedBill();
      if (row) paymentLimit.textContent = 'Remaining balance and maximum payment: ' + money(row.dataset.amount) + '.';
      else paymentLimit.textContent = billSelect.disabled
        ? (rows.children.length ? 'All bills are paid off. Add a new bill to record another payment.' : 'Add a bill above, or load example bills below, to record a payment.')
        : 'Choose an unpaid bill to see its remaining balance and maximum payment.';
    }
    function refreshPaymentOptions() {
      const selected = billSelect.value;
      billSelect.replaceChildren(new Option('Choose an unpaid bill', ''));
      Array.from(rows.children).forEach((row, index) => {
        if (number(row.dataset.amount) <= 0) return;
        billSelect.append(new Option(row.children[1].textContent + ' — ' + money(row.dataset.amount) + ' remaining', String(index)));
      });
      billSelect.value = selected;
      if (billSelect.selectedIndex < 0) billSelect.value = '';
      const noUnpaidBills = billSelect.options.length === 1;
      billSelect.disabled = paymentAmount.disabled = payButton.disabled = noUnpaidBills;
      showPaymentLimit();
    }
    function recordsFromRows() {
      return Array.from(rows.children).map(row => ({
        date: row.children[0].textContent, name: row.children[1].textContent,
        category: row.dataset.category, payment: row.children[3].textContent, amount: Number(row.dataset.amount)
      }));
    }
    function persist(records, nextPaidOff = paidOff) {
      // An older tab must reload the latest records before making another change.
      if (JSON.stringify(read(billsKey)) !== savedVersion) {
        saveDrafts();
        window.location.reload();
        return false;
      }
      const next = { records, paidOff: nextPaidOff };
      if (!save(billsKey, next)) return false;
      savedVersion = JSON.stringify(next);
      return true;
    }
    function summarize() {
      const totals = { Loans: 0, Credits: 0, Debts: 0 };
      rows.querySelectorAll('tr').forEach(row => { totals[row.dataset.category] += number(row.dataset.amount); });
      document.getElementById('total-paid-off').textContent = money(paidOff);
      document.getElementById('remaining-debt').textContent = money(Object.values(totals).reduce((sum, value) => sum + value, 0));
      Object.entries(totals).forEach(([category, total]) => { document.getElementById(category.toLowerCase() + '-total').textContent = money(total); });
      document.getElementById('bills-empty').hidden = rows.children.length > 0;
      clearButton.disabled = rows.children.length === 0 && paidOff === 0;
      exampleButton.hidden = rows.children.length > 0 || paidOff > 0;
      refreshPaymentOptions();
    }

    function readDrafts() {
      const drafts = read(draftsKey, {});
      return drafts && typeof drafts === 'object' && !Array.isArray(drafts) ? drafts : {};
    }
    function draftStatus(form, message) {
      const forms = form ? [form] : [recordForm, payForm];
      forms.forEach(item => { item.querySelector('[data-draft-status]').textContent = message; });
    }
    function saveDrafts(form) {
      const drafts = readDrafts();
      if (!form || form === recordForm) {
        drafts.bill = {};
        entryIds.forEach(id => { drafts.bill[id] = document.getElementById(id).value; });
      }
      if (!form || form === payForm) {
        const selected = selectedBill();
        drafts.payment = { billName: selected ? selected.children[1].textContent : '', amount: paymentAmount.value };
      }
      const success = save(draftsKey, drafts);
      draftStatus(form, success ? '' : 'Your unfinished entries could not be saved. Keep this page open and try again.');
      return success;
    }
    function clearDraft(form) {
      const drafts = readDrafts();
      if (!form || form === recordForm) delete drafts.bill;
      if (!form || form === payForm) delete drafts.payment;
      const success = save(draftsKey, drafts);
      draftStatus(form, success ? '' : 'Your record is saved, but its old form draft could not be cleared.');
    }
    function restoreDrafts() {
      const drafts = readDrafts();
      entryIds.forEach(id => {
        if (typeof drafts.bill?.[id] === 'string') document.getElementById(id).value = drafts.bill[id];
      });
      if (typeof drafts.payment?.amount === 'string') paymentAmount.value = drafts.payment.amount;
      if (drafts.payment?.billName) {
        const index = Array.from(rows.children).findIndex(row =>
          row.children[1].textContent === drafts.payment.billName && number(row.dataset.amount) > 0
        );
        billSelect.value = index >= 0 ? String(index) : '';
        if (index < 0) payMessage.textContent = 'The bill in your unfinished payment is no longer unpaid. Please choose another bill.';
      }
      showPaymentLimit();
    }

    if (Array.isArray(saved?.records) && Number.isFinite(saved.paidOff) && saved.paidOff >= 0) {
      rows.replaceChildren();
      paidOff = saved.paidOff;
      saved.records.forEach(record => {
        if (typeof record?.name !== 'string' || typeof record.date !== 'string' || !['Loans', 'Credits', 'Debts'].includes(record.category) || !['Card', 'Cash', 'Transfer'].includes(record.payment) || !Number.isFinite(record.amount) || record.amount < 0) return;
        addRecord(record);
      });
    }
    summarize();
    restoreDrafts();
    [recordForm, payForm].forEach(form => {
      form.addEventListener('input', () => saveDrafts(form));
      form.addEventListener('change', () => saveDrafts(form));
    });

    recordForm.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('bill-name').value.trim();
      if (Array.from(rows.children).some(row => row.children[1].textContent.trim().toLowerCase() === name.toLowerCase())) {
        recordMessage.textContent = 'A bill with this name already exists. Choose a unique name.';
        return;
      }
      const amount = number(document.getElementById('bill-amount').value);
      const record = { date: date.value, name, category: document.getElementById('bill-category').value, payment: document.getElementById('bill-payment').value, amount };
      if (!persist([...recordsFromRows(), record])) {
        recordMessage.textContent = 'Your bill could not be saved. Your entries are still here. Please try again.';
        return;
      }
      addRecord(record);
      summarize();
      window.LedgerStorage.logActivity('Added bill "' + name + '" for ' + money(amount) + '.');
      recordMessage.textContent = `Saved "${name}" for ${money(amount)}. You can find it in the records below.`;
      tableMessage.textContent = '';
      clearPaymentErrors();
      recordForm.reset();
      date.value = localDate();
      clearDraft(recordForm);
    });
    payForm.addEventListener('submit', event => {
      event.preventDefault();
      payMessage.textContent = '';
      clearPaymentErrors();
      const row = selectedBill();
      if (!row) { paymentError(billSelect, 'Please choose an unpaid bill from the list.'); return; }
      const current = number(row.dataset.amount);
      const deduction = number(paymentAmount.value);
      if (!Number.isFinite(deduction) || deduction <= 0) { paymentError(paymentAmount, 'Enter a payment greater than zero.'); return; }
      if (deduction > current) { paymentError(paymentAmount, 'The payment cannot exceed the remaining balance of ' + money(current) + '.'); return; }
      const remaining = Math.round((current - deduction) * 100) / 100;
      const nextPaidOff = Math.round((paidOff + deduction) * 100) / 100;
      const records = recordsFromRows();
      records[Number(billSelect.value)].amount = remaining;
      if (!persist(records, nextPaidOff)) {
        payMessage.textContent = 'Your payment could not be saved. Your entries and bill balance are unchanged. Please try again.';
        return;
      }
      row.dataset.amount = remaining;
      row.querySelector('.amount-cell').textContent = money(remaining);
      if (remaining === 0) {
        row.children[5].replaceChildren();
        badge(row.children[5], 'Paid off', 'status on-track');
      }
      paidOff = nextPaidOff;
      summarize();
      window.LedgerStorage.logActivity('Paid ' + money(deduction) + ' toward bill "' + row.children[1].textContent + '".');
      payMessage.textContent = `Saved payment of ${money(deduction)} toward "${row.children[1].textContent}".`;
      paymentAmount.value = '';
      clearDraft(payForm);
      tableMessage.textContent = '';
    });
    paymentAmount.addEventListener('input', clearPaymentErrors);
    billSelect.addEventListener('change', () => {
      clearPaymentErrors();
      showPaymentLimit();
      payMessage.textContent = '';
    });
    exampleButton.addEventListener('click', () => {
      if (rows.children.length || paidOff > 0) return;
      const examples = [
        { date: 'Sep 10', name: 'Example: Car Loan', category: 'Loans', payment: 'Transfer', amount: 150000 },
        { date: 'Sep 12', name: 'Example: Kaspi Red', category: 'Credits', payment: 'Card', amount: 45000 },
        { date: 'Sep 14', name: 'Example: Friend Loan', category: 'Debts', payment: 'Cash', amount: 20000 }
      ];
      if (!persist(examples)) {
        tableMessage.textContent = 'The example bills could not be saved. Please try again.';
        return;
      }
      examples.forEach(addRecord);
      summarize();
      window.LedgerStorage.logActivity('Loaded 3 example bills.');
      tableMessage.textContent = 'Loaded 3 clearly labelled example bills. Clear these records before starting your own tracker.';
    });
    clearButton.addEventListener('click', () => {
      const count = rows.children.length;
      if (!count && paidOff === 0) return;
      const label = count + (count === 1 ? ' bill' : ' bills');
      if (!window.confirm('Clear all ' + label + ' and the payment history (' + money(paidOff) + ' paid off)? This removes them from this browser.')) return;
      if (!persist([], 0)) {
        tableMessage.textContent = 'Nothing was cleared. Saving failed; your records and entries are unchanged.';
        return;
      }
      rows.replaceChildren();
      paidOff = 0;
      recordForm.reset();
      date.value = localDate();
      payForm.reset();
      clearPaymentErrors();
      summarize();
      clearDraft();
      window.LedgerStorage.logActivity('Cleared ' + label + ' and the payment history.');
      recordMessage.textContent = 'Fill the fields to register a bill or debt.';
      payMessage.textContent = '';
      tableMessage.textContent = 'Cleared ' + label + ' and the payment history.';
    });

    const owner = window.LedgerStorage.owner;
    const accountBillsKey = billsKey + (owner ? ':' + encodeURIComponent(owner) : '');
    window.addEventListener('storage', event => {
      if (event.key === accountBillsKey || event.key === null) window.location.reload();
    });
  }

  function initSavings() {
    const rows = document.getElementById('savings-rows');
    if (!rows) return;
    if (window.LedgerStorage.isSignedIn) rows.replaceChildren();
    const form = document.getElementById('savings-goal-form');
    const date = document.getElementById('goal-date');
    const milestones = document.getElementById('achieved-goals-list');
    const clearButton = document.getElementById('clear-goals');
    const tableMessage = document.getElementById('goals-table-message');
    const editor = document.getElementById('goal-update-panel');
    const updateForm = document.getElementById('goal-update-form');
    const updateAmount = document.getElementById('goal-update-amount');
    let editingRow = null;
    date.value = localDate();

    function closeEditor() {
      editor.hidden = true;
      editingRow = null;
      updateForm.reset();
    }
    function updateStatus(row) {
      const done = number(row.dataset.actual) >= number(row.dataset.ideal);
      row.children[3].replaceChildren();
      badge(row.children[3], done ? 'Done' : 'In progress', 'status ' + (done ? 'on-track' : 'under'));
    }
    function addActions(row) {
      const actions = cell(row, '', 'goal-actions row-actions');
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn btn-sm btn-outline-primary goal-edit';
      editButton.textContent = 'Update saved amount';
      editButton.setAttribute('aria-label', 'Update saved amount for ' + row.dataset.name);
      editButton.addEventListener('click', function () {
        updateForm.reset();
        editingRow = row;
        document.getElementById('goal-update-name').textContent = row.dataset.name;
        updateAmount.value = row.dataset.actual;
        editor.hidden = false;
        updateAmount.focus();
        updateAmount.select();
      });
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn btn-sm btn-outline-danger goal-delete';
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', 'Delete savings goal ' + row.dataset.name);
      deleteButton.addEventListener('click', function () {
        const nextRow = row.nextElementSibling || row.previousElementSibling;
        if (editingRow === row) closeEditor();
        row.remove();
        summarize();
        if (persist()) window.LedgerStorage.logActivity('Deleted savings goal "' + row.dataset.name + '".');
        tableMessage.textContent = 'Deleted savings goal "' + row.dataset.name + '".';
        if (nextRow) nextRow.querySelector('.goal-edit').focus();
        else document.getElementById('goal-name').focus();
      });
      actions.append(editButton, deleteButton);
    }
    function addRecord(goal) {
      const row = document.createElement('tr');
      row.dataset.name = goal.name;
      row.dataset.ideal = goal.ideal;
      row.dataset.actual = goal.actual;
      row.dataset.date = goal.date;
      cell(row, goal.name);
      cell(row, money(goal.ideal));
      cell(row, money(goal.actual));
      cell(row, '');
      updateStatus(row);
      cell(row, goal.date || '—');
      addActions(row);
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
      document.getElementById('goals-empty').hidden = rows.children.length > 0;
      clearButton.disabled = rows.children.length === 0;
    }
    function persist() {
      return save('violet-ledger-goals', Array.from(rows.children).map(row => ({ name: row.dataset.name, ideal: number(row.dataset.ideal), actual: number(row.dataset.actual), date: row.dataset.date || '' })));
    }
    const saved = read('violet-ledger-goals');
    if (Array.isArray(saved)) {
      rows.replaceChildren();
      saved.forEach(goal => {
        if (typeof goal?.name !== 'string' || !Number.isFinite(goal.ideal) || goal.ideal <= 0 || !Number.isFinite(goal.actual) || goal.actual < 0 || typeof goal.date !== 'string') return;
        addRecord(goal);
      });
    } else {
      rows.querySelectorAll('tr').forEach(row => {
        if (row.children.length === 4) cell(row, '—');
        addActions(row);
      });
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('goal-name').value.trim();
      const actual = number(document.getElementById('goal-actual').value);
      const ideal = number(document.getElementById('goal-ideal').value);
      addRecord({ name, actual, ideal, date: date.value });
      summarize();
      if (persist()) window.LedgerStorage.logActivity('Added savings goal "' + name + '" with a target of ' + money(ideal) + '.');
      tableMessage.textContent = '';
      document.getElementById('savings-message').textContent = actual >= ideal ? `Goal "${name}" is already achieved! Added to milestones.` : `Added goal "${name}". Keep going!`;
      form.reset();
      date.value = localDate();
    });
    updateForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!editingRow || !window.VioletValidation.validate(updateForm)) return;
      const row = editingRow;
      const amount = number(updateAmount.value);
      const previous = number(row.dataset.actual);
      row.dataset.actual = amount;
      row.children[2].textContent = money(amount);
      updateStatus(row);
      summarize();
      if (persist() && amount !== previous) window.LedgerStorage.logActivity('Updated savings for "' + row.dataset.name + '" to ' + money(amount) + '.');
      tableMessage.textContent = 'Updated "' + row.dataset.name + '". Total saved: ' + money(amount) + '.';
      closeEditor();
      row.querySelector('.goal-edit').focus();
    });
    document.getElementById('cancel-goal-update').addEventListener('click', function () {
      const row = editingRow;
      closeEditor();
      if (row) row.querySelector('.goal-edit').focus();
    });
    clearButton.addEventListener('click', function () {
      const count = rows.children.length;
      if (!count) return;
      const label = count + (count === 1 ? ' savings goal' : ' savings goals');
      if (!window.confirm('Clear all ' + label + '? This removes their saved amounts and milestones from this browser.')) return;
      closeEditor();
      rows.replaceChildren();
      summarize();
      if (persist()) window.LedgerStorage.logActivity('Cleared ' + label + '.');
      tableMessage.textContent = 'Cleared ' + label + '.';
    });
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
