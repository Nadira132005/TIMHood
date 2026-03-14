import { AuditLog, Notification } from './notifications.model';

export const notificationsService = {
  async getOverview() {
    const [notifications, auditLogs] = await Promise.all([
      Notification.countDocuments(),
      AuditLog.countDocuments()
    ]);

    return {
      module: 'notifications',
      status: 'ready',
      totals: { notifications, auditLogs }
    };
  }
};
