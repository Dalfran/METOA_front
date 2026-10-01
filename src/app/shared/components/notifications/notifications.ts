import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';

import {
  CommonModule,
} from '@angular/common';

import {
  Subscription,
} from 'rxjs';

import {
  MessagerieService,
} from '../../../core/services/messagerie.service';

import {
  Notification,
} from '../../../core/models/notification.models';


@Component({
  selector: 'app-notifications',
  standalone: true,

  imports: [CommonModule],

  templateUrl: './notifications.html',

  styleUrl: './notifications.css',
})
export class NotificationsComponent implements OnInit, OnDestroy {
  // ========================================================
  // DONNÉES
  // ========================================================

  notifications: Notification[] = [];

  unreadCount = 0;

  // ========================================================
  // ÉTAT DU PANNEAU
  // ========================================================

  panneauOuvert = false;

  // ========================================================
  // CHARGEMENT
  // ========================================================

  chargement = false;

  // ========================================================
  // ERREUR
  // ========================================================

  erreur: string | null = null;

  // ========================================================
  // SUBSCRIPTIONS
  // ========================================================

  private subscriptions = new Subscription();

  // ========================================================
  // CONSTRUCTEUR
  // ========================================================

  constructor(
    private readonly messagerieService: MessagerieService,

    private readonly cdr: ChangeDetectorRef,
  ) {}

  // ========================================================
  // INITIALISATION
  // ========================================================

  ngOnInit(): void {
    console.log('🔔 NotificationsComponent initialisé');

    const user = this.getCurrentUser();

    if (!user?.idUser) {
      console.warn('⚠️ Impossible de charger les notifications : utilisateur introuvable.');

      return;
    }

    this.chargerNotifications(user.idUser);

    this.ecouterNotifications();
  }

  // ========================================================
  // DESTRUCTION
  // ========================================================

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ========================================================
  // CHARGEMENT NOTIFICATIONS
  // ========================================================

  async chargerNotifications(userId: string): Promise<void> {
    try {
      this.chargement = true;

      this.erreur = null;

      const notifications = await this.messagerieService.getNotifications(userId);

      this.notifications = notifications ?? [];

      this.calculerNombreNonLues();
    } catch (error) {
      console.error('❌ Erreur chargement notifications :', error);

      this.erreur = 'Impossible de charger les notifications.';
    } finally {
      this.chargement = false;

      this.cdr.detectChanges();
    }
  }

  // ========================================================
  // ÉCOUTE TEMPS RÉEL
  // ========================================================

  private ecouterNotifications(): void {
    console.log('👂 NotificationsComponent : écoute des événements activée');

    // ------------------------------------------------------
    // NOUVELLES NOTIFICATIONS
    // ------------------------------------------------------

    this.subscriptions.add(
      this.messagerieService.getNotifications$().subscribe((notification) => {
        if (!notification) {
          return;
        }

        console.log('🔔 Notification reçue dans le composant :', notification);

        this.ajouterNotification(notification);
      }),
    );

    // ------------------------------------------------------
    // NOTIFICATIONS MARQUÉES COMME LUES
    // ------------------------------------------------------

    this.subscriptions.add(
      this.messagerieService.getNotificationsRefresh$().subscribe(async (conversationId) => {
        console.log(
          '🔄 Rafraîchissement notifications demandé pour conversation :',
          conversationId,
        );

        const user = this.getCurrentUser();

        if (!user?.idUser) {
          console.warn('⚠️ Impossible de rafraîchir les notifications : utilisateur introuvable.');

          return;
        }

        await this.chargerNotifications(user.idUser);

        console.log('✅ Notifications rafraîchies. Non lues :', this.unreadCount);
      }),
    );
  }

  // ========================================================
  // AJOUT NOTIFICATION TEMPS RÉEL
  // ========================================================

  private ajouterNotification(notification: Notification): void {
    /*
     * Évite les doublons.
     */
    const existe = this.notifications.some(
      (item) => item.notificationId === notification.notificationId,
    );

    if (existe) {
      return;
    }

    /*
     * Nouvelle notification en tête.
     */
    this.notifications = [notification, ...this.notifications];

    /*
     * Limite locale pour éviter
     * une liste infinie.
     */
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this.calculerNombreNonLues();

    this.cdr.detectChanges();
  }

