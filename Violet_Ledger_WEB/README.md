# Violet Ledger

A simple, six-page budget planner for students: plan a month, log purchases, track bills and build savings habits. Team members: **Aknur and Zhasmina**. Built with HTML, CSS, JavaScript, Bootstrap and jQuery; no backend or build step.

## Run locally

Open the inner `Violet_Ledger_WEB` folder containing `index.html`, `html/` and `css/`, then run:

```sh
python3 -m http.server 8000
```

Visit <http://localhost:8000>. The entry page opens `html/index.html`. Stop the server with `Ctrl+C`. Use the same local address when returning so saved browser data remains available.

## Pages and files

| Page | Purpose |
| --- | --- |
| `html/index.html` | Monthly budget, savings coach, searchable guides and currency converter |
| `html/expenses.html` | Add, search, filter and remove daily purchases |
| `html/bills.html` | Record bills and apply payments |
| `html/save.html` | Set savings goals and track progress |
| `html/account.html` | Create a demo account and log in |
| `html/profile.html` | View account details, browser workspace summary and log out |

Shared styles live in `css/`; scripts in `js/`; images in `img/`; optional audio in `sounds/`; bundled libraries in `vendor/`. `calc.js` handles budgets, bills and goals; `ui.js` handles purchases and feedback; `validation.js` validates planner forms; `auth.js` handles demo accounts; `currency.js` loads exchange rates. The remaining scripts provide search, shared controls and interface effects. Forms use direct submit handlers, and one function creates both new and restored expense rows. Images use the browser’s `loading="lazy"` feature. jQuery loads directly from `vendor/`, so the website needs no CDN loader.

## Final-project requirements

| Requirement | Implementation |
| --- | --- |
| Six connected pages | All six content pages appear in the main navigation and sidebar. |
| Responsive layout | CSS Grid, Flexbox, Bootstrap and media queries adapt forms, cards and navigation; wide tables scroll within their containers. |
| Light and dark modes | The shared theme toggle saves the selected mode in `localStorage` across pages. |
| Authentication simulation | Signup saves name, email, phone and demo password locally; login checks credentials and opens the profile page. |
| JavaScript validation | Forms use `novalidate` and show readable inline errors. Account forms check email, password complexity and phone format where applicable; planner forms check their text, date and amount fields. |
| Search and filtering | Guides update while typing; the expense log combines item search and category filtering, with counts and matching totals. |
| Public API | The home-page currency converter uses `fetch()` for KZT, USD, EUR and GBP rates, with loading, error, retry and cached-rate states. |
| UI effects | Button transitions, row animations, progress feedback and notifications support the existing purple design; reduced-motion preferences are respected. |
| Hosting | The project is ready for static hosting; complete the deployment steps below and submit the actual live and repository links. |

Exchange-rate source: [ExchangeRate-API open-access documentation](https://www.exchangerate-api.com/docs/free). Rates are daily estimates, cached in this browser for up to a day; a bank may use a different rate. **Refresh rates** requests an update, and a failed request displays a message or clearly identifies saved rates.

## Browser data and demo accounts

Budget inputs, added purchases, bills, savings goals, theme, accounts and the login session use this browser's `localStorage`. Financial records are shared within the browser, independently of the selected demo account. Logging out keeps those records; clearing site storage removes them. Example table rows are labelled.

This is a classroom authentication simulation: demo passwords are stored locally as plain text. Use sample details and a password you do not use elsewhere, such as `Violet123!`. Signup accepts 10–15 phone digits with an optional country code. Feedback is a local preview and sends no message. The money coach calculates locally, and optional sound starts after the user enables it.

## Verification

Checked all six pages in Chrome at 375, 768 and 1280 pixels wide. Browser checks covered signup/login/logout, inline errors, calculations, saved records after reload, search, theme persistence, mobile navigation and bundled jQuery. The live currency API loaded successfully; controlled failure checks verified retry and saved-rate messages. JavaScript syntax, local links and asset paths also passed checks. Recheck the hosted address after deployment.

## Host and submit

This update does not include a published deployment or a repository URL.

- **GitHub Pages:** put the contents of this inner project folder at the repository root, including `html/`, `css/`, `js/`, `img/`, `sounds/` and `vendor/`. Push to the team's repository. In **Settings → Pages**, choose deployment from the branch and root folder. Open the resulting URL and check every page.
- **Netlify:** upload this inner folder using manual deployment, or connect the repository with its site folder as the publish directory. No build command is needed.

Before submission, check desktop and mobile layouts, both themes, signup/login/logout, invalid form errors, saved records after reload, search and the API. Confirm that images and navigation load from the hosted address, then submit the verified **live link** and **repository link** required by the project PDF.

## Three-minute presentation

1. **0:00–0:30:** explain the student audience, show the connected pages, mobile navigation and theme toggle.
2. **0:30–1:15:** show an invalid signup, create a sample account, log in and display the profile.
3. **1:15–2:15:** update a budget, add and filter a purchase, then show a bill payment and savings goal. Reload to demonstrate saved data.
4. **2:15–3:00:** demonstrate currency conversion and loading/error feedback, identify the API source, and finish with the verified live and repository links.
