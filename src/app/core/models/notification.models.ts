export type NotificationType = 'MESSAGE' | 'RESERVATION' | 'AVIS' | 'SYSTEM';

export interface Notification {
  notificationId: string;

  userId: string;

  type: NotificationType;

  message: string;

  readStatus: boolean;

  createdAt: string;

  readAt?: string | null;

  referenceId?: string | null;
}