  // ========================================================
  // COMPTE NON LUES
  // ========================================================

  private calculerNombreNonLues(): void {
    this.unreadCount = this.notifications.filter((notification) => !notification.readStatus).length;
  }

  // ========================================================
  // OUVRIR / FERMER
  // ========================================================

  togglePanneau(): void {
    this.panneauOuvert = !this.panneauOuvert;
  }

  fermerPanneau(): void {
    this.panneauOuvert = false;
  }

  // ========================================================
  // MARQUER COMME LUE
  // ========================================================

  async marquerCommeLue(notification: Notification): Promise<void> {
    if (notification.readStatus) {
      return;
    }

    const user = this.getCurrentUser();

    if (!user?.idUser) {
      return;
    }

    try {
      const updated = await this.messagerieService.markNotificationAsRead(
        notification.notificationId,
        user.idUser,
      );

      const index = this.notifications.findIndex(
        (item) => item.notificationId === notification.notificationId,
      );

      if (index !== -1) {
        this.notifications[index] = updated;
      }

      this.calculerNombreNonLues();

      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Erreur marquage notification :', error);
    }
  }

  // ========================================================
  // TOUT MARQUER COMME LU
  // ========================================================

  async marquerToutCommeLu(): Promise<void> {
    const user = this.getCurrentUser();

    if (!user?.idUser) {
      return;
    }

    if (this.unreadCount === 0) {
      return;
    }

    try {
      await this.messagerieService.markAllNotificationsAsRead(user.idUser);

      this.notifications = this.notifications.map((notification) => ({
        ...notification,

        readStatus: true,

        readAt: notification.readAt ?? new Date().toISOString(),
      }));

      this.unreadCount = 0;

      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Erreur marquage global :', error);
    }
  }

  // ========================================================
  // SUPPRESSION
  // ========================================================

  async supprimerNotification(event: Event, notification: Notification): Promise<void> {
    /*
     * Empêche le clic de la suppression
     * de déclencher le clic de la notification.
     */
    event.stopPropagation();

    const user = this.getCurrentUser();

    if (!user?.idUser) {
      return;
    }

    try {
      await this.messagerieService.deleteNotification(notification.notificationId, user.idUser);

      this.notifications = this.notifications.filter(
        (item) => item.notificationId !== notification.notificationId,
      );

      this.calculerNombreNonLues();

      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Erreur suppression notification :', error);
    }
  }

  // ========================================================
  // ICÔNE
  // ========================================================

  getIconeNotification(type: Notification['type']): string {
    switch (type) {
      case 'MESSAGE':
        return '💬';

      case 'RESERVATION':
        return '🚗';

      case 'AVIS':
        return '⭐';

      case 'SYSTEM':
        return '🔔';

      default:
        return '🔔';
    }
  }

  // ========================================================
  // CLASSE TYPE
  // ========================================================

  getClasseType(type: Notification['type']): string {
    return `notification-type-${type.toLowerCase()}`;
  }

  // ========================================================
  // DATE
  // ========================================================

  formaterDate(date: string): string {
    const notificationDate = new Date(date);

    const maintenant = new Date();

    const difference = maintenant.getTime() - notificationDate.getTime();

    const secondes = Math.floor(difference / 1000);

    if (secondes < 60) {
      return 'À l’instant';
    }

    const minutes = Math.floor(secondes / 60);

    if (minutes < 60) {
      return `Il y a ${minutes} min`;
    }

    const heures = Math.floor(minutes / 60);

    if (heures < 24) {
      return `Il y a ${heures} h`;
    }

    const jours = Math.floor(heures / 24);

    if (jours < 7) {
      return `Il y a ${jours} j`;
    }

    return notificationDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // ========================================================
  // UTILISATEUR COURANT
  // ========================================================

  private getCurrentUser(): { idUser: string } | null {
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
}
