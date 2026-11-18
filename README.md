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
| `html/index.html` | Quick links, monthly budget, currency converter, savings coach and searchable guides |
| `html/expenses.html` | Add, search, filter and remove daily purchases |
| `html/bills.html` | Record bills, select unpaid balances and apply validated payments |
| `html/save.html` | Add, update and delete savings goals; completed goals appear in milestones |
| `html/account.html` | Sign up or log in; signed-in users see their activity history |
| `html/profile.html` | View account details, account workspace summary and log out |

Shared styles live in `css/`; scripts in `js/`; images in `img/`; optional audio in `sounds/`; bundled libraries in `vendor/`. `storage.js` selects account or guest records; `calc.js` handles budgets, bills and goals; `ui.js` handles purchases and feedback; `validation.js` validates planner forms; `auth.js` handles demo accounts; `currency.js` loads exchange rates. The remaining scripts provide search, shared controls and interface effects. Forms use direct submit handlers, and one function creates both new and restored expense rows. Images use the browser’s `loading="lazy"` feature. jQuery loads directly from `vendor/`, so the website needs no CDN loader.

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

Budget inputs, purchases, bills and savings goals use this browser's `localStorage`. Each signed-in account has its own financial workspace, identified by its email. New accounts start empty. Logging out keeps that account's records; logging back into the same account restores them. Another account has a separate workspace.

When logged out, you use the guest workspace. Records saved before account separation remain there, unchanged, and are accessible by logging out. They are not automatically copied into an account because their owner is unknown. Expense pages contain no built-in purchases: only entries saved for the current workspace appear. The guest savings page still includes labelled sample goals; new signed-in workspaces start empty.

The Account page shows the signed-in user’s latest 100 activities, with timestamps and the newest first. History starts when this feature is used and records page visits, login/logout, successful financial changes, submitted currency conversions, savings plans and theme changes. Invalid submissions, cancelled clears and unchanged amounts do not create financial-action entries. History stays separate for each account.

Theme preferences and the public exchange-rate cache are shared across this browser. Demo accounts and the login session are also stored locally. Clearing site storage removes the saved accounts and workspaces; logging out does not.

Bills start with an empty personal total. **Load example data** adds clearly named sample bills only to the workspace currently in use. Existing saved records are preserved. Payments use a dropdown of unpaid bills and show the remaining balance; excessive payments are rejected.

Unsubmitted bill entries and payments are saved separately for each account or the guest workspace. Returning to the page restores unfinished fields without changing totals. Submitted fields reset and their draft clears only after a successful save; validation or save errors keep the entry available for correction. Confirming **Clear all records** also removes unfinished bill and payment entries. Cancelling keeps them.

For a savings goal, choose **Update saved amount** and enter the full saved total. Its status and achieved milestone update together. **Delete** removes one goal. Clearing all bills or all goals asks for confirmation before changing saved data.

