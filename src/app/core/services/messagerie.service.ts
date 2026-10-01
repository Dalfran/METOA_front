import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Client,
  IMessage,
  StompSubscription,
} from '@stomp/stompjs';

import {
  BehaviorSubject,
  Observable,
  Subject,
} from 'rxjs';

import { UserResponse } from './AuthService';

import {
  MessageDeleted,
  MessageUpdated,
} from '../models/messagerie.models';

import {
  Notification,
} from '../models/notification.models';
import { UserService } from './user.service';


// ==========================================================
// MESSAGE
// ==========================================================

export interface Message {

  messageId: string;

  conversationId: string;

  senderId: string;

  receiverId: string;

  content?: string;

  type:
    | 'TEXT'
    | 'IMAGE'
    | 'FILE'
    | 'AUDIO';

  status:
    | 'ENVOYE'
    | 'DELIVRE'
    | 'LU';

  timestamp: string;

  attachment?: Attachment;

  /**
   * Indique si le message a été modifié.
   */
  edited?: boolean;

  /**
   * Indique si le message a été supprimé.
   */
  deleted?: boolean;
}


// ==========================================================
// PIÈCE JOINTE
// ==========================================================

export interface Attachment {

  fileUrl: string;

  fileName?: string;

  fileType?: string;

  fileSize?: number;
}


// ==========================================================
// INBOX
// ==========================================================

export interface Inbox {

  conversationId: string;

  otherUserId: string;

  otherUsername: string;

  otherUserPhoto?: string;

  lastMessage?: string;

  lastMessageDate?: string;

  unreadCount: number;
}


// ==========================================================
// PAGINATION
// ==========================================================

export interface PageResponse<T> {

  content: T[];

  page: number;

  size: number;

  number: number;

  totalElements: number;

  totalPages: number;
}


// ==========================================================
// TYPING
// ==========================================================

export interface TypingEvent {

  senderId: string;

  receiverId: string;

  conversationId?: string;

  typing: boolean;
}


// ==========================================================
// STATUT MESSAGE
// ==========================================================

export interface MessageStatusUpdate {

  messageId: string;

  conversationId: string;

  status:
    | 'ENVOYE'
    | 'DELIVRE'
    | 'LU';
}


// ==========================================================
// PRÉSENCE
// ==========================================================

export interface OnlineStatus {

  userId: string;

  online: boolean;
}


// ==========================================================
// SERVICE
// ==========================================================

@Injectable({
  providedIn: 'root',
})
export class MessagerieService {
  // ========================================================
  // CONFIGURATION
  // ========================================================

  private readonly apiUrl = 'http://localhost:8089/api/v1';

  private readonly socketUrl = 'ws://localhost:8089/chat/websocket';



  // ========================================================
  // CLIENT STOMP
  // ========================================================

  private client?: Client;

  // ========================================================
  // SUBJECTS
  // ========================================================

  /**
   * Nouveaux messages.
   */
  private messageSubject = new BehaviorSubject<Message | null>(null);

  /**
   * Mise à jour inbox.
   */
  private inboxSubject = new BehaviorSubject<Inbox | null>(null);

  /**
   * Mise à jour statut message.
   */
  private messageStatusSubject = new BehaviorSubject<MessageStatusUpdate | null>(null);

  /**
   * Typing.
   */
  private typingSubject = new BehaviorSubject<TypingEvent | null>(null);

  /**
   * Message modifié.
   */
  private messageUpdatedSubject = new BehaviorSubject<MessageUpdated | null>(null);

  /**
   * Message supprimé.
   */
  private messageDeletedSubject = new BehaviorSubject<MessageDeleted | null>(null);

  /**
   * Notification reçue en temps réel.
   */
  private notificationSubject = new BehaviorSubject<Notification | null>(null);

  /**
   * Présence utilisateur.
   */
  private onlineStatusSubject = new BehaviorSubject<OnlineStatus | null>(null);

  /**
   * État connexion WebSocket.
   */
  private connectedSubject = new BehaviorSubject<boolean>(false);

  /**
   * Demande de rafraîchissement des notifications.
   *
   * Émis lorsqu'une conversation vient d'être marquée
   * comme lue.
   */
  private notificationsRefreshSubject = new Subject<void>();

