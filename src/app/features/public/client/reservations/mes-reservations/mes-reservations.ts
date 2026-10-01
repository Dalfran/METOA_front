import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  afterNextRender,
  inject
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReservationService } from '../../../../../core/services/ReservationService';
import { Reservation } from '../../../../../core/models/reservation.model';
import { PageResponse } from '../../../../../core/models/page-response.model';

@Component({
  selector: 'app-mes-reservations',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe
  ],
  templateUrl: './mes-reservations.html',
  styleUrl: './mes-reservations.css'
})
export class MesReservations {

  private readonly reservationService = inject(ReservationService);
  private readonly cdr = inject(ChangeDetectorRef);

  reservations: Reservation[] = [];

  chargement = true;
  erreur = '';

  constructor() {

    afterNextRender(() => {
      this.chargerReservations();
    });

  }

  chargerReservations(): void {

    console.log('📋 Chargement de mes réservations...');

    this.erreur = '';

    this.reservationService
      .getMesReservations()
      .subscribe({

        next: (response: PageResponse<Reservation>) => {

          console.log(
            '✅ Réservations reçues :',
            response
          );

          this.reservations = response.content;

          this.chargement = false;

          console.log(
            '📊 Nombre de réservations :',
            this.reservations.length
          );

          console.log(
            '⏳ chargement =',
            this.chargement
          );

          /*
           * Angular SSR / afterNextRender :
           * on force ici la mise à jour de la vue
           * après la réponse HTTP.
           */
          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            '❌ Erreur lors du chargement des réservations :',
            error
          );

          this.chargement = false;

          if (error.status === 401) {

            this.erreur =
              'Votre session a expiré. Veuillez vous reconnecter.';

          } else if (error.status === 403) {

            this.erreur =
              'Vous n’avez pas accès à vos réservations.';

          } else {

            this.erreur =
              'Impossible de charger vos réservations.';
          }

          this.cdr.detectChanges();
        }

      });
  }

  getStatutLabel(
    statut: Reservation['statut']
  ): string {

    switch (statut) {

      case 'EN_ATTENTE':
        return 'En attente';

      case 'CONFIRMEE':
        return 'Confirmée';

      case 'ANNULEE':
        return 'Annulée';

      case 'REFUSEE':
        return 'Refusée';

      default:
        return statut;
    }
  }

  getStatutClasse(
    statut: Reservation['statut']
  ): string {

    switch (statut) {

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

  get totalReservations(): number {

    return this.reservations.length;

  }

  get reservationsActives(): number {

    return this.reservations.filter(
      reservation =>
        reservation.statut === 'EN_ATTENTE' ||
        reservation.statut === 'CONFIRMEE'
    ).length;

  }

  get reservationsAnnulees(): number {

    return this.reservations.filter(
      reservation =>
        reservation.statut === 'ANNULEE'
    ).length;

  }

  getReservationsActives(): Reservation[] {

    return this.reservations.filter(
      reservation =>
        reservation.statut === 'EN_ATTENTE' ||
        reservation.statut === 'CONFIRMEE'
    );

  }

  getReservationsTerminees(): Reservation[] {

    return this.reservations.filter(
      reservation =>
        reservation.statut === 'ANNULEE' ||
        reservation.statut === 'REFUSEE'
    );

  }

}
