/* Shared theme, optional sound and the two-step savings coach. */
(() => {
  'use strict';

  const get = id => document.getElementById(id);
  const controls = document.createElement('div');
  controls.className = 'ledger-controls';

  const themeButton = document.createElement('button');
  const soundButton = document.createElement('button');
  for (const button of [themeButton, soundButton]) {
    button.type = 'button';
    button.className = 'btn btn-outline-primary';
    controls.append(button);
  }
  document.querySelector('main').prepend(controls);

  let dark = false;
  try {
    dark = localStorage.getItem('violet-theme') === 'dark';
  } catch (_) { /* The toggle still works if browser storage is blocked. */ }

  function applyTheme() {
    document.body.classList.toggle('night-theme', dark);
    themeButton.textContent = dark ? 'Dark mode · switch to light' : 'Light mode · switch to dark';
    themeButton.setAttribute('aria-pressed', String(dark));
  }

  themeButton.addEventListener('click', () => {
    dark = !dark;
    applyTheme();
    try {
      localStorage.setItem('violet-theme', dark ? 'dark' : 'light');
    } catch (_) { /* Keep the selected mode for this page. */ }
    window.LedgerStorage.logActivity('Switched to ' + (dark ? 'dark' : 'light') + ' mode.');
  });
  applyTheme();

  const sound = new Audio('../sounds/bg-sound.mp3');
  sound.volume = 0.5;
  let soundEnabled = false;
  soundButton.textContent = 'Sound off · enable & test';
  soundButton.setAttribute('aria-pressed', 'false');

  async function playSound() {
    if (!soundEnabled) return;
    try {
      sound.currentTime = 0;
      await sound.play();
    } catch (_) {
      soundButton.textContent = 'Sound unavailable · try again';
    }
  }

  soundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? 'Sound on · mute' : 'Sound off · enable & test';
    soundButton.setAttribute('aria-pressed', String(soundEnabled));
    if (soundEnabled) playSound();
    else sound.pause();
  });

  const form = get('coach-form');
  if (!form) return;

  const first = get('coach-step-one');
  const second = get('coach-step-two');
  const result = get('coach-result');

  function showStep(step) {
    const firstStep = step === 1;
    first.hidden = first.disabled = !firstStep;
    second.hidden = second.disabled = firstStep;
    get('coach-next').hidden = !firstStep;
    get('coach-back').hidden = get('coach-finish').hidden = firstStep;
    get('coach-progress').textContent = firstStep
      ? 'Step 1 of 2 · Your goal'
      : 'Step 2 of 2 · Your monthly habit';
  }

  get('coach-next').addEventListener('click', () => {
    if (!window.VioletValidation.validate(first)) return;
    const name = get('coach-name').value.trim();
    const goal = get('coach-goal').value.trim();
    get('coach-review').textContent = `${name}, let’s plan for ${goal}.`;
    showStep(2);
    get('coach-amount').focus();
  });

  get('coach-back').addEventListener('click', () => {
    showStep(1);
    get('coach-name').focus();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!first.hidden) {
      get('coach-next').click();
      return;
    }
    if (!window.VioletValidation.validate(second)) return;
    const name = get('coach-name').value.trim();
    const goal = get('coach-goal').value.trim();
    const amount = Number(get('coach-amount').value);
    const months = Number(get('coach-months').value);
    const money = value => '₸' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    result.textContent = `${name}, save ${money(amount)} each month for ${months} months toward ${goal}. Your planned total is ${money(amount * months)}.`;
    window.LedgerStorage.logActivity('Created a savings plan for ' + goal + ': ' + money(amount) + ' per month for ' + months + ' months.');
    playSound();
  });

  form.addEventListener('reset', () => {
    showStep(1);
    result.textContent = '';
  });
  showStep(1);
})();