  // ========================================================
  // SUBSCRIPTIONS STOMP
  // ========================================================

  private subscriptions: StompSubscription[] = [];

  // ========================================================
  // CONSTRUCTEUR
  // ========================================================

  constructor(
    private readonly ngZone: NgZone,
    private readonly http: HttpClient,
    private readonly userService: UserService,
  ) {}

  // ========================================================
  // CONNEXION
  // ========================================================

  connect(): void {
    if (this.client?.active) {
      return;
    }

    const token = localStorage.getItem('metoa_token');

    if (!token) {
      console.error('❌ Aucun JWT disponible pour WebSocket.');

      return;
    }

    this.client = new Client({
      webSocketFactory: () => new WebSocket(this.socketUrl),

      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      reconnectDelay: 5000,

      heartbeatIncoming: 10000,

      heartbeatOutgoing: 10000,

      debug: (message: string) => {
        console.log('[STOMP]', message);
      },
    });

    // ======================================================
    // CONNEXION RÉUSSIE
    // ======================================================

    this.client.onConnect = () => {
      console.log('🟢 WebSocket METOA connecté');

      this.ngZone.run(() => {
        this.connectedSubject.next(true);

        this.subscribeToMessages();

        this.subscribeToInbox();

        this.subscribeToMessageStatus();

        this.subscribeToTyping();

        this.subscribeToPresence();

        this.subscribeToMessageUpdated();

        this.subscribeToMessageDeleted();

        this.subscribeToNotifications();
      });
    };

    // ======================================================
    // DÉCONNEXION
    // ======================================================

    this.client.onDisconnect = () => {
      console.log('🔴 WebSocket METOA déconnecté');

      this.ngZone.run(() => {
        this.connectedSubject.next(false);
      });
    };

    // ======================================================
    // ERREUR STOMP
    // ======================================================

    this.client.onStompError = (frame) => {
      console.error('❌ Erreur STOMP :', frame.headers['message']);

      console.error(frame.body);
    };

    // ======================================================
    // ERREUR WEBSOCKET
    // ======================================================

    this.client.onWebSocketError = (error) => {
      console.error('❌ Erreur WebSocket :', error);
    };

    this.client.activate();
  }

  // ========================================================
  // DÉCONNEXION
  // ========================================================

  disconnect(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());

    this.subscriptions = [];

    if (this.client) {
      this.client.deactivate();

      this.client = undefined;
    }

