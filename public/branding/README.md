# Branding assets

Drop the logo here so it appears on every generated document (PNG/JPEG only — **not** SVG/WebP; pdfkit limitation). Recommended ~600×250 px.

- **`examboot-logo.png`** — **Services Examboot Inc.**, the single issuing entity that organizes EOCON, concludes partnerships and bills. Used on all documents: pricing sheet, letter of intent, proforma, partnership agreement, exclusivity clause, invoice, brand assets request, communication plan.

The invoice generator (`app/api/admin/budget/[id]/invoice`) resolves the logo in this order:
1. The `examboot_logo_url` setting (a remote URL), if set in Admin → Settings → Facturation.
2. `public/branding/examboot-logo.png` (then `.jpg`, `.jpeg`).
3. A text fallback (the legal name) if no image is found.

Other billing details (legal name, address, tax id, email, phone) are editable in
**Admin → Settings → Facturation**.
