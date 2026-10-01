import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserResponse } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class CurrentUserService {
  private readonly utilisateurSubject = new BehaviorSubject<UserResponse | null>(
    this.chargerDepuisLocalStorage(),
  );

  readonly utilisateur$ = this.utilisateurSubject.asObservable();

  // =========================================================
  // Utilisateur courant
  // =========================================================

  get utilisateur(): UserResponse | null {
    return this.utilisateurSubject.value;
  }

  // =========================================================
  // Charger depuis localStorage
  // =========================================================

  private chargerDepuisLocalStorage(): UserResponse | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const utilisateurStocke = localStorage.getItem('metoa_user');

    if (!utilisateurStocke) {
      return null;
    }

    try {
      return JSON.parse(utilisateurStocke) as UserResponse;
    } catch (error) {
      console.error('❌ Impossible de lire metoa_user :', error);

      return null;
    }
  }

  // =========================================================
  // Définir l'utilisateur courant
  // =========================================================

  setUtilisateur(utilisateur: UserResponse | null): void {
    this.utilisateurSubject.next(utilisateur);

    if (typeof localStorage === 'undefined') {
      return;
    }

    if (utilisateur) {
      localStorage.setItem('metoa_user', JSON.stringify(utilisateur));
    } else {
      localStorage.removeItem('metoa_user');
    }
  }

  // =========================================================
  // Mettre à jour partiellement l'utilisateur
  // =========================================================

  mettreAJourUtilisateur(modifications: Partial<UserResponse>): void {
    const utilisateurActuel = this.utilisateurSubject.value;

    if (!utilisateurActuel) {
      return;
    }

    const utilisateurMisAJour: UserResponse = {
      ...utilisateurActuel,
      ...modifications,
    };

    this.setUtilisateur(utilisateurMisAJour);
  }

  // =========================================================
  // Nettoyer l'utilisateur courant
  // =========================================================

  clear(): void {
    this.setUtilisateur(null);
  }
}
