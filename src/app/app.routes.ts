import { Routes } from '@angular/router';

import { PublicLayout } from './shared/layout/public-layout/public-layout';
import { Home } from './features/public/home/home';
import { Trajets } from './features/public/trajets/trajets';
import { DetailsTrajet } from './features/public/details-trajet/details-trajet';

import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { ForgotPassword } from './features/auth/forgot-password/forgot-password';

import { Dashboard } from './features/public/client/dashboard/dashboard';

import { authGuard } from './core/guards/auth.guard';
import { ClientLayout } from './shared/layout/client-layout/client-layout';

import { Profil } from './features/client/profil/profil';

import { MesReservations } from './features/public/client/reservations/mes-reservations/mes-reservations';

import { DetailReservation } from './features/client/detail-reservation/detail-reservation';
import { Messagerie } from './features/client/messagerie/messagerie';
import { About } from './features/public/about/about';
import { Contact } from './features/public/contact/contact';

export const routes: Routes = [
  /*
   * ================================
   * ESPACE PUBLIC
   * ================================
   */
  {
    path: '',
    component: PublicLayout,
    children: [
      { path: '', component: Home, title: 'METOA - Voyagez ensemble' },

      { path: 'trajets', component: Trajets, title: 'METOA - Rechercher un trajet' },

      { path: 'trajets/:id', component: DetailsTrajet, title: 'METOA - Détails du trajet' },

      { path: 'about', component: About, title: 'METOA - À propos' },

      { path: 'contact', component: Contact, title: 'METOA - Contact' },

      { path: 'login', component: Login, title: 'METOA - Connexion' },

      { path: 'register', component: Register, title: 'METOA - Inscription' },

      { path: 'forgot-password', component: ForgotPassword, title: 'METOA - Mot de passe oublié' },
    ],
  },

  /*
   * ================================
   * ESPACE CLIENT
   * ================================
   */
  {
    path: 'client',
    component: ClientLayout,
    canActivate: [authGuard],

    children: [
      {
        path: 'dashboard',
        component: Dashboard,
        title: 'METOA - Tableau de bord',
      },

      {
        path: 'trajets',
        component: Trajets,
        title: 'METOA - Mes trajets',
      },

      {
        path: 'trajets/:id',
        component: DetailsTrajet,
        title: 'METOA - Détails du trajet',
      },

      {
        path: 'trajets',
        component: Trajets,
        title: 'METOA - Rechercher un trajet',
      },

      {
        path: 'trajets/:id',
        component: DetailsTrajet,
        title: 'METOA - Détails du trajet',
      },

      {
        path: 'profil',
        component: Profil,
        title: 'METOA - Mon profil',
      },
      {
        path: 'reservations',
        component: MesReservations,
        title: 'METOA - Mes réservations',
      },

      {
        path: 'reservations/:id',
        component: DetailReservation,
        title: 'METOA - Détail de la réservation',
      },

      /*
       * ================================
       * MESSAGERIE
       * ================================
       */

      {
        path: 'messagerie',
        component: Messagerie,
        title: 'METOA - Messagerie',
      },
    ],
  },

  /*
   * ================================
   * ROUTE INCONNUE
   * ================================
   */
  {
    path: '**',
    redirectTo: '',
  },
];
