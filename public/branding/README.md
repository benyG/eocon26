# Branding assets

Drop the logos here so they appear on generated documents (PNG/JPEG only — **not** SVG/WebP; pdfkit limitation). Recommended ~600×250 px.

- **`examboot-logo.png`** — **Services Examboot Inc.** → financial documents (proforma, invoice).
- **`eyesopen-logo.png`** — **EyesOpen Association** → partnership documents (contract, letter of intent, exclusivity clause, brand assets request, communication plan, pricing sheet).

The invoice generator (`app/api/admin/budget/[id]/invoice`) resolves the logo in this order:
1. The `examboot_logo_url` setting (a remote URL), if set in Admin → Settings → Facturation.
2. `public/branding/examboot-logo.png` (then `.jpg`, `.jpeg`).
3. A text fallback (the legal name) if no image is found.

Other billing details (legal name, address, tax id, email, phone) are editable in
**Admin → Settings → Facturation**.
