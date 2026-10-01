import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  ChangeDetectorRef,
  afterNextRender,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { TrajetService } from '../../../core/services/trajet.service';
import { Trajet } from '../../../core/models/trajet.model';

@Component({
  selector: 'app-trajets',
  imports: [FormsModule, RouterLink, DecimalPipe, DatePipe],
  templateUrl: './trajets.html',
  styleUrl: './trajets.css',
})
export class Trajets {
  // =========================================================
  // SERVICES
  // =========================================================

  private readonly trajetService = inject(TrajetService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  // =========================================================
  // RECHERCHE
  // =========================================================

  depart = '';

  destination = '';

  date = '';

  places = 1;

  // =========================================================
  // ETAT
  // =========================================================

  rechercheEffectuee = false;

  chargement = true;

  erreur = '';

  // =========================================================
  // DONNEES
  // =========================================================

  trajets: Trajet[] = [];

  trajetsFiltres: Trajet[] = [];

  // =========================================================
  // PAGINATION
  // =========================================================

  page = 0;

  size = 10;

  totalElements = 0;

  totalPages = 0;

  // =========================================================
  // CONSTRUCTEUR
  // =========================================================

  constructor() {
    /*
     * IMPORTANT avec Angular SSR :
     *
     * On attend le navigateur avant de charger
     * les données protégées par JWT.
     */

    afterNextRender(() => {
      this.chargerTrajets();
    });
  }

  // =========================================================
  // DETECTION ESPACE CLIENT
  // =========================================================

  /**
   * Permet de savoir si le composant est utilisé
   * dans l'espace client.
   *
   * Exemple :
   *
   * /trajets
   * → false
   *
   * /client/trajets
   * → true
   */

  get estEspaceClient(): boolean {
    return this.route.pathFromRoot.some((route) =>
      route.snapshot.url.some((segment) => segment.path === 'client'),
    );
  }

  // =========================================================
  // PREFIXE DE NAVIGATION
  // =========================================================

  /**
   * Retourne le préfixe correspondant au contexte.
   *
   * Visiteur :
   * /trajets
   *
   * Client :
   * /client/trajets
   */

  get prefixeTrajets(): string {
    return this.estEspaceClient ? '/client/trajets' : '/trajets';
  }

  // =========================================================
  // CHARGEMENT DES TRAJETS
  // =========================================================

  chargerTrajets(): void {
    this.chargement = true;

    this.erreur = '';

    this.trajetService.getTrajets(this.page, this.size).subscribe({
      next: (response) => {
        this.trajets = response.content;

        this.trajetsFiltres = response.content;

        this.totalElements = response.page.totalElements;

        this.totalPages = response.page.totalPages;

        this.chargement = false;

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Erreur lors du chargement des trajets :', error);

        this.erreur = this.messageErreur(error);

        this.trajets = [];

        this.trajetsFiltres = [];

        this.totalElements = 0;

        this.totalPages = 0;

        this.chargement = false;

        this.cdr.detectChanges();
      },
    });
  }

  // =========================================================
  // RECHERCHE
  // =========================================================

  rechercher(): void {
    this.rechercheEffectuee = true;

    this.chargement = true;

    this.erreur = '';

    this.page = 0;

    this.executerRecherche();
  }

  // =========================================================
  // RECHERCHE API
  // =========================================================

  private executerRecherche(): void {
    this.trajetService
      .searchTrajets({
        villeDepart: this.depart.trim() || undefined,

        villeDestination: this.destination.trim() || undefined,

        dateDepart: this.date || undefined,

        placesMin: this.places || undefined,

        page: this.page,

        size: this.size,

        sort: 'dateDepart,asc',
      })
      .subscribe({
        next: (response) => {
          this.trajetsFiltres = response.content;

          this.totalElements = response.page.totalElements;

          this.totalPages = response.page.totalPages;

          this.chargement = false;

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error('Erreur lors de la recherche :', error);

          this.erreur = this.messageErreur(error);

          this.trajetsFiltres = [];

          this.totalElements = 0;

          this.totalPages = 0;

          this.chargement = false;

          this.cdr.detectChanges();
        },
      });
  }

  // =========================================================
  // REINITIALISATION
  // =========================================================

  reinitialiser(): void {
    this.depart = '';

    this.destination = '';

    this.date = '';

    this.places = 1;

    this.rechercheEffectuee = false;

    this.page = 0;

    this.erreur = '';

    this.chargerTrajets();
  }

  // =========================================================
  // PAGE SUIVANTE
  // =========================================================

  pageSuivante(): void {
    if (this.page + 1 >= this.totalPages || this.chargement) {
      return;
    }

    this.page++;

    if (this.rechercheEffectuee) {
      this.rechercherPage();
    } else {
      this.chargerTrajets();
    }
  }

  // =========================================================
  // PAGE PRECEDENTE
  // =========================================================

  pagePrecedente(): void {
    if (this.page <= 0 || this.chargement) {
      return;
    }

    this.page--;

    if (this.rechercheEffectuee) {
      this.rechercherPage();
    } else {
      this.chargerTrajets();
    }
  }

  // =========================================================
  // RECHERCHE PAGE COURANTE
  // =========================================================

  private rechercherPage(): void {
    this.chargement = true;

    this.erreur = '';

    this.executerRecherche();
  }

  // =========================================================
  // MESSAGE D'ERREUR
  // =========================================================

  private messageErreur(error: any): string {
    if (error?.status === 401) {
      return 'Votre session a expiré. Veuillez vous reconnecter.';
    }

    if (error?.status === 403) {
      return 'Vous n’avez pas accès aux trajets.';
    }

    if (error?.status === 404) {
      return 'Aucun trajet trouvé.';
    }

    return 'Impossible de charger les trajets.';
  }
  estTrajetPasse(trajet: Trajet): boolean {
    if (trajet.statut === 'TERMINE' || trajet.statut === 'EN_COURS') {
      return true;
    }

    const dateHeureTrajet = new Date(`${trajet.dateDepart}T${trajet.heureDepart}`);

    return dateHeureTrajet.getTime() <= Date.now();
  }

  estTrajetComplet(trajet: Trajet): boolean {
    return trajet.placesDisponibles <= 0;
  }

  estTrajetAnnule(trajet: Trajet): boolean {
    return trajet.statut === 'ANNULE';
  }

  getStatutTrajet(trajet: Trajet): string {
    if (this.estTrajetAnnule(trajet)) {
      return 'Trajet annulé';
    }

    if (this.estTrajetPasse(trajet)) {
      return 'Trajet terminé';
    }

    if (this.estTrajetComplet(trajet)) {
      return 'Trajet complet';
    }

    return 'Disponible';
  }

  getClasseStatutTrajet(trajet: Trajet): string {
    if (this.estTrajetAnnule(trajet)) {
      return 'status-cancelled';
    }

    if (this.estTrajetPasse(trajet)) {
      return 'status-past';
    }

    if (this.estTrajetComplet(trajet)) {
      return 'status-full';
    }

    return 'status-available';
  }
}
