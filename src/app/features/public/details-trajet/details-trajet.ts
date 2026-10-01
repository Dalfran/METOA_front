import { ChangeDetectorRef, Component, afterNextRender, inject } from '@angular/core';

import { DatePipe, DecimalPipe } from '@angular/common';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TrajetService } from '../../../core/services/trajet.service';
import { ReservationService } from '../../../core/services/ReservationService';
import { AuthService } from '../../../core/services/AuthService';
import { ReservationFlowService } from '../../../core/services/reservation-flow.service';

import { Trajet } from '../../../core/models/trajet.model';

@Component({
  selector: 'app-details-trajet',
  standalone: true,

  imports: [DatePipe, DecimalPipe, RouterLink],

  templateUrl: './details-trajet.html',
  styleUrl: './details-trajet.css',
})
export class DetailsTrajet {
  // ============================================================
  // SERVICES
  // ============================================================

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly trajetService = inject(TrajetService);

  private readonly reservationService = inject(ReservationService);

  private readonly authService = inject(AuthService);

  private readonly reservationFlowService = inject(ReservationFlowService);

  private readonly cdr = inject(ChangeDetectorRef);

  // ============================================================
  // DONNÉES DU TRAJET
  // ============================================================

  trajet: Trajet | null = null;

  chargement = true;

  erreur = '';

  // ============================================================
  // RÉSERVATION
  // ============================================================

  reservationOuverte = false;

  nombrePlaces = 1;

  reservationEnCours = false;

  messageSucces = '';

  erreurReservation = '';

  /**
   * Empêche de lancer plusieurs fois
   * la reprise automatique de réservation.
   */
  private repriseReservationLancee = false;

  contacterConducteur(): void {
    const chauffeurId = this.trajet?.chauffeur?.idUser;

    if (!chauffeurId) {
      console.error('❌ Impossible de contacter le conducteur : identifiant introuvable.');
      return;
    }

    this.router.navigate(['/client/messagerie'], {
      queryParams: {
        userId: chauffeurId,
      },
    });
  }

  // ============================================================
  // CONSTRUCTEUR
  // ============================================================

  constructor() {
    afterNextRender(() => {
      const id = this.route.snapshot.paramMap.get('id');

      console.log('🆔 ID récupéré depuis la route :', id);

      if (!id) {
        console.error('❌ Aucun ID de trajet dans la route');

        this.erreur = 'Identifiant du trajet introuvable.';

        this.chargement = false;

        this.cdr.detectChanges();

        return;
      }

      this.chargerTrajet(id);
    });
  }

  // ============================================================
  // ESPACE PUBLIC / ESPACE CLIENT
  // ============================================================

  get estEspaceClient(): boolean {
    return this.route.pathFromRoot.some((route) =>
      route.snapshot.url.some((segment) => segment.path === 'client'),
    );
  }

  // ============================================================
  // PRÉFIXE ROUTE TRAJETS
  // ============================================================

  get prefixeTrajets(): string {
    return this.estEspaceClient ? '/client/trajets' : '/trajets';
  }

  // ============================================================
  // STATUT DU TRAJET
  // ============================================================

  get trajetPasse(): boolean {
    if (!this.trajet) {
      return false;
    }

    /*
     * Si le backend indique explicitement
     * que le trajet est terminé ou en cours.
     */

    if (this.trajet.statut === 'TERMINE' || this.trajet.statut === 'EN_COURS') {
      return true;
    }

    /*
     * Vérification supplémentaire avec
     * la date et l'heure.
     */

    const dateHeureTrajet = new Date(`${this.trajet.dateDepart}T${this.trajet.heureDepart}`);

    return dateHeureTrajet.getTime() <= Date.now();
  }

  get trajetComplet(): boolean {
    return !!this.trajet && this.trajet.placesDisponibles <= 0;
  }

  get trajetAnnule(): boolean {
    return this.trajet?.statut === 'ANNULE';
  }

  /**
   * Indique si une réservation est possible.
   */

  get peutReserver(): boolean {
    return !!this.trajet && !this.trajetPasse && !this.trajetComplet && !this.trajetAnnule;
  }

  /**
   * Texte affiché selon le statut du trajet.
   */

  get statutReservationLabel(): string {
    if (!this.trajet) {
      return '';
    }

    if (this.trajetAnnule) {
      return 'Trajet annulé';
    }

    if (this.trajetPasse) {
      return 'Trajet terminé';
    }

    if (this.trajetComplet) {
      return 'Trajet complet';
    }

    return 'Réservation disponible';
  }

  // ============================================================
  // CHARGEMENT DU TRAJET
  // ============================================================

