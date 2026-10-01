export interface ChauffeurTrajet {
  idUser: string;
  nom: string;
  prenom: string;
  photoUrl?: string;
  noteMoyenne?: number;
}

export type StatutTrajet = 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'ANNULE';

export interface Trajet {
  idTrajet: string;

  chauffeur: ChauffeurTrajet;

  villeDepart: string;
  adresseDepart: string;

  villeDestination: string;
  adresseDestination: string;

  dateDepart: string;
  heureDepart: string;

  prix: number;

  nombrePlaces: number;
  placesDisponibles: number;

  description?: string;

  statut: StatutTrajet;

  dateCreation: string;
  dateModification?: string;
}
