import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Reservation } from '../models/reservation.model';
import { PageResponse } from '../models/page-response.model';

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8089/api/v1/reservations';

  // =====================================================
  // CREER UNE RESERVATION
  // =====================================================

  creerReservation(idTrajet: string, nombrePlaces: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.apiUrl}/trajets/${idTrajet}`, {
      nombrePlaces,
    });
  }

  // =====================================================
  // MES RESERVATIONS
  // =====================================================

  getMesReservations(): Observable<PageResponse<Reservation>> {
    return this.http.get<PageResponse<Reservation>>(`${this.apiUrl}/mes-reservations`);
  }

  // =====================================================
  // DETAIL RESERVATION
  // =====================================================

  getReservationById(idReservation: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${idReservation}`);
  }

  // =====================================================
  // ANNULER RESERVATION
  // =====================================================

  annulerReservation(idReservation: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${idReservation}/annuler`, {});
  }
}