  chargerTrajet(id: string): void {
    console.log('🚗 Chargement du trajet :', id);

    this.chargement = true;

    this.erreur = '';

    this.trajet = null;

    this.trajetService.getTrajetById(id).subscribe({
      next: (response) => {
        console.log('✅ RÉPONSE TRAJET REÇUE :', response);

        this.trajet = response;

        console.log('🚗 Trajet après affectation :', this.trajet);

        this.chargement = false;

        this.cdr.detectChanges();

        /*
         * Après avoir chargé le trajet,
         * on vérifie si une réservation
         * était en attente avant connexion.
         */

        this.verifierRepriseReservation();
      },

      error: (error) => {
        console.error('❌ ERREUR CHARGEMENT TRAJET :', error);

        this.trajet = null;

        this.chargement = false;

        if (error.status === 404) {
          this.erreur = 'Ce trajet est introuvable.';
        } else if (error.status === 401) {
          this.erreur = 'Votre session a expiré. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          this.erreur = 'Vous n’avez pas accès à ce trajet.';
        } else {
          this.erreur = 'Impossible de charger les détails de ce trajet.';
        }

        this.cdr.detectChanges();
      },
    });
  }

  // ============================================================
  // PRIX TOTAL
  // ============================================================

  get prixTotal(): number {
    if (!this.trajet) {
      return 0;
    }

    return this.trajet.prix * this.nombrePlaces;
  }

  // ============================================================
  // OUVRIR LE FORMULAIRE DE RÉSERVATION
  // ============================================================

  ouvrirReservation(): void {
    if (!this.trajet) {
      return;
    }

    // ----------------------------------------------------------
    // TRAJET ANNULÉ
    // ----------------------------------------------------------

    if (this.trajetAnnule) {
      this.erreurReservation = 'Ce trajet a été annulé.';

      return;
    }

    // ----------------------------------------------------------
    // TRAJET PASSÉ
    // ----------------------------------------------------------

    if (this.trajetPasse) {
      this.erreurReservation = 'Ce trajet est déjà terminé.';

      return;
    }

    // ----------------------------------------------------------
    // TRAJET COMPLET
    // ----------------------------------------------------------

    if (this.trajetComplet) {
      this.erreurReservation = 'Ce trajet ne possède plus de places disponibles.';

      return;
    }

    // ----------------------------------------------------------
    // OUVERTURE DU FORMULAIRE
    // ----------------------------------------------------------

    this.reservationOuverte = true;

    this.nombrePlaces = 1;

    this.erreurReservation = '';

    this.messageSucces = '';

    this.cdr.detectChanges();
  }

  // ============================================================
  // FERMER LE FORMULAIRE
  // ============================================================

  fermerReservation(): void {
    if (this.reservationEnCours) {
      return;
    }

    this.reservationOuverte = false;

    this.erreurReservation = '';

    this.messageSucces = '';

    this.cdr.detectChanges();
  }

  // ============================================================
  // AUGMENTER LE NOMBRE DE PLACES
  // ============================================================

  augmenterPlaces(): void {
    if (!this.trajet) {
      return;
    }

    if (this.nombrePlaces < this.trajet.placesDisponibles) {
      this.nombrePlaces++;

      this.cdr.detectChanges();
    }
  }

  // ============================================================
  // DIMINUER LE NOMBRE DE PLACES
  // ============================================================

  diminuerPlaces(): void {
    if (this.nombrePlaces > 1) {
      this.nombrePlaces--;

      this.cdr.detectChanges();
    }
  }

  // ============================================================
  // REPRISE D'UNE RÉSERVATION APRÈS LOGIN / REGISTER
  // ============================================================

  private verifierRepriseReservation(): void {
    if (!this.trajet) {
      return;
    }

    /*
     * L'utilisateur doit être authentifié.
     */

    if (!this.authService.isAuthenticated()) {
      return;
    }

    /*
     * Protection contre une double exécution.
     */

    if (this.repriseReservationLancee) {
      return;
    }

    /*
     * Récupération de l'intention
     * sauvegardée dans localStorage.
     */

    const intention = this.reservationFlowService.recupererIntention();

    /*
     * Aucune réservation en attente.
     */

    if (!intention) {
      return;
    }

    /*
     * Vérification que l'intention
     * concerne bien ce trajet.
     */

    if (intention.trajetId !== this.trajet.idTrajet) {
      return;
    }

    console.log('🔄 REPRISE AUTOMATIQUE DE LA RÉSERVATION');

    console.log('🚗 Trajet :', intention.trajetId);

    console.log('💺 Nombre de places :', intention.nombrePlaces);

    /*
     * Vérification finale du trajet.
     */

    if (!this.peutReserver) {
      console.warn('⚠️ Le trajet ne peut plus être réservé.');

      this.reservationFlowService.effacerIntention();

      return;
    }

    /*
     * Vérification du nombre de places.
     */

    const placesDemandees = intention.nombrePlaces || 1;

    if (placesDemandees > this.trajet.placesDisponibles) {
      console.warn('⚠️ Le nombre de places demandé n’est plus disponible.');

      this.reservationFlowService.effacerIntention();

      this.erreurReservation = 'Le nombre de places demandé n’est plus disponible.';

      this.cdr.detectChanges();

      return;
    }

    /*
     * On indique que la reprise
     * est en cours.
     */

    this.repriseReservationLancee = true;

    /*
     * Restauration du nombre de places.
     */

    this.nombrePlaces = placesDemandees;

    /*
     * On ouvre le formulaire.
     */

    this.reservationOuverte = true;

    this.erreurReservation = '';

    this.messageSucces = '';

    this.cdr.detectChanges();

    /*
     * Petit délai pour laisser Angular
     * mettre à jour le formulaire avant
     * de lancer la réservation.
     */

    setTimeout(() => {
      if (!this.trajet) {
        return;
      }

      console.log('🚀 Lancement automatique de la réservation après authentification...');

      this.confirmerReservation();
    }, 100);
  }

