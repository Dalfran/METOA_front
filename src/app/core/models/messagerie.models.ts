export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content?: string;

  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO';

  status: 'ENVOYE' | 'DELIVRE' | 'LU';

  timestamp: string;

  attachment?: Attachment;

  edited?: boolean;

  deleted?: boolean;
}

export interface Attachment {
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export interface Inbox {
  conversationId: string;
  otherUserId: string;
  otherUsername: string;
  otherUserPhoto?: string;

  lastMessage?: string;
  lastMessageDate?: string;

  unreadCount: number;
}

export interface TypingEvent {
  senderId: string;
  receiverId: string;
  conversationId?: string;
  typing: boolean;
}

export interface MessageStatusUpdate {
  messageId: string;
  conversationId: string;

  status: 'ENVOYE' | 'DELIVRE' | 'LU';
}

export interface OnlineStatus {
  userId: string;
  online: boolean;
}

export interface PageResponse<T> {
  content: T[];

  page: number;
  size: number;

  number: number;

  totalElements: number;
  totalPages: number;
}
export interface MessageUpdated {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  edited: boolean;
  deleted: boolean;
}

export interface MessageDeleted {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  deleted: boolean;
}
