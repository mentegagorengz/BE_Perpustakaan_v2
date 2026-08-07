export const AUDIT_LOG_EVENT = 'audit.log';

export type AuditAction =
  | 'LOGIN'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ACCESS_PAGE';
export type AuditStatus = 'SUCCESS' | 'FAILED';

export interface AuditLogEvent {
  action: AuditAction;
  module: string;
  details: string;
  status: AuditStatus;
  ipAddress?: string;
  deviceInfo?: string;
  userId?: number;
}

export function determineAuditAction(method: string, url: string): AuditAction {
  if (url.includes('auth/login')) return 'LOGIN';
  if (method === 'POST' || method === 'PUT') return 'CREATE';
  if (method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  return 'ACCESS_PAGE';
}
