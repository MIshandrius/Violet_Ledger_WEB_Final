/* Shared page progress, notifications and copy buttons. */
$(function () {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $progress = $('<div>', {
    id: 'scroll-progress', class: 'scroll-progress', role: 'progressbar', 'aria-label': 'Page reading progress',
    'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0
  }).append('<div class="scroll-progress-fill"></div>').prependTo('body');

  function updateProgress() {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const percent = height > 0 ? Math.min(100, Math.max(0, window.scrollY / height * 100)) : 100;
    $progress.attr('aria-valuenow', Math.round(percent));
    $progress.children().css('width', percent + '%');
  }
  $(window).on('scroll resize load', updateProgress);
  updateProgress();

  const $notices = $('<div>', {
    class: 'ledger-toast-region', 'aria-live': 'polite', 'aria-label': 'Notifications'
  }).appendTo('body');

  function notify(message, tone = 'success') {
    if (!message) return;
    const $notice = $('<div>', { class: 'ledger-toast toast-' + tone });
    $('<p>', { class: 'toast-message', text: message }).appendTo($notice);
    const $close = $('<button>', {
      type: 'button', class: 'toast-dismiss', 'aria-label': 'Dismiss notification', text: '×'
    }).appendTo($notice);
    let timer;
    function dismiss() {
      window.clearTimeout(timer);
      $notice.stop(true, true).fadeOut(reducedMotion ? 0 : 200, () => $notice.remove());
    }
    $close.on('click', dismiss);
    $notice.hide().appendTo($notices).fadeIn(reducedMotion ? 0 : 150);
    timer = window.setTimeout(dismiss, 4200);
    $notices.children().slice(0, -4).remove();
  }
  window.VioletLedger = { notify };

  // Form handlers already show their results beside each form.
  $(document).on('click', '.delete-entry', () => notify('Expense removed from your log.'));
  $('#clear-expenses').on('click', () => notify('Your records have been updated.'));

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* Use the fallback below. */ }
    }
    const focused = document.activeElement;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(textarea);
    textarea.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { /* Report failure to the user. */ }
    textarea.remove();
    if (focused) focused.focus({ preventScroll: true });
    return copied;
  }

  $(document).on('click', '[data-copy-target]', async function () {
    const button = this;
    const target = document.querySelector(button.dataset.copyTarget);
    const text = target ? String('value' in target ? target.value : target.innerText || target.textContent).trim() : '';
    if (!text) {
      notify(button.dataset.emptyMessage || 'There is nothing to copy yet.', 'error');
      return;
    }
    const label = button.textContent;
    button.disabled = true;
    const copied = await copyText(text);
    button.textContent = copied ? '✓ Copied!' : 'Copy failed';
    notify(copied ? 'Copied to clipboard!' : 'Clipboard access failed. Select and copy the text manually.', copied ? 'success' : 'error');
    window.setTimeout(() => {
      button.textContent = label;
      button.disabled = false;
    }, 1800);
  });
});
