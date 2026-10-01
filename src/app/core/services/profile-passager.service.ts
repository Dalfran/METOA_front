import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ProfilePassagerRequest, ProfilePassagerResponse } from '../models/profile-passager.model';

@Injectable({
  providedIn: 'root',
})
export class ProfilePassagerService {
  private http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8089/api/v1/users';

  /**
   * Récupérer le profil passager d'un utilisateur
   */
  getProfilePassager(userId: string): Observable<ProfilePassagerResponse> {
    return this.http.get<ProfilePassagerResponse>(`${this.apiUrl}/${userId}/profile-passager`);
  }

  /**
   * Créer le profil passager
   */
  createProfilePassager(
    userId: string,
    donnees: ProfilePassagerRequest,
  ): Observable<ProfilePassagerResponse> {
    return this.http.post<ProfilePassagerResponse>(
      `${this.apiUrl}/${userId}/profile-passager`,
      donnees,
    );
  }

  /**
   * Modifier le profil passager
   */
  updateProfilePassager(
    userId: string,
    donnees: ProfilePassagerRequest,
  ): Observable<ProfilePassagerResponse> {
    return this.http.put<ProfilePassagerResponse>(
      `${this.apiUrl}/${userId}/profile-passager`,
      donnees,
    );
  }

  /**
   * Supprimer le profil passager
   */
  deleteProfilePassager(userId: string): Observable<string> {
    return this.http.delete(`${this.apiUrl}/${userId}/profile-passager`, {
      responseType: 'text',
    });
  }
}
