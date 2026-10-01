import { StatutTrajet } from './trajet.model';

export interface TrajetSearchParams {
  villeDepart?: string;
  villeDestination?: string;
  dateDepart?: string;
  prixMax?: number;
  placesMin?: number;
  statut?: StatutTrajet;

  page?: number;
  size?: number;
  sort?: string;
}
