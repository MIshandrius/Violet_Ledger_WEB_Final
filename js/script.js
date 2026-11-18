/* Live search, keyboard suggestions and matching text. */
$(function () {
  'use strict';

  function highlight($roots, query) {
    $roots.find('mark.search-highlight').each(function () {
      const parent = this.parentNode;
      this.replaceWith(document.createTextNode(this.textContent));
      parent.normalize();
    });
    if (!query) return;
    const search = query.toLowerCase();
    // Replace only text nodes, preserving links, tags and user-entered text safely.
    $roots.find('*').addBack().contents().filter(function () { return this.nodeType === 3; }).each(function () {
      const text = this.nodeValue;
      const lower = text.toLowerCase();
      if (!lower.includes(search)) return;
      const parts = document.createDocumentFragment();
      let position = 0;
      let match = lower.indexOf(search);
      while (match !== -1) {
        parts.append(document.createTextNode(text.slice(position, match)));
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = text.slice(match, match + query.length);
        parts.append(mark);
        position = match + query.length;
        match = lower.indexOf(search, position);
      }
      parts.append(document.createTextNode(text.slice(position)));
      this.replaceWith(parts);
    });
  }

  function autocomplete($input, $list, getValues, onSelect) {
    let selected = -1;
    $input.attr({ role: 'combobox', 'aria-autocomplete': 'list', 'aria-haspopup': 'listbox',
      'aria-controls': $list.attr('id'), 'aria-expanded': 'false', autocomplete: 'off' });

    function close() {
      selected = -1;
      $list.prop('hidden', true);
      $input.attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
    }
    function render() {
      const query = $input.val().trim().toLowerCase();
      close();
      $list.empty();
      if (!query) return;
      const matches = [...new Set(getValues())].filter(value => value.toLowerCase().includes(query)).slice(0, 6);
      matches.forEach((value, index) => {
        $('<button>', { type: 'button', class: 'search-suggestion', role: 'option', tabindex: '-1',
          id: $list.attr('id') + '-' + index, 'aria-selected': 'false', text: value }).appendTo($list);
      });
      $list.prop('hidden', !matches.length);
      $input.attr('aria-expanded', String(matches.length > 0));
    }
    $input.on('input focus', render).on('blur', close).on('keydown', function (event) {
      const $options = $list.children();
      if (event.key === 'Escape' || event.key === 'Tab') { close(); return; }
      if ($list.prop('hidden')) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        if (selected < 0) selected = direction === 1 ? 0 : $options.length - 1;
        else selected = (selected + direction + $options.length) % $options.length;
        $options.removeClass('is-active').attr('aria-selected', 'false');
        const $active = $options.eq(selected).addClass('is-active').attr('aria-selected', 'true');
        $input.attr('aria-activedescendant', $active.attr('id'));
        $active[0].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter' && selected >= 0) {
        event.preventDefault();
        $options.eq(selected).trigger('click');
      }
    });
    // Keep input focus while the suggestion is selected with the mouse.
    $list.on('mousedown', event => event.preventDefault()).on('click', 'button', function () {
      $input.val($(this).text());
      onSelect();
      close();
    });
    return close;
  }

  const $resources = $('#resource-grid .resource-card');
  const $resourceInput = $('#resource-search');
  function filterResources() {
    const query = $resourceInput.val().trim();
    highlight($resources, '');
    const $matches = $resources.filter(function () { return $(this).text().toLowerCase().includes(query.toLowerCase()); });
    $resources.prop('hidden', true);
    $matches.prop('hidden', false);
    highlight($matches, query);
    $('#resource-search-status').text($matches.length + ' of ' + $resources.length + ' guides' + (query ? ' match “' + query + '”.' : '.'));
    $('#resource-empty').prop('hidden', $matches.length > 0);
    $('#resource-clear').prop('hidden', !query);
  }
  if ($resources.length) {
    $resourceInput.on('input', filterResources);
    const close = autocomplete($resourceInput, $('#resource-suggestions'),
      () => $resources.find('h3').map(function () { return $(this).text(); }).get(), filterResources);
    $('#resource-clear').on('click', function () {
      $resourceInput.val('').trigger('focus');
      filterResources();
      close();
    });
    filterResources();
  }

  const $expenseRows = $('#expense-rows');
  const $expenseSearch = $('#filter-search');
  function filterExpenses() {
    const query = $expenseSearch.val().trim();
    const category = $('#filter-category').val();
    const $rows = $expenseRows.children('tr');
    highlight($rows, '');
    const $matches = $rows.filter(function () {
      return (category === 'All' || this.dataset.category === category) &&
        $(this).children('td').slice(0, 5).text().toLowerCase().includes(query.toLowerCase());
    });
    $rows.prop('hidden', true);
    $matches.prop('hidden', false);
    highlight($matches.children('td:nth-child(-n+5)'), query);
    const total = $matches.get().reduce((sum, row) => sum + Number(row.dataset.amount || 0), 0);
    $('#filter-summary').text($matches.length + ' of ' + $rows.length + ' purchases · Visible total: ₸' +
      total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    $('#expense-empty').prop('hidden', $matches.length > 0);
  }
  if ($expenseRows.length) {
    $expenseSearch.on('input', filterExpenses);
    $('#filter-category').on('change', filterExpenses);
    autocomplete($expenseSearch, $('#expense-suggestions'), () => {
      const category = $('#filter-category').val();
      return $expenseRows.children('tr').filter(function () { return category === 'All' || this.dataset.category === category; })
        .map(function () { return this.children[1].textContent.trim(); }).get();
    }, filterExpenses);
    new MutationObserver(filterExpenses).observe($expenseRows[0], { childList: true });
    filterExpenses();
  }

  const $faqItems = $('#faq .faq-item');
  let searchingFaq = false;
  $('#faq-search').on('input', function () {
    const query = $(this).val().trim();
    highlight($faqItems, '');
    let count = 0;
    $faqItems.each(function () {
      const $question = $(this).find('.faq-question');
      if (query && !searchingFaq) this.dataset.wasOpen = $question.attr('aria-expanded');
      const match = $(this).text().toLowerCase().includes(query.toLowerCase());
      $(this).prop('hidden', !match);
      if (match) count++;
      if (query || searchingFaq) {
        const open = query ? match : this.dataset.wasOpen === 'true';
        $question.attr('aria-expanded', String(open));
        $(this).find('.faq-answer').css('max-height', open ? 'none' : '0px');
      }
    });
    searchingFaq = Boolean(query);
    highlight($faqItems.filter(':not([hidden])'), query);
    $('#faq-search-status').text(query ? count + ' matching question' + (count === 1 ? '' : 's') + '.' : 'Search questions and answers.');
  });
});
