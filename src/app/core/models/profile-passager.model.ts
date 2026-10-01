import { UserResponse } from '../services/user.service';

export interface ProfilePassagerRequest {
  adresse: string;
  bio?: string | null;
  preferences: string;
  numeroUrgence: string;
  typeBagageHabituel: string;
  moyenPaiementPrefere: string;
  frequenceVoyage?: string | null;
  userId?: string;
}

export interface ProfilePassagerResponse {
  profilepassagerId: string;

  adresse: string;

  bio: string | null;

  preferences: string;

  numeroUrgence: string;

  nombreVoyagesEffectues: number | null;

  noteMoyenne: number | null;

  profilVerifie: boolean;

  actif: boolean;

  typeBagageHabituel: string;

  moyenPaiementPrefere: string;

  frequenceVoyage: string | null;

  dateCreationProfile: string | null;

  dateModificationProfile: string | null;

  /**
   * Informations de l'utilisateur associé.
   *
   * Les photos utilisateur sont accessibles ici :
   * userResDTO.photoUrl
   * userResDTO.coverPhotoUrl
   */
  userResDTO?: UserResponse;
}
