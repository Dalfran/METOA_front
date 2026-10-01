import { Component, OnInit, inject, ChangeDetectorRef} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { TrajetService } from '../../../core/services/trajet.service';
import { Trajet } from '../../../core/models/trajet.model';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {

  private readonly trajetService = inject(TrajetService);

  private readonly cdr = inject(ChangeDetectorRef);



  trajetsPopulaires: Trajet[] = [];

  chargementTrajets = false;
  erreurTrajets = '';

  ngOnInit(): void {
    this.chargerTrajetsPopulaires();
  }

  chargerTrajetsPopulaires(): void {

    this.chargementTrajets = true;
    this.erreurTrajets = '';

    this.trajetService.searchTrajets({
      statut: 'PLANIFIE',
      placesMin: 1,
      page: 0,
      size: 6,
      sort: 'dateDepart,asc'
    }).subscribe({

      next: (response) => {

        console.log('✅ 6 trajets reçus du backend :', response);

        this.trajetsPopulaires = response.content;

        this.chargementTrajets = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          '❌ Erreur lors du chargement des trajets populaires :',
          error
        );

        this.chargementTrajets = false;

        if (error.status === 401) {

          this.erreurTrajets =
            'Votre session a expiré. Veuillez vous reconnecter.';

        } else if (error.status === 403) {

          this.erreurTrajets =
            'Vous n’avez pas accès aux trajets.';

        } else {

          this.erreurTrajets =
            'Impossible de charger les trajets populaires.';
        }
      }
    });
  }
}
