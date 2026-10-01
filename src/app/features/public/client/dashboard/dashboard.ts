import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private router = inject(Router);

  utilisateur: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const utilisateurStocke = localStorage.getItem('metoa_user');

      if (utilisateurStocke) {
        try {
          this.utilisateur = JSON.parse(utilisateurStocke);
        } catch (erreur) {
          console.error('Erreur lors de la lecture des informations utilisateur :', erreur);
        }
      }
    }
  }

  get nomComplet(): string {
    if (!this.utilisateur) {
      return 'Voyageur';
    }

    return `${this.utilisateur.prenom ?? ''} ${this.utilisateur.nom ?? ''}`.trim();
  }

  deconnexion(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('metoa_token');
      localStorage.removeItem('metoa_user');
    }

    this.router.navigate(['/login']);
  }
}
