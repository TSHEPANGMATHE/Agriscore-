# AgriScore (demo)

Static HTML5 / CSS3 / vanilla JavaScript prototype. No build step, no libraries.
Open `index.html` in a browser (or run `python3 -m http.server` in this folder).
Fonts load from Google Fonts when online; the site works with fallback fonts offline.

## Files
| File | Purpose |
|---|---|
| `index.html` | Sign in, single-page signup, consent screen, farmer portal shell, lender portal container |
| `portal.css` | Styles for the signup page and the Lender Portal (farmer styles are inline in `index.html`) |
| `data.js` | Fictional demo farmers and records (Lerato, Thabo, Nomsa) |
| `translations.js` | English, isiZulu, Sepedi, Setswana text for the original app |
| `i18n-extra.js` | Four-language text for signup, Lender Portal and fixes (zu/nso/tn need native review) |
| `store.js` | Accounts, sessions, loan applications (browser `localStorage`) |
| `auth.js` | Sign in + one-click demos |
| `app.js` | Farmer portal, language handling, routing |
| `records.js` | "Upload records" page for registered farmers: CSV upload + manual entry, validation |
| `signup.js` | Single-page signup form: validation, consent, role |
| `lender.js` | Lender Portal: overview, farmers, assessments, applications, reports, settings |

Load order matters (see the `<script>` tags at the end of `index.html`).

## Roles
- **Farmer Portal** (`#dashboard`, ...) and **Lender Portal** (`#l-overview`, ...) are separate screens
  with their own navigation. The session role decides which one opens.
- Demo logins: `lerato@demo.agr`, `thabo@demo.agr`, `nomsa@demo.agr` / `farmer123`;
  `lender@demo.agr` / `lender123`; or the one-click "Try as Farmer / Lender" buttons.
- Sign up at `index.html#signup` (farmer or lender).

## Uploading records (new farmers)
After signing up, a farmer lands on **Upload records** (`#records`). Three record types can be added by CSV
(use the "Download CSV template" button) or by hand: mobile money, cooperative repayments, harvests.
Files must be `.csv`, max 1 MB / 500 rows. Comma or semicolon separated, dates as `YYYY-MM-DD`, not in the
future. A file is **all-or-nothing**: if any row is invalid nothing is imported and the bad rows are listed.
Uploaded records feed the same scoring as the demo data, so the score, category and loan eligibility update
immediately. They are stored in the browser, are **self-reported and unverified**, and lenders see them flagged.
Demo farmers have fixed fictional records and cannot upload.

## Consent
Signup records two separate choices (neither pre-ticked): agreement to the privacy information (required)
and, for farmers, optional sharing with lenders. Lenders only see registered farmers who ticked sharing.

## Important limits
Demo only. Accounts, a salted SHA-256 password hash, consent and application decisions are stored in this
browser's `localStorage`. There is no server, so this is **not real authentication or security**, and
nothing syncs between browsers. All farmer records and sample applications are fictional.
