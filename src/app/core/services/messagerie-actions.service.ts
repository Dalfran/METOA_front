import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { Message } from '../models/messagerie.models';

@Injectable({
  providedIn: 'root',
})
export class MessagerieActionsService {
  private readonly apiUrl = 'http://localhost:8089/api/v1/messages';

  constructor(private http: HttpClient) {}

  /**
   * Modifier un message.
   *
   * Endpoint :
   * PUT /api/v1/messages/{messageId}?content=...
   */
  async modifierMessage(messageId: string, content: string): Promise<Message> {
    if (!messageId) {
      throw new Error('L’identifiant du message est obligatoire.');
    }

    if (!content || !content.trim()) {
      throw new Error('Le contenu du message ne peut pas être vide.');
    }

    const params = new HttpParams().set('content', content.trim());

    return await firstValueFrom(
      this.http.put<Message>(`${this.apiUrl}/${messageId}`, null, { params }),
    );
  }

  /**
   * Supprimer un message.
   *
   * Endpoint :
   * DELETE /api/v1/messages/{messageId}
   */
  async supprimerMessage(messageId: string): Promise<void> {
    if (!messageId) {
      throw new Error('L’identifiant du message est obligatoire.');
    }

    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${messageId}`));
  }
}
