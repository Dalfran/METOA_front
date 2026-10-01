import { Component, OnInit, inject } from '@angular/core';

import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { CommonModule } from '@angular/common';

import { NotificationsComponent } from '../../components/notifications/notifications';

import { AuthService } from '../../../core/services/AuthService';
import { MessagerieService } from '../../../core/services/messagerie.service';
import { UserService } from '../../../core/services/user.service';
import { CurrentUserService } from '../../../core/services/CurrentUserService';
import { Subscription } from 'rxjs';
import { UserResponse } from '../../../core/services/user.service';


@Component({
  selector: 'app-client-layout',

  standalone: true,

  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, NotificationsComponent],

  templateUrl: './client-layout.html',

  styleUrl: './client-layout.css',
})
export class ClientLayout implements OnInit {
  // ========================================================
  // SERVICES
  // ========================================================

  private readonly router = inject(Router);

  private readonly authService = inject(AuthService);

  private readonly messagerieService = inject(MessagerieService);

  private readonly userService = inject(UserService);

  private readonly currentUserService = inject(CurrentUserService);

  private utilisateurSubscription?: Subscription;

  utilisateur: UserResponse | null = null;

  // ========================================================
  // UTILISATEUR
  // ========================================================

  // ========================================================
  // INITIALISATION
  // ========================================================

  ngOnInit(): void {
    this.abonnerUtilisateurCourant();

    this.initialiserWebSocket();
  }

  // ========================================================
  // CHARGER UTILISATEUR
  // ========================================================

  private abonnerUtilisateurCourant(): void {
    this.utilisateurSubscription = this.currentUserService.utilisateur$.subscribe((utilisateur) => {
      this.utilisateur = utilisateur;
    });
  }

  // ========================================================
  // INITIALISER WEBSOCKET
  // ========================================================

  private initialiserWebSocket(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const token = localStorage.getItem('metoa_token');

    if (!token) {
      console.warn('⚠️ Aucun JWT disponible pour le WebSocket.');

      return;
    }

    if (!this.utilisateur?.idUser) {
      console.warn('⚠️ Aucun utilisateur connecté pour le WebSocket.');

      return;
    }

    console.log('🔌 Initialisation du WebSocket METOA...');

    this.messagerieService.connect();
  }

  // ========================================================
  // NOM COMPLET
  // ========================================================

  get nomComplet(): string {
    if (!this.utilisateur) {
      return 'Voyageur';
    }

    return `
      ${this.utilisateur.prenom ?? ''}
      ${this.utilisateur.nom ?? ''}
    `.trim();
  }

  getPhotoProfilUrl(): string | null {
    return this.userService.getPhotoUrl(this.utilisateur?.photoUrl);
  }

  // ========================================================
  // INITIALE
  // ========================================================

  get initiale(): string {
    return this.utilisateur?.prenom?.charAt(0)?.toUpperCase() || 'U';
  }

  // ========================================================
  // DÉCONNEXION
  // ========================================================

  deconnexion(): void {
    console.log('👋 Déconnexion de l’utilisateur');

    /*
     * Fermeture propre du WebSocket
     */

    this.messagerieService.disconnect();

    /*
     * Déconnexion JWT
     */

    this.authService.logout();

    /*
     * Retour login
     */

    this.router.navigate(['/login']);
  }
}
