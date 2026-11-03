# KPJ Paediatrics Services Overview

An interactive, password-protected dashboard of the report *Paediatric Services across the KPJ Hospital Network* (Group Clinical Services, position as of October 2026). It is built as an **encrypted static site** for GitHub Pages: everything derived from the report is encrypted at build time and decrypted only in the viewer's browser after the correct password is entered.

## What is in this repository

```
kpj-paediatric-dashboard/
├─ site/                      PUBLISHED. Encrypted build only (login page + ciphertext + logo).
├─ src/
│  ├─ app/                    Dashboard code: app.js, app.css, shell.html (no report content)
│  ├─ login/login.html        Branded sign-in page and in-browser decryption
│  └─ assets/kpj-logo.png     KPJ Healthcare logo (taken unchanged from the supplied report)
├─ scripts/
│  ├─ build.mjs               Checks data, bundles and encrypts → site/
│  ├─ check-data.mjs          Reconciles the data against the report's stated totals (234 checks)
│  ├─ verify.mjs              Confirms site/ holds no password or unencrypted report content
│  └─ preview.mjs             Local web server (localhost only)
├─ .github/workflows/deploy.yml   Verifies and deploys site/ to GitHub Pages
├─ .env.example               Template for the local password file
└─ private/                   NOT IN GIT (git-ignored)
   ├─ report-data.js          All report-derived figures and text
   └─ build/                  Optional unencrypted preview
```

