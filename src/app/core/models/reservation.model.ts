export type StatutReservation = 'EN_ATTENTE' | 'CONFIRMEE' | 'ANNULEE' | 'REFUSEE';

export interface Reservation {
  idReservation: string;

  nombrePlaces: number;

  statut: StatutReservation;

  dateCreation: string;

  dateModification?: string;

  // ==============================
  // PASSAGER
  // ==============================

  passagerId: string;

  passagerNom: string;

  passagerPrenom: string;

  // ==============================
  // TRAJET
  // ==============================

  trajetId: string;

  villeDepart: string;

  villeDestination: string;

  dateDepart: string;

  heureDepart: string;

  prix: number;

  placesDisponibles: number;
}
