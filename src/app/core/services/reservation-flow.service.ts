import { Injectable } from '@angular/core';

export interface ReservationIntent {
  trajetId: string;
  nombrePlaces: number;
  returnUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationFlowService {
  private readonly storageKey = 'metoa_reservation_intent';

  // ============================================================
  // ENREGISTRER L'INTENTION
  // ============================================================

  enregistrerIntention(trajetId: string, nombrePlaces: number, returnUrl: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const nombrePlacesNormalise = Math.max(1, Math.floor(nombrePlaces || 1));

    const intention: ReservationIntent = {
      trajetId,
      nombrePlaces: nombrePlacesNormalise,
      returnUrl,
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(intention));

      console.log('💾 Intention de réservation enregistrée :', intention);
    } catch (error) {
      console.error('❌ Impossible d’enregistrer l’intention de réservation :', error);
    }
  }

  // ============================================================
  // RÉCUPÉRER L'INTENTION
  // ============================================================

  recupererIntention(): ReservationIntent | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const valeur = localStorage.getItem(this.storageKey);

    if (!valeur) {
      return null;
    }

    try {
      const intention = JSON.parse(valeur) as ReservationIntent;

      /*
       * Vérification minimale des données.
       */

      if (!intention || typeof intention.trajetId !== 'string' || !intention.trajetId) {
        console.warn('⚠️ Intention de réservation invalide.');

        this.effacerIntention();

        return null;
      }

      const nombrePlaces = Math.max(1, Math.floor(Number(intention.nombrePlaces) || 1));

      return {
        trajetId: intention.trajetId,
        nombrePlaces,
        returnUrl:
          typeof intention.returnUrl === 'string'
            ? intention.returnUrl
            : `/trajets/${intention.trajetId}`,
      };
    } catch (error) {
      console.error('❌ Impossible de lire l’intention de réservation :', error);

      this.effacerIntention();

      return null;
    }
  }

  // ============================================================
  // SUPPRIMER L'INTENTION
  // ============================================================

  effacerIntention(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(this.storageKey);

    console.log('🧹 Intention de réservation supprimée');
  }

  // ============================================================
  // VÉRIFIER SI UNE INTENTION EXISTE
  // ============================================================

  aUneIntention(): boolean {
    return this.recupererIntention() !== null;
  }
}