`private/` holds the report content and is never committed. **Keep a secure backup of `private/report-data.js`** (for example in KPJ's OneDrive or SharePoint). Without it you cannot rebuild the dashboard. The source report (.docx/.pdf) also stays outside the repository.

Requirements: [Node.js](https://nodejs.org) 20 or later. There are no npm dependencies, so `npm install` is not needed. Cryptography uses the built-in Web Crypto API in Node and in the browser.

## Dashboard structure

| Section | What it shows |
|---|---|
| Executive overview | Headline figures, overall position, key findings, services at a glance, what it means, priority timeline, background |
| Hospital comparison | All 29 hospitals: searchable, sortable and filterable by region, neonatal level and return status; a profile for each hospital with the report's notes and items to validate |
| Workforce and capabilities | Unique doctors and appointment types, regions, subspecialty depth, a state tile map with child-population coverage index, nursing constraints, training |
| Services and coverage | Availability of 42 services (with denominators), a hospital × service matrix, neonatal levels and assessment, PICU/HDU, surgery, subspecialty, referrals, admissions, access |
| Strengths and gaps | Strengths, gaps G1–G8, competitor comparison, operating environment |
| Network planning | Provisional hub-and-spoke tiers, regional strengths, resource principles, referral infrastructure, proposed KPIs |
| Priorities and actions | Eight priorities on a 24-month timeline, roadmap phases, decisions requested, 90-day next steps, Group support, hospital tiers |
| Sources and limitations | Report details, how to read the labels, completeness, limitations, counting rules, validation log (searchable), roster cross-check, sources, abbreviations, dashboard notes, security |

Evidence is labelled as in the report: **Finding**, **Interpretation**, **Recommendation (report)** and **To validate**. Notes added by the dashboard are labelled **Dashboard note — not in the report**. The dashboard adds no RAG ratings, thresholds or recommendations of its own. Blank answers ("not provided") are shown separately from "No", and missing denominators are shown as counts without percentages.

## Preview locally

```bash
npm run build:plain
```

```bash
npm run preview:plain
```

This opens an **unencrypted** preview at http://localhost:8081, for editing. It lives in `private/build/` and must never be published. To test the real encrypted site with its sign-in page:

```bash
npm run build
```

```bash
npm run preview
```

Then open http://localhost:8080.

## Password configuration

The build reads the password from the `DASHBOARD_PASSWORD` environment variable, or from a local `.env` file (git-ignored):

```bash
cp .env.example .env
```

Then edit `.env` and set `DASHBOARD_PASSWORD=...`. Alternatively, set it for one PowerShell session only:

```powershell
$env:DASHBOARD_PASSWORD = "your password here"
```

The password is never written to `site/`, never stored in the browser, and `npm run verify` fails if it appears in any published file in any common encoding.

> **Strength matters.** The encrypted page can be downloaded and attacked offline, and a short, patterned password such as a name plus a year is the weakest point. Each guess costs 1,000,000 PBKDF2 rounds, which slows guessing but does not make a guessable password safe. For anything beyond a short internal review, use a passphrase of 4–5 random words (20+ characters), shared through a separate channel.

## Deploy to GitHub Pages

1. Create a GitHub repository. Pages on the free plan requires a public repository. Only the encrypted `site/` folder and the code are public, but a private repository (paid plan) is preferable.
2. From this folder, commit and push:

   ```bash
   git init -b main
   ```

   ```bash
   git add .
   ```

   ```bash
   git status
   ```

   Check that nothing under `private/`, no `.env` and no `.docx`/`.pdf` is listed. Then commit and push:

   ```bash
   git commit -m "Encrypted KPJ paediatric dashboard"
   ```

   ```bash
   git remote add origin https://github.com/<org>/<repo>.git
   ```

   ```bash
   git push -u origin main
   ```

3. In the repository go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Optional but recommended: **Settings → Secrets and variables → Actions → New repository secret** named `DASHBOARD_PASSWORD`. With it, the workflow also confirms that the bundle opens with the password and that the password does not appear in the files.
5. The workflow `.github/workflows/deploy.yml` runs on every push that changes `site/`. It verifies the bundle and publishes it. The site URL is shown in the workflow run and under Settings → Pages.

Run `npm run verify` before every commit. Builds are randomised (new salt and IV each time), so `site/index.html` changes on every build.

## Updating for a future report

1. Edit `private/report-data.js` with the new figures and text. The comments at the top explain the codes (`Y`, `V`, `P`, `N`, `U`, `-` for blank, `null` for no data).
2. Run `npm run check`. If the report's totals legitimately changed, update the expected values in `scripts/check-data.mjs` so the checks match the new report.
3. Run `npm run build:plain` and `npm run preview:plain` to review the changes.
4. Run `npm run build` and `npm run verify`, then commit and push `site/`.

## Changing the password

1. Set the new `DASHBOARD_PASSWORD` locally (in `.env` or your shell) and update the GitHub secret if you use it.
2. Run `npm run build` and `npm run verify`, then commit and push.
3. Tell recipients through a separate channel. Anyone who downloaded the old page can still open that copy with the old password, so change the password and republish if it may have leaked. If report content itself changes, older copies keep the older content.

## How the protection works, and its limits

- The whole dashboard (HTML, styles, code and all report data) is serialised and encrypted with **AES-256-GCM**. The key comes from the password via **PBKDF2-HMAC-SHA-256** (random 16-byte salt, 1,000,000 iterations). Only the sign-in page, the logo and the ciphertext are published.
- The browser decrypts with the Web Crypto API. A wrong password fails the GCM authentication check and shows an accessible error. Nothing is written to cookies or local or session storage. **Lock** clears and reloads the page, and the dashboard also locks after 30 minutes of inactivity.
- This is **shared-password protection, not authentication**. There are no individual accounts, no per-person revocation and no access log. Anyone with the password, or with a copy of the page plus the password, can read it. GitHub Pages has no server-side access control except on GitHub Enterprise Cloud.

### If stronger access control is needed

For named-user access with sign-in, revocation and audit, host the same repository behind an identity-aware service:

- **GitHub Enterprise Cloud: private Pages.** Restricts the site to people with read access to the repository. No change to this project is needed; set the Pages visibility to private.
- **Cloudflare Pages + Cloudflare Access.** Connect the GitHub repository in Cloudflare Pages (build command: none; output directory: `site`). Then add a Cloudflare Access application on the Pages domain that allows only KPJ email addresses or a Microsoft Entra ID group. Every visit then requires a company sign-in, and the shared password becomes a second layer.
- **Azure Static Web Apps + Microsoft Entra ID.** This fits a Microsoft 365 organisation. Deploy `site/` from the GitHub repository with the Azure Static Web Apps GitHub Action, and restrict all routes to an authenticated role in `staticwebapp.config.json`.

Check each provider's current plan limits before choosing.

## Unresolved data issues

These come from the report's own validation log (Appendix C, all 20 items shown in the dashboard), plus the following points noted while building the dashboard:

- The file is named v2.5, but the report's status line reads "Draft v1.12 for validation".
- Table 6.1 calls KPJ Penang's ~4,400 admissions "the highest reported". Section 4.1 lists Ampang Puteri (5,000–5,500) as higher, and Table 3.6 calls Penang "second-highest".
- The count of 18 Level I neonatal units appears to include Taiping MC, whose level was not stated.
- Several service counts (cooling, surfactant, ROP screening, neonatal surgery, echocardiography, neurology clinics, EEG, neonatal transfers) have no stated denominator.
- Admissions are itemised for only 8 of the 19 hospitals that reported them.
- The report assigns hospitals to regions but not to states, so hospital filters work by region only.
