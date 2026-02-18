# Improvements Proposal

> [!NOTE]
> These are suggested enhancements for future development. Do not implement these without reviewing priorities.

## 1. Quick Wins (Low Effort, High Impact)

| Improvement | Why it helps | Effort | Risk | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Server-side Pagination** | Tables (Records, Payouts) currently load all data. Will become slow over time. | S | Low | None |
| **Export to Excel** | CSV export is present but basic. Excel with formatting is friendlier for accountants. | S | Low | `exceljs` |
| **Toast Notifications (Global)** | Centralize toast logic in a context provider to avoid prop drilling and duplicate state. | S | Low | None |
| **Form Auto-Reset** | After "Add Another", keep the last selected Service but reset quantity/price? Configurable preference. | S | Low | None |

## 2. Quality of Life (Salon Owner & Staff)

| Improvement | Why it helps | Effort | Risk | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Staff Performance Chart** | Visual graph of earnings vs. payouts over time. | M | Low | `recharts` |
| **Dark Mode Toggle** | Better for low-light salon environments. | M | Low | Tailwind |
| **Mobile App (PWA)** | Add `manifest.json` and service worker for "Add to Home Screen" experience. | M | Low | None |
| **Avatar Uploads** | Allow uploading real photos for employees instead of initials. | M | Low | S3/Blob Storage |

## 3. Reporting & Operations

| Improvement | Why it helps | Effort | Risk | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Daily Email Report** | Send summary PDF/Email to owner at closing time automatically. | M | Med | Resend/SendGrid + Cron |
| **Role-Based Access (RBAC)** | If you add "Manager" role who can see reports but not delete data. | L | Med | Auth Logic |
| **Audit Log UI** | Better filtering and search for the audit log page. | M | Low | None |
| **Database Backups** | Automated daily dumps to external storage (S3). | M | High | cron, pg_dump |

## 4. Technical Debt & Infrastructure

| Improvement | Why it helps | Effort | Risk | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **E2E Testing** | Playwright tests for critical flows (Entry -> Dashboard). | L | Low | Playwright |
| **Strict Type Checking** | Enable `strict: true` in `tsconfig` and fix all `any` usages. | L | Med | TS |
| **Rate Limiting (Redis)** | Move from memory-based rate limiting to Redis for multi-instance support. | M | Low | Redis (Upstash) |
