import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Trajet } from '../models/trajet.model';
import { TrajetSearchParams } from '../models/trajet-search.model';
import { PageResponse } from '../models/page-response.model';


@Injectable({
  providedIn: 'root',
})
export class TrajetService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8089/api/v1/trajets';

  /**
   * Récupérer tous les trajets
   */
  getTrajets(page: number = 0, size: number = 10): Observable<PageResponse<Trajet>> {
    const params = new HttpParams().set('page', page).set('size', size);

    return this.http.get<PageResponse<Trajet>>(this.apiUrl, { params });
  }

  /**
   * Récupérer un trajet par son identifiant
   */
  getTrajetById(idTrajet: string): Observable<Trajet> {
    return this.http.get<Trajet>(`${this.apiUrl}/${idTrajet}`);
  }

  /**
   * Rechercher des trajets avec filtres
   */
  searchTrajets(recherche: TrajetSearchParams): Observable<PageResponse<Trajet>> {
    let params = new HttpParams();

    Object.entries(recherche).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<PageResponse<Trajet>>(`${this.apiUrl}/recherche`, { params });
  }
}
