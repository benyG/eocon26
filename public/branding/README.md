# Branding assets

Drop the **Services Examboot Inc.** logo here so it appears on sponsor proformas & invoices:

- File name: `examboot-logo.png` (or `.jpg` / `.jpeg` — **not** SVG/WebP, pdfkit only embeds PNG/JPEG)
- Recommended: ~600×250 px, transparent or white background.

The invoice generator (`app/api/admin/budget/[id]/invoice`) resolves the logo in this order:
1. The `examboot_logo_url` setting (a remote URL), if set in Admin → Settings → Facturation.
2. `public/branding/examboot-logo.png` (then `.jpg`, `.jpeg`).
3. A text fallback (the legal name) if no image is found.

Other billing details (legal name, address, tax id, email, phone) are editable in
**Admin → Settings → Facturation**.
