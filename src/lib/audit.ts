import { prisma } from '@/lib/prisma';

export async function createAuditLog(params: {
    actorType: 'ADMIN' | 'ENTRY_SCREEN';
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    beforeJson?: any;
    afterJson?: any;
}) {
    await prisma.auditLog.create({
        data: {
            actorType: params.actorType,
            actorId: params.actorId || null,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId || null,
            beforeJson: params.beforeJson ? JSON.stringify(params.beforeJson) : null,
            afterJson: params.afterJson ? JSON.stringify(params.afterJson) : null,
        },
    });
}