  // ============================================================
  // CONFIRMER LA RÉSERVATION
  // ============================================================

  confirmerReservation(): void {
    if (!this.trajet) {
      return;
    }

    // ----------------------------------------------------------
    // PROTECTION DOUBLE CLIC
    // ----------------------------------------------------------

    if (this.reservationEnCours) {
      return;
    }

    // ----------------------------------------------------------
    // VÉRIFICATION DU TRAJET
    // ----------------------------------------------------------

    if (!this.peutReserver) {
      this.erreurReservation = this.statutReservationLabel;

      this.cdr.detectChanges();

      return;
    }

    // ----------------------------------------------------------
    // VÉRIFICATION DU NOMBRE DE PLACES
    // ----------------------------------------------------------

    if (this.nombrePlaces < 1) {
      this.erreurReservation = 'Vous devez sélectionner au moins une place.';

      this.cdr.detectChanges();

      return;
    }

    if (this.nombrePlaces > this.trajet.placesDisponibles) {
      this.erreurReservation = 'Le nombre de places demandé dépasse les places disponibles.';

      this.cdr.detectChanges();

      return;
    }

    // ==========================================================
    // VISITEUR NON CONNECTÉ
    // ==========================================================

    if (!this.authService.isAuthenticated()) {
      const returnUrl = this.router.url;

      /*
       * Sauvegarde de l'intention
       * AVEC le nombre de places réellement choisi.
       */

      this.reservationFlowService.enregistrerIntention(
        this.trajet.idTrajet,
        this.nombrePlaces,
        returnUrl,
      );

      console.log('🔐 Utilisateur non connecté.');

      console.log('💾 Intention de réservation sauvegardée.');

      console.log('🚗 Trajet :', this.trajet.idTrajet);

      console.log('💺 Places :', this.nombrePlaces);

      /*
       * On ferme le formulaire avant
       * de quitter la page.
       */

      this.reservationOuverte = false;

      /*
       * Redirection vers la connexion.
       *
       * Le returnUrl permettra de revenir
       * automatiquement sur ce trajet.
       */

      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl,
        },
      });

      return;
    }

    // ==========================================================
    // UTILISATEUR AUTHENTIFIÉ
    // ==========================================================

    this.reservationEnCours = true;

    this.erreurReservation = '';

    this.messageSucces = '';

    this.cdr.detectChanges();

    console.log('📤 Envoi réservation au backend...');

    console.log('🚗 Trajet :', this.trajet.idTrajet);

    console.log('💺 Places :', this.nombrePlaces);

    this.reservationService.creerReservation(this.trajet.idTrajet, this.nombrePlaces).subscribe({
      // ======================================================
      // SUCCÈS
      // ======================================================

      next: (reservation) => {
        console.log('🎉 RÉSERVATION CRÉÉE :', reservation);

        this.reservationEnCours = false;

        /*
         * L'intention n'est plus nécessaire.
         */

        this.reservationFlowService.effacerIntention();

        this.messageSucces = 'Votre réservation a été créée avec succès.';

        this.reservationOuverte = false;

        this.cdr.detectChanges();

        /*
         * Redirection vers le dashboard client.
         */

        setTimeout(() => {
          this.router.navigate(['/client/dashboard']);
        }, 500);
      },

      // ======================================================
      // ERREUR
      // ======================================================

      error: (error) => {
        console.error('❌ ERREUR RÉSERVATION :', error);

        this.reservationEnCours = false;

        /*
         * Très important :
         * on NE supprime PAS l'intention ici.
         *
         * En cas d'erreur, l'utilisateur peut
         * corriger et réessayer.
         */

        const messageBackend = error?.error?.message || error?.error?.error;

        if (messageBackend) {
          this.erreurReservation = messageBackend;
        } else if (error.status === 401) {
          /*
           * Si le token a expiré,
           * on sauvegarde l'intention
           * avant de rediriger vers login.
           */

          const returnUrl = this.router.url;

          this.reservationFlowService.enregistrerIntention(
            this.trajet!.idTrajet,
            this.nombrePlaces,
            returnUrl,
          );

          this.erreurReservation = 'Votre session a expiré. Veuillez vous reconnecter.';

          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: {
                returnUrl,
              },
            });
          }, 700);
        } else if (error.status === 403) {
          this.erreurReservation = 'Vous n’avez pas l’autorisation de réserver ce trajet.';
        } else if (error.status === 404) {
          this.erreurReservation = messageBackend || 'Le trajet demandé est introuvable.';
        } else {
          this.erreurReservation = 'Une erreur est survenue lors de la réservation.';
        }

        /*
         * La reprise automatique pourra
         * être relancée si nécessaire.
         */

        this.repriseReservationLancee = false;

        this.cdr.detectChanges();
      },
    });
  }
}
