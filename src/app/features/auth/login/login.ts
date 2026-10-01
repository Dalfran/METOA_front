import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { AuthService } from '../../../core/services/AuthService';

import { ReservationFlowService } from '../../../core/services/reservation-flow.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly reservationFlowService = inject(ReservationFlowService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  afficherMotDePasse = false;
  formulaireSoumis = false;
  erreurConnexion = '';
  connexionEnCours = false;

  loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],

    motDePasse: ['', [Validators.required, Validators.minLength(6)]],

    seSouvenir: [false],
  });

  /*
   * =====================================================
   * URL DE RETOUR
   * =====================================================
   */

  getReturnUrl(): string | null {
    return this.route.snapshot.queryParamMap.get('returnUrl');
  }

  /*
   * =====================================================
   * CONTROLES
   * =====================================================
   */

  get email() {
    return this.loginForm.controls.email;
  }

  get motDePasse() {
    return this.loginForm.controls.motDePasse;
  }

  /*
   * =====================================================
   * CONNEXION
   * =====================================================
   */

  connexion(): void {
    this.formulaireSoumis = true;
    this.erreurConnexion = '';

    /*
     * Vérification formulaire
     */
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();

      return;
    }

    this.connexionEnCours = true;

    const donnees = {
      email: this.loginForm.controls.email.value!,
      passe: this.loginForm.controls.motDePasse.value!,
    };

    console.log('🔐 Tentative de connexion :', {
      email: donnees.email,
    });

    this.authService.login(donnees).subscribe({
      /*
       * ================================================
       * SUCCÈS
       * ================================================
       */

        next: (reponse) => {

          console.log(
            '✅ Connexion réussie'
          );

          console.log(
            '👤 Utilisateur connecté :',
            reponse.user
          );

          this.connexionEnCours = false;

          const returnUrl =
            this.getReturnUrl();

          const intention =
            this.reservationFlowService
              .recupererIntention();

          console.log(
            '🔄 URL de retour :',
            returnUrl
          );

          console.log(
            '💾 Intention de réservation :',
            intention
          );

          /*
           * ==========================================
           * PARCOURS RÉSERVATION
           * ==========================================
           */

          if (
            intention &&
            returnUrl === intention.returnUrl
          ) {

            console.log(
              '🚗 Parcours réservation détecté'
            );

            this.router.navigateByUrl(
              returnUrl!
            );

            return;
          }

          /*
           * ==========================================
           * AUTRE URL DE RETOUR
           * ==========================================
           */

          if (returnUrl) {

            this.router.navigateByUrl(
              returnUrl
            );

            return;
          }

          /*
           * ==========================================
           * CONNEXION NORMALE
           * ==========================================
           */

          this.router.navigate([
            '/client/dashboard'
          ]);
        },

      /*
       * ================================================
       * ERREUR
       * ================================================
       */

      error: (erreur) => {
        console.error('❌ Erreur de connexion :', erreur);

        this.connexionEnCours = false;

        if (erreur.status === 401) {
          this.erreurConnexion = 'Email ou mot de passe incorrect.';
        } else if (erreur.status === 403) {
          this.erreurConnexion = 'Votre compte n’est pas autorisé à se connecter.';
        } else {
          this.erreurConnexion = 'Impossible de contacter le serveur. Veuillez réessayer.';
        }
      },
    });
  }

  /*
   * =====================================================
   * MOT DE PASSE
   * =====================================================
   */

  basculerMotDePasse(): void {
    this.afficherMotDePasse = !this.afficherMotDePasse;
  }
}
