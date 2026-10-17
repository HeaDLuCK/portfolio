# Zakaria Missou — portfolio

A responsive Next.js portfolio for Vercel. Public pages (`/`, `/about`, `/projects`, `/contact`, `/thanks`) are prerendered at build time and read `src/data/portfolio.json`. MongoDB is not needed to browse the portfolio or send a message. Old language/profile URLs redirect to the new pages. The public portfolio supports English, French, and German. The header switcher preserves the current page. English uses the root URLs; French and German use /fr and /de. Language pages are prerendered, and contact feedback stays in the selected language. Original database translations remain in the snapshot.

## Run

```sh
npm install
npm run dev
npm run build
npm run start
```

## Deploy to Vercel

Use the Next.js framework preset and `npm run build`. Commit package.json and package-lock.json together. Next.js is pinned to the patched 15.5.28 release. No database or email environment variables are required for the default setup.

## Contact email — default setup

The form sends a background JSON request to the portfolio's `/api/contact` endpoint, which forwards it to FormSubmit's AJAX endpoint and delivers to **missouzakaria03@gmail.com**. Visitors stay on the portfolio and see translated sending, success, or error feedback inline. It uses browser validation, a honeypot, a 20-second timeout, and duplicate-submit protection. Visitor messages pass through FormSubmit. HTTP 200 alone is not treated as success: the provider must explicitly accept the submission. Activation-required responses show an error with a direct-email alternative and preserve the visitor's message. The `/thanks` page remains available but is no longer part of submission.

A setup submission was made and FormSubmit confirmed an activation email was sent. Open that email and click **Activate Form**. Check Spam if necessary. The service may require another verification on the deployed domain; if prompted, submit once there and confirm the email. Real inbox delivery cannot be verified without the recipient's confirmation. No API key, account registration, or sending domain is required for this default flow.

## Optional Resend mode

If both `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` are set, `/api/contact` uses Resend instead of FormSubmit, still without leaving the website. Add them in Vercel environment settings or `.env.local`, then rebuild/redeploy. The sender must be on a Resend-verified domain. Copy variable names from `.env.example`; never commit keys.

The Resend endpoint awaits the provider response, validates input, limits payload size, and checks a honeypot. It returns success only after Resend accepts the message. Recipient is fixed to missouzakaria03@gmail.com, and Reply-To is the visitor's address. Do not use `output: 'export'`: both providers use the Vercel serverless contact endpoint. Public portfolio pages remain prerendered.

## Preserved MongoDB content

The public snapshot was read from local `portfolio_db` for profile token `missou`: 6 sections, 20 skills, 4 education entries, 1 experience entry, 4 features, and 3 social links. There were no project records. No private user fields or received contact messages were exported. The database was not changed.

Edit `src/data/portfolio.json` to update content, or manually refresh from local MongoDB:

```sh
node scripts/export-portfolio.cjs
```

The exporter defaults to `mongodb://127.0.0.1:27017/portfolio_db`, or uses `MONGODB_URI` from the process environment. It does not run during deployment. Review the snapshot before committing. Original database-backed admin/API code is retained for recovery, but is unused by the public site; admin edits do not change the snapshot. No MongoDB credentials are needed on Vercel.