    this.connectedSubject.next(false);
  }

  // ========================================================
  // NOUVEAU MESSAGE
  // ========================================================

  private subscribeToMessages(): void {
    if (!this.client) {
      return;
    }

    const subscription = this.client.subscribe(
      '/user/queue/messages',

      (message: IMessage) => {
        try {
          const data: Message = JSON.parse(message.body);

          console.log('📨 Nouveau message :', data);

          this.ngZone.run(() => {
            this.messageSubject.next(data);
          });
        } catch (error) {
          console.error('❌ Erreur lecture message :', error);
        }
      },
    );

    this.subscriptions.push(subscription);
  }

  // ========================================================
  // INBOX
  // ========================================================

  private subscribeToInbox(): void {
    if (!this.client) {
      return;
    }

    const subscription = this.client.subscribe(
      '/user/queue/inbox',

      (message: IMessage) => {
        try {
          const data: Inbox = JSON.parse(message.body);

          console.log('📥 Mise à jour inbox :', data);

          this.ngZone.run(() => {
            this.inboxSubject.next(data);
          });
        } catch (error) {
          console.error('❌ Erreur lecture inbox :', error);
        }
      },
    );

    this.subscriptions.push(subscription);
  }

  // ========================================================
  // STATUT MESSAGE
  // ========================================================

  private subscribeToMessageStatus(): void {
    if (!this.client) {
      return;
    }

    const subscription = this.client.subscribe(
      '/user/queue/message-status',

      (message: IMessage) => {
        try {
          const data: MessageStatusUpdate = JSON.parse(message.body);

          console.log('✓ Statut message :', data);

          this.ngZone.run(() => {
            this.messageStatusSubject.next(data);
          });
        } catch (error) {
          console.error('❌ Erreur statut message :', error);
        }
      },
    );

    this.subscriptions.push(subscription);
  }

  // ========================================================
  // TYPING
  // ========================================================

  private subscribeToTyping(): void {
    if (!this.client) {
      return;
    }

    const subscription = this.client.subscribe(
      '/user/queue/typing',

      (message: IMessage) => {
        try {
          const data: TypingEvent = JSON.parse(message.body);

          this.ngZone.run(() => {
            this.typingSubject.next(data);
          });
        } catch (error) {
          console.error('❌ Erreur typing :', error);
        }
      },
    );

    this.subscriptions.push(subscription);
  }

  // ========================================================
  // PRÉSENCE
  // ========================================================

  private subscribeToPresence(): void {
    if (!this.client) {
      return;
    }

    const subscription = this.client.subscribe(
      '/topic/presence',

      (message: IMessage) => {
        try {
          const data: OnlineStatus = JSON.parse(message.body);

          console.log('🟢 PRESENCE REÇUE :', data);

          this.ngZone.run(() => {
            this.onlineStatusSubject.next(data);
          });
        } catch (error) {
          console.error('❌ Erreur lecture présence :', error);
        }
      },
    );

    this.subscriptions.push(subscription);
  }

  // ========================================================
  // MESSAGE MODIFIÉ
  // ========================================================

  private subscribeToMessageUpdated(): void {
    if (!this.client) {
      return;
    }

    const subscription = this.client.subscribe(
      '/user/queue/message-updated',

      (message: IMessage) => {
        try {
          const data: MessageUpdated = JSON.parse(message.body);

          console.log('✏️ MESSAGE MODIFIÉ REÇU :', data);

          this.ngZone.run(() => {
            this.messageUpdatedSubject.next(data);
          });
        } catch (error) {
          console.error('❌ Erreur lecture message modifié :', error);
        }
      },
    );

    this.subscriptions.push(subscription);
  }

  // ========================================================
  // MESSAGE SUPPRIMÉ
  // ========================================================

  private subscribeToMessageDeleted(): void {
    if (!this.client) {
      return;
    }

    const subscription = this.client.subscribe(
      '/user/queue/message-deleted',

      (message: IMessage) => {
        try {
          const data: MessageDeleted = JSON.parse(message.body);

          console.log('🗑️ MESSAGE SUPPRIMÉ REÇU :', data);

          this.ngZone.run(() => {
            this.messageDeletedSubject.next(data);
          });
        } catch (error) {
          console.error('❌ Erreur lecture message supprimé :', error);
        }
      },
    );

    this.subscriptions.push(subscription);
  }

  // ========================================================
  // NOTIFICATIONS
  // ========================================================

  private subscribeToNotifications(): void {
    if (!this.client) {
      return;
    }

    const subscription = this.client.subscribe(
      '/user/queue/notifications',

      (message: IMessage) => {
        try {
          const data: Notification = JSON.parse(message.body);

          console.log('🔔 Nouvelle notification :', data);

          this.ngZone.run(() => {
            this.notificationSubject.next(data);
          });
        } catch (error) {
          console.error('❌ Erreur lecture notification :', error);
        }
      },
    );

    this.subscriptions.push(subscription);
  }

  // ========================================================
  // OBSERVABLES
  // ========================================================

  getMessages$(): Observable<Message | null> {
    return this.messageSubject.asObservable();
  }

  getInboxUpdates$(): Observable<Inbox | null> {
    return this.inboxSubject.asObservable();
  }

  getMessageStatus$(): Observable<MessageStatusUpdate | null> {
    return this.messageStatusSubject.asObservable();
  }

  getTyping$(): Observable<TypingEvent | null> {
    return this.typingSubject.asObservable();
  }

  getMessageUpdated$(): Observable<MessageUpdated | null> {
    return this.messageUpdatedSubject.asObservable();
  }

  getMessageDeleted$(): Observable<MessageDeleted | null> {
    return this.messageDeletedSubject.asObservable();
  }

  getNotifications$(): Observable<Notification | null> {
    return this.notificationSubject.asObservable();
  }

  getNotificationsRefresh$(): Observable<void> {
    return this.notificationsRefreshSubject.asObservable();
  }

  getOnlineStatus$(): Observable<OnlineStatus | null> {
    return this.onlineStatusSubject.asObservable();
  }

  isConnected$(): Observable<boolean> {
    return this.connectedSubject.asObservable();
  }

  // ========================================================
  // UPLOAD PIÈCE JOINTE
  // ========================================================

  uploadFile(file: File): Observable<Attachment> {
    const formData = new FormData();

    formData.append('file', file);

    return this.http.post<Attachment>(`${this.apiUrl}/files/upload`, formData);
  }



  // ========================================================
  // ENVOI MESSAGE
  // ========================================================

  sendMessage(
    receiverId: string,
    content: string,
    conversationId?: string,
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' = 'TEXT',
    attachment?: Attachment,
  ): void {
    if (!this.client?.connected) {
      console.error('❌ WebSocket non connecté.');

      return;
    }

    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      console.error('❌ Utilisateur courant introuvable.');

      return;
    }

    const payload = {
      senderId: currentUser.idUser,

      receiverId,

      content: content || undefined,

      conversationId,

      type,

      attachment,
    };

    console.log('📤 Envoi message :', payload);

    this.client.publish({
      destination: '/app/chat.send',

      body: JSON.stringify(payload),
    });
  }

  // ========================================================
  // ACCUSÉ DE LIVRAISON
  // ========================================================

  acknowledgeDelivered(messageId: string): void {
    if (!this.client?.connected) {
      return;
    }

    this.client.publish({
      destination: '/app/chat.ack.delivered',

      body: JSON.stringify({
        messageId,
      }),
    });
  }

  // ========================================================
  // TYPING
  // ========================================================

  sendTyping(receiverId: string, conversationId: string | undefined, typing: boolean): void {
    if (!this.client?.connected) {
      console.warn('⌨️ Impossible d’envoyer typing : WebSocket non connecté.');

      return;
    }

    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      console.warn('⌨️ Impossible d’envoyer typing : utilisateur introuvable.');

      return;
    }

    const payload = {
      senderId: currentUser.idUser,

      receiverId,

      conversationId,

      typing,
    };

    console.log(typing ? '📤 ENVOI TYPING TRUE :' : '📤 ENVOI TYPING FALSE :', payload);

    this.client.publish({
      destination: '/app/chat.typing',

      body: JSON.stringify(payload),
    });
  }

  // ========================================================
  // API REST - INBOX
  // ========================================================

  async getInbox(userId: string, page = 0, size = 20): Promise<PageResponse<Inbox>> {
    const token = localStorage.getItem('metoa_token');

    const response = await fetch(
      `${this.apiUrl}/inbox/${userId}?page=${page}&size=${size}`,

      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Erreur inbox : ${response.status}`);
    }

    return response.json();
  }

  // ========================================================
  // API REST - MESSAGES
  // ========================================================

  async getMessages(conversationId: string, page = 0, size = 30): Promise<PageResponse<Message>> {
    const token = localStorage.getItem('metoa_token');

    const response = await fetch(
      `${this.apiUrl}/messages/conversation/${conversationId}?page=${page}&size=${size}`,

      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Erreur messages : ${response.status}`);
    }

    return response.json();
  }

  // ========================================================
  // UTILISATEUR COURANT
  // ========================================================

  private getCurrentUser(): UserResponse | null {
    const raw = localStorage.getItem('metoa_user');

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // ========================================================
  // MARQUER CONVERSATION COMME LUE
  // ========================================================

  async markConversationAsRead(
    conversationId: string,
  ): Promise<void> {

    const token =
      localStorage.getItem(
        'metoa_token',
      );

    if (!token) {
      return;
    }

    if (!conversationId) {
      return;
    }

    const response =
      await fetch(

        `${this.apiUrl}/messages/conversation/${conversationId}/read`,

        {
          method: 'PATCH',

          headers: {
            Authorization:
              `Bearer ${token}`,

            Accept:
              'application/json',
          },
        },
      );

    if (!response.ok) {

      throw new Error(
        `Erreur lecture conversation : ${response.status}`,
      );
    }

    // ------------------------------------------------------
    // Le backend a maintenant marqué :
    // - les messages comme LU
    // - les notifications MESSAGE correspondantes comme lues
    // ------------------------------------------------------

    console.log(
      '✅ Conversation et notifications marquées comme lues :',
      conversationId,
    );

    // ------------------------------------------------------
    // Demander au NotificationsComponent de recharger
    // son compteur et sa liste.
    // ------------------------------------------------------

    this.notificationsRefreshSubject.next();
  }
  // ========================================================
  // PRÉSENCE UTILISATEUR
  // ========================================================

  async getUserPresence(userId: string): Promise<OnlineStatus> {
    const token = localStorage.getItem('metoa_token');

    if (!token) {
      throw new Error('Token JWT introuvable.');
    }

    const response = await fetch(
      `${this.apiUrl}/presence/${userId}`,

      {
        method: 'GET',

        headers: {
          Authorization: `Bearer ${token}`,

          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Erreur présence HTTP ${response.status}`);
    }

    return response.json();
  }

  // ========================================================
  // MODIFIER MESSAGE
  // ========================================================

  modifierMessage(messageId: string, content: string): boolean {
    if (!this.client?.connected) {
      console.error('❌ WebSocket non connecté.');

      return false;
    }

    if (!messageId) {
      console.error('❌ ID du message manquant.');

      return false;
    }

    const contenu = content.trim();

    if (!contenu) {
      console.error('❌ Le contenu du message est vide.');

      return false;
    }

    const payload = {
      messageId,

      content: contenu,
    };

    console.log('✏️ Modification message :', payload);

    this.client.publish({
      destination: '/app/chat.edit',

      body: JSON.stringify(payload),
    });

    return true;
  }

  // ========================================================
  // SUPPRIMER MESSAGE
  // ========================================================

  supprimerMessage(messageId: string): boolean {
    if (!this.client?.connected) {
      console.error('❌ WebSocket non connecté.');

      return false;
    }

    if (!messageId) {
      console.error('❌ ID du message manquant.');

      return false;
    }

    const payload = {
      messageId,
    };

    console.log('🗑️ Suppression message :', payload);

    this.client.publish({
      destination: '/app/chat.delete',

      body: JSON.stringify(payload),
    });

    return true;
  }

  // ========================================================
  // API REST - NOTIFICATIONS
  // ========================================================

  async getNotifications(userId: string): Promise<Notification[]> {
    const token = localStorage.getItem('metoa_token');

    if (!token) {
      throw new Error('Token JWT introuvable.');
    }

    const response = await fetch(`${this.apiUrl}/notifications/${userId}`, {
      method: 'GET',

      headers: {
        Authorization: `Bearer ${token}`,

        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur notifications HTTP ${response.status}`);
    }

    return response.json();
  }

  async countUnreadNotifications(userId: string): Promise<number> {
    const token = localStorage.getItem('metoa_token');

    if (!token) {
      throw new Error('Token JWT introuvable.');
    }

    const response = await fetch(`${this.apiUrl}/notifications/${userId}/unread-count`, {
      method: 'GET',

      headers: {
        Authorization: `Bearer ${token}`,

        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur compteur notifications HTTP ${response.status}`);
    }

    return response.json();
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<Notification> {
    const token = localStorage.getItem('metoa_token');

    if (!token) {
      throw new Error('Token JWT introuvable.');
    }

    const response = await fetch(
      `${this.apiUrl}/notifications/${notificationId}/read?userId=${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',

        headers: {
          Authorization: `Bearer ${token}`,

          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Erreur lecture notification HTTP ${response.status}`);
    }

    return response.json();
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const token = localStorage.getItem('metoa_token');

    if (!token) {
      throw new Error('Token JWT introuvable.');
    }

    const response = await fetch(`${this.apiUrl}/notifications/${userId}/read-all`, {
      method: 'PATCH',

      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur lecture notifications HTTP ${response.status}`);
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const token = localStorage.getItem('metoa_token');

    if (!token) {
      throw new Error('Token JWT introuvable.');
    }

    const response = await fetch(
      `${this.apiUrl}/notifications/${notificationId}?userId=${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',

        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Erreur suppression notification HTTP ${response.status}`);
    }
  }

  getPhotoUtilisateur(
    photoUrl: string | null | undefined
  ): string | null {
    return this.userService.getPhotoUrl(photoUrl);
  }

}
