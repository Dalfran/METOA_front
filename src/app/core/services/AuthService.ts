import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  email: string;
  passe: string;
}

export interface UserResponse {
  idUser: string;
  nom: string;
  prenom: string;
  sexe: string;
  telephone: string;
  email: string;
  role: string;
  statusUser: string;
}

export interface RegisterRequest {
  nom: string;
  prenom: string;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  sexe?: string | null;
  telephone: string;
  userName: string;
  email: string;
  passe: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:8089/api/auth';

  /*
   * ============================
   * CONNEXION
   * ============================
   */
  login(
    donnees: LoginRequest
  ): Observable<LoginResponse> {

    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/login`,
        donnees
      )
      .pipe(
        tap((reponse) => {
          this.enregistrerSession(reponse);
        })
      );
  }

  /*
   * ============================
   * INSCRIPTION
   * ============================
   */
  register(
    donnees: RegisterRequest
  ): Observable<LoginResponse> {

    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/register`,
        donnees
      )
      .pipe(
        tap((reponse) => {
          this.enregistrerSession(reponse);
        })
      );
  }

  /*
   * ============================
   * SAUVEGARDE SESSION
   * ============================
   */
  private enregistrerSession(
    reponse: LoginResponse
  ): void {

    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(
      'metoa_token',
      reponse.token
    );

    localStorage.setItem(
      'metoa_user',
      JSON.stringify(reponse.user)
    );

    console.log('✅ Session METOA enregistrée');
    console.log('👤 Utilisateur :', reponse.user);
  }

  /*
   * ============================
   * TOKEN
   * ============================
   */
  getToken(): string | null {

    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(
      'metoa_token'
    );
  }

  /*
   * ============================
   * UTILISATEUR COURANT
   * ============================
   */
  getCurrentUser(): UserResponse | null {

    if (typeof localStorage === 'undefined') {
      return null;
    }

    const utilisateur =
      localStorage.getItem('metoa_user');

    if (!utilisateur) {
      return null;
    }

    try {

      return JSON.parse(
        utilisateur
      ) as UserResponse;

    } catch (error) {

      console.error(
        '❌ Impossible de lire metoa_user',
        error
      );

      return null;
    }
  }

  /*
   * ============================
   * AUTHENTIFICATION
   * ============================
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /*
   * ============================
   * DECONNEXION
   * ============================
   */
  logout(): void {

    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(
      'metoa_token'
    );

    localStorage.removeItem(
      'metoa_user'
    );

    console.log('👋 Déconnexion METOA');
  }
}
