import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  afterNextRender,
  inject
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { ReservationService } from '../../../core/services/ReservationService';
import { Reservation } from '../../../core/models/reservation.model';

@Component({
  selector: 'app-detail-reservation',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './detail-reservation.html',
  styleUrl: './detail-reservation.css',
})
export class DetailReservation {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reservationService = inject(ReservationService);
  private readonly cdr = inject(ChangeDetectorRef);

  reservationId = '';

  reservation: Reservation | null = null;

  chargement = true;
  erreur = '';

  annulationEnCours = false;
  confirmationAnnulation = false;

  messageSucces = '';
  erreurAnnulation = '';

  constructor() {
    /*
     * IMPORTANT :
     * L'API de réservation est protégée par JWT.
     * Comme le token est stocké dans localStorage,
     * on attend d'être côté navigateur avant de lancer
     * l'appel API.
     */
    afterNextRender(() => {
      this.initialiser();
    });
  }

  // =========================================================
  // INITIALISATION
  // =========================================================

  private initialiser(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.erreur = 'Identifiant de réservation introuvable.';

      this.chargement = false;

      this.cdr.detectChanges();

      return;
    }

    this.reservationId = id;

    this.chargerReservation();
  }

  // =========================================================
  // CHARGEMENT DE LA RÉSERVATION
  // =========================================================

  chargerReservation(): void {
    if (!this.reservationId) {
      return;
    }

    this.chargement = true;
    this.erreur = '';
    this.messageSucces = '';
    this.erreurAnnulation = '';

    this.reservationService.getReservationById(this.reservationId).subscribe({
      next: (reservation) => {
        console.log('✅ Réservation chargée :', reservation);

        this.reservation = reservation;

        this.chargement = false;

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('❌ Erreur lors du chargement de la réservation :', error);

        this.reservation = null;
        this.chargement = false;

        if (error.status === 404) {
          this.erreur = 'Cette réservation est introuvable.';
        } else if (error.status === 401) {
          this.erreur = 'Votre session a expiré. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          this.erreur = 'Vous n’avez pas accès à cette réservation.';
        } else {
          this.erreur = 'Impossible de charger les détails de la réservation.';
        }

        this.cdr.detectChanges();
      },
    });
  }

  // =========================================================
  // STATUT
  // =========================================================

  get statutLabel(): string {
    if (!this.reservation) {
      return '';
    }

    switch (this.reservation.statut) {
      case 'EN_ATTENTE':
        return 'En attente';

      case 'CONFIRMEE':
        return 'Confirmée';

      case 'ANNULEE':
        return 'Annulée';

      case 'REFUSEE':
        return 'Refusée';

      default:
        return this.reservation.statut;
    }
  }

  get statutClasse(): string {
    if (!this.reservation) {
      return '';
    }

    switch (this.reservation.statut) {
      case 'EN_ATTENTE':
        return 'status-pending';

      case 'CONFIRMEE':
        return 'status-confirmed';

      case 'ANNULEE':
        return 'status-cancelled';

      case 'REFUSEE':
        return 'status-refused';

      default:
        return '';
    }
  }

  // =========================================================
  // INFORMATIONS CALCULÉES
  // =========================================================

  get prixTotal(): number {
    if (!this.reservation) {
      return 0;
    }

    return this.reservation.prix * this.reservation.nombrePlaces;
  }

  get initialesPassager(): string {
    if (!this.reservation) {
      return '';
    }

    const prenom = this.reservation.passagerPrenom?.trim() ?? '';

    const nom = this.reservation.passagerNom?.trim() ?? '';

    const initialePrenom = prenom.charAt(0).toUpperCase();

    const initialeNom = nom.charAt(0).toUpperCase();

    return `${initialePrenom}${initialeNom}`;
  }

  // =========================================================
  // ANNULATION
  // =========================================================

  get peutAnnuler(): boolean {
    if (!this.reservation) {
      return false;
    }

    return this.reservation.statut === 'EN_ATTENTE' || this.reservation.statut === 'CONFIRMEE';
  }

  ouvrirConfirmationAnnulation(): void {
    if (!this.peutAnnuler || this.annulationEnCours) {
      return;
    }

    this.confirmationAnnulation = true;
    this.erreurAnnulation = '';
    this.messageSucces = '';

    this.cdr.detectChanges();
  }

  fermerConfirmationAnnulation(): void {
    if (this.annulationEnCours) {
      return;
    }

    this.confirmationAnnulation = false;
    this.erreurAnnulation = '';

    this.cdr.detectChanges();
  }

  confirmerAnnulation(): void {
    if (!this.reservation || !this.peutAnnuler || this.annulationEnCours) {
      return;
    }

    this.annulationEnCours = true;
    this.erreurAnnulation = '';
    this.messageSucces = '';

    const idReservation = this.reservation.idReservation;

    this.reservationService.annulerReservation(idReservation).subscribe({
      next: () => {
        console.log('✅ Réservation annulée :', idReservation);

        this.annulationEnCours = false;
        this.confirmationAnnulation = false;

        /*
         * Mise à jour immédiate de l'interface
         * sans attendre un second appel API.
         */
        if (this.reservation) {
          this.reservation = {
            ...this.reservation,
            statut: 'ANNULEE',
          };
        }

        this.messageSucces = 'Votre réservation a été annulée avec succès.';

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('❌ Erreur lors de l’annulation :', error);

        this.annulationEnCours = false;

        if (error.status === 400) {
          this.erreurAnnulation =
            error.error?.message ?? 'Cette réservation ne peut pas être annulée.';
        } else if (error.status === 401) {
          this.erreurAnnulation = 'Votre session a expiré. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          this.erreurAnnulation = 'Vous n’avez pas l’autorisation d’annuler cette réservation.';
        } else if (error.status === 404) {
          this.erreurAnnulation = 'La réservation est introuvable.';
        } else if (error.status === 409) {
          this.erreurAnnulation =
            error.error?.message ?? 'Cette réservation ne peut plus être annulée.';
        } else {
          this.erreurAnnulation = 'Une erreur est survenue lors de l’annulation.';
        }

        this.cdr.detectChanges();
      },
    });
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  allerAuxReservations(): void {
    this.router.navigate(['/client/reservations']);
  }

  allerAuTrajet(): void {
    if (!this.reservation) return;

    this.router.navigate(['/client/trajets',

      this.reservation.trajetId]);
  }
}
