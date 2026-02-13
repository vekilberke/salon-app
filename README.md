# Salon Management System

A secure, modern web application for salon operations, featuring an Admin Panel and a Kiosk Entry Screen.

## Features
- **Admin Panel**: Employee management, service catalog, financial tracking, and reports.
- **Entry Screen**: simplified touch interface for staff to log services.
- **Real-time Updates**: Dashboard refreshes instantly when new records are added.
- **Secure**: Role-based access control, PIN verification, and rate limiting.

## Deployment Notes

### Environment Variables
**Required** in production:
```env
# Database Connection (e.g. Postgres/Neon/Supabase)
DATABASE_URL="postgresql://user:password@host:port/database"

# Security Secrets (Generate using 'openssl rand -base64 32')
NEXTAUTH_SECRET="your-secure-random-string"

# Admin Bootstrap (Set these to auto-create the first admin user)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-strong-password"
```

### Initial Setup
1.  **Clone & Install**
    ```bash
    git clone <repo-url>
    npm install
    ```
2.  **Database & Bootstrap**
    Run the seed script to initialize settings and the first admin user.
    ```bash
    # Ensure DATABASE_URL and ADMIN_ credentials are set in .env
    npx prisma db push
    npx prisma db seed
    ```
    *Note: The seed script is idempotent. It will create the admin user if missing, but won't overwrite existing data.*

### Production Build
```bash
npm run build
npm start
```

## Security & Architecture
- **Auth**: NextAuth.js with Credentials provider.
- **RBAC**: Admin-only routes are protected via Middleware and API checks.
- **Rate Limiting**: PIN verification and Admin Login are protected against brute-force.
- **Audit Logs**: Critical actions (CREATE, DELETE, UPDATE) are logged.
