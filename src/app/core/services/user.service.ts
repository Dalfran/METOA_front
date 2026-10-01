import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PageResponse } from '../models/page-response.model';

export interface UserResponse {
  idUser: string;
  nom: string;
  prenom: string;
  sexe: string;
  telephone: string;
  email: string;
  role: string;
  statusUser: string;

  // Photos appartenant à l'utilisateur
  photoUrl?: string | null;
  coverPhotoUrl?: string | null;
}

export interface UserRequest {
  nom: string;
  prenom: string;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  sexe?: string | null;
  telephone: string;
  email: string;
  passe: string;
  role: string;
}

export interface UserUpdateRequest {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  sexe: string;
}

export interface ChangePasswordRequest {
  ancienPasse: string;
  nouveauPasse: string;
  confirmationPasse: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8089/api/users';

  /**
   * Récupérer tous les utilisateurs avec pagination
   */
  getUsers(
    page: number = 0,
    size: number = 30
  ): Observable<PageResponse<UserResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<PageResponse<UserResponse>>(
      this.apiUrl,
      { params }
    );
  }

  /**
   * Récupérer un utilisateur par son identifiant
   */
  getUserById(idUser: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(
      `${this.apiUrl}/${idUser}`
    );
  }

  /**
   * Récupérer un utilisateur par son email
   */
  getUserByEmail(email: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(
      `${this.apiUrl}/email/${encodeURIComponent(email)}`
    );
  }

  /**
   * Récupérer les utilisateurs par nom
   */
  getUsersByNom(nom: string): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(
      `${this.apiUrl}/nom/${encodeURIComponent(nom)}`
    );
  }

  /**
   * Récupérer les utilisateurs par prénom
   */
  getUsersByPrenom(prenom: string): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(
      `${this.apiUrl}/prenom/${encodeURIComponent(prenom)}`
    );
  }

  /**
   * Recherche simple d'utilisateurs
   */
  searchUsers(keyword: string): Observable<UserResponse[]> {
    const params = new HttpParams()
      .set('keyword', keyword);

    return this.http.get<UserResponse[]>(
      `${this.apiUrl}/search`,
      { params }
    );
  }

  /**
   * Recherche avancée
   */
  advancedSearch(
    paramsRecherche: Record<
      string,
      string | number | boolean | null | undefined
    >
  ): Observable<PageResponse<UserResponse>> {
    let params = new HttpParams();

    Object.entries(paramsRecherche).forEach(([key, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        value !== ''
      ) {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<PageResponse<UserResponse>>(
      `${this.apiUrl}/advanced-search`,
      { params }
    );
  }

  /**
   * Créer un utilisateur
   */
  createUser(
    donnees: UserRequest
  ): Observable<UserResponse> {
    return this.http.post<UserResponse>(
      this.apiUrl,
      donnees
    );
  }

  /**
   * Modifier un utilisateur
   */
  updateUser(
    idUser: string,
    donnees: UserUpdateRequest
  ): Observable<UserResponse> {
    return this.http.put<UserResponse>(
      `${this.apiUrl}/${idUser}`,
      donnees
    );
  }

  /**
   * Supprimer un utilisateur
   */
  deleteUser(idUser: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${idUser}`
    );
  }

  /**
   * Modifier le mot de passe de l'utilisateur connecté
   */
  changePassword(
    donnees: ChangePasswordRequest
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/me/password`,
      donnees
    );
  }

  // ============================================================
  // PHOTOS UTILISATEUR
  // ============================================================

  /**
   * Télécharger / remplacer la photo de profil utilisateur
   */
  uploadPhoto(
    idUser: string,
    fichier: File
  ): Observable<UserResponse> {
    const formData = new FormData();

    formData.append('file', fichier);

    return this.http.post<UserResponse>(
      `${this.apiUrl}/${idUser}/photo`,
      formData
    );
  }

  /**
   * Télécharger / remplacer la photo de couverture utilisateur
   */
  uploadCoverPhoto(
    idUser: string,
    fichier: File
  ): Observable<UserResponse> {
    const formData = new FormData();

    formData.append('file', fichier);

    return this.http.post<UserResponse>(
      `${this.apiUrl}/${idUser}/cover`,
      formData
    );
  }

  /**
   * Supprimer la photo de profil utilisateur
   */
  deletePhoto(idUser: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${idUser}/photo`
    );
  }

  /**
   * Supprimer la photo de couverture utilisateur
   */
  deleteCoverPhoto(idUser: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${idUser}/cover`
    );
  }

  getPhotoUrl(photoUrl: string | null | undefined): string | null {
    if (!photoUrl) {
      return null;
    }

    if (
      photoUrl.startsWith('http://') ||
      photoUrl.startsWith('https://')
    ) {
      return photoUrl;
    }

    return `http://localhost:8089${
      photoUrl.startsWith('/') ? '' : '/'
    }${photoUrl}`;
  }
}
