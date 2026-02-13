const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function main() {
    // Settings
    await prisma.settings.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            salonName: 'Elite Kuaför',
            currency: 'TRY',
            timezone: 'Europe/Istanbul',
            entryScreenEnabled: true,
            entryPinEnabled: false,
        },
    });

    // Admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    const admin = await prisma.adminUser.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            passwordHash,
            role: 'ADMIN',
        },
    });

    // Employees
    const employees = await Promise.all(
        ['Berke', 'Tevfik', 'Ozan', 'Mustafa'].map((name, i) =>
            prisma.employee.upsert({
                where: { id: `emp-${name.toLowerCase()}` },
                update: {},
                create: {
                    id: `emp-${name.toLowerCase()}`,
                    displayName: name,
                    sortOrder: i,
                    active: true,
                },
            })
        )
    );

    // Service catalog
    const services = [
        { id: 'svc-erkek-sac', name: 'Erkek Saç Kesimi', defaultPrice: 250 },
        { id: 'svc-sac-boyama', name: 'Saç Boyama', defaultPrice: 500 },
        { id: 'svc-sakal', name: 'Sakal Tıraşı', defaultPrice: 150 },
        { id: 'svc-fon', name: 'Fön', defaultPrice: 200 },
        { id: 'svc-keratin', name: 'Keratin Bakımı', defaultPrice: 1500 },
        { id: 'svc-cocuk', name: 'Çocuk Saç Kesimi', defaultPrice: 150 },
        { id: 'svc-agda', name: 'Ağda', defaultPrice: 300 },
        { id: 'svc-cilt', name: 'Cilt Bakımı', defaultPrice: 600 },
    ];

    for (const svc of services) {
        await prisma.serviceCatalog.upsert({
            where: { id: svc.id },
            update: {},
            create: {
                id: svc.id,
                name: svc.name,
                defaultPrice: svc.defaultPrice,
                active: true,
            },
        });
    }

    // Sample service records
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);

    const sampleRecords = [
        { empIdx: 0, svcIdx: 0, date: today, hour: 9 },
        { empIdx: 0, svcIdx: 2, date: today, hour: 10 },
        { empIdx: 0, svcIdx: 1, date: yesterday, hour: 11 },
        { empIdx: 1, svcIdx: 0, date: today, hour: 9 },
        { empIdx: 1, svcIdx: 3, date: today, hour: 14 },
        { empIdx: 1, svcIdx: 4, date: yesterday, hour: 10 },
        { empIdx: 2, svcIdx: 0, date: today, hour: 11 },
        { empIdx: 2, svcIdx: 5, date: twoDaysAgo, hour: 15 },
        { empIdx: 3, svcIdx: 6, date: today, hour: 13 },
        { empIdx: 3, svcIdx: 7, date: yesterday, hour: 16 },
        { empIdx: 3, svcIdx: 0, date: twoDaysAgo, hour: 10 },
        { empIdx: 0, svcIdx: 3, date: twoDaysAgo, hour: 12 },
    ];

    for (const rec of sampleRecords) {
        const emp = employees[rec.empIdx];
        const svc = services[rec.svcIdx];
        const dateTime = new Date(rec.date);
        dateTime.setHours(rec.hour, 0, 0, 0);

        await prisma.serviceRecord.create({
            data: {
                dateTime,
                employeeId: emp.id,
                serviceCatalogId: svc.id,
                quantity: 1,
                unitPrice: svc.defaultPrice,
                discountAmount: 0,
                finalPrice: svc.defaultPrice,
                paymentMethod: 'cash',
                createdSource: 'ADMIN',
            },
        });
    }

    // Sample payouts
    const samplePayouts = [
        { empIdx: 0, amount: 500, type: 'advance', date: yesterday },
        { empIdx: 1, amount: 300, type: 'advance', date: today },
        { empIdx: 2, amount: 200, type: 'expense', date: twoDaysAgo },
        { empIdx: 3, amount: 1000, type: 'advance', date: yesterday },
    ];

    for (const p of samplePayouts) {
        const emp = employees[p.empIdx];
        const dateTime = new Date(p.date);
        dateTime.setHours(12, 0, 0, 0);

        await prisma.payout.create({
            data: {
                dateTime,
                employeeId: emp.id,
                amount: p.amount,
                type: p.type,
                createdByAdminId: admin.id,
            },
        });
    }

    // Audit log
    await prisma.auditLog.create({
        data: {
            actorType: 'ADMIN',
            actorId: admin.id,
            action: 'SEED',
            entityType: 'SYSTEM',
            entityId: null,
            afterJson: JSON.stringify({ message: 'Database seeded with sample data' }),
        },
    });

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
