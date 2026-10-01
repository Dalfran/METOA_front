import { Component, inject } from '@angular/core';


import { ReservationFlowService } from '../../../core/services/reservation-flow.service';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { AuthService } from '../../../core/services/AuthService';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly reservationFlowService = inject(ReservationFlowService);

  private readonly route = inject(ActivatedRoute);

  private readonly formBuilder = inject(FormBuilder);

  private readonly router = inject(Router);

  private readonly authService = inject(AuthService);

  afficherMotDePasse = false;
  afficherConfirmation = false;

  formulaireSoumis = false;

  erreurInscription = '';

  inscriptionEnCours = false;

  /*
   * =====================================================
   * FORMULAIRE
   * =====================================================
   */

  registerForm = this.formBuilder.group(
    {
      prenom: ['', [Validators.required, Validators.minLength(2)]],

      nom: ['', [Validators.required, Validators.minLength(2)]],

      email: ['', [Validators.required, Validators.email]],

      telephone: ['', [Validators.required, Validators.minLength(9)]],

      userName: ['', [Validators.required, Validators.minLength(3)]],

      dateNaissance: ['', [Validators.required]],

      lieuNaissance: [''],

      sexe: ['', [Validators.required]],

      motDePasse: ['', [Validators.required, Validators.minLength(6)]],

      confirmationMotDePasse: ['', [Validators.required]],

      accepterConditions: [false, Validators.requiredTrue],
    },

    {
      validators: this.motsDePasseIdentiques,
    },
  );

  /*
   * =====================================================
   * RETURN URL
   * =====================================================
   */

  getReturnUrl(): string | null {
    return this.route.snapshot.queryParamMap.get('returnUrl');
  }

  /*
   * =====================================================
   * GETTERS
   * =====================================================
   */

  get prenom() {
    return this.registerForm.controls.prenom;
  }

  get nom() {
    return this.registerForm.controls.nom;
  }

  get email() {
    return this.registerForm.controls.email;
  }

  get telephone() {
    return this.registerForm.controls.telephone;
  }

  get userName() {
    return this.registerForm.controls.userName;
  }

  get dateNaissance() {
    return this.registerForm.controls.dateNaissance;
  }

  get lieuNaissance() {
    return this.registerForm.controls.lieuNaissance;
  }

  get sexe() {
    return this.registerForm.controls.sexe;
  }

  get motDePasse() {
    return this.registerForm.controls.motDePasse;
  }

  get confirmationMotDePasse() {
    return this.registerForm.controls.confirmationMotDePasse;
  }

  get accepterConditions() {
    return this.registerForm.controls.accepterConditions;
  }

  /*
   * =====================================================
   * VALIDATEUR MOT DE PASSE
   * =====================================================
   */

  private motsDePasseIdentiques(control: AbstractControl): ValidationErrors | null {
    const motDePasse = control.get('motDePasse')?.value;

    const confirmation = control.get('confirmationMotDePasse')?.value;

    if (!motDePasse || !confirmation) {
      return null;
    }

    return motDePasse === confirmation
      ? null
      : {
          motsDePasseDifferents: true,
        };
  }

  /*
   * =====================================================
   * INSCRIPTION
   * =====================================================
   */

  inscription(): void {
    console.log('🔥 BOUTON CRÉER MON COMPTE CLIQUÉ');

    this.formulaireSoumis = true;
    this.erreurInscription = '';

    /*
     * Validation
     */

    if (this.registerForm.invalid) {
      console.log('❌ FORMULAIRE INVALIDE');

      this.registerForm.markAllAsTouched();

      return;
    }

    console.log('✅ FORMULAIRE VALIDE');

    this.inscriptionEnCours = true;

    const donnees = this.registerForm.getRawValue();

    const inscription = {
      nom: donnees.nom!,

      prenom: donnees.prenom!,

      dateNaissance: donnees.dateNaissance || null,

      lieuNaissance: donnees.lieuNaissance || null,

      sexe: donnees.sexe || null,

      telephone: donnees.telephone!,

      userName: donnees.userName!,

      email: donnees.email!,

      passe: donnees.motDePasse!,

      role: 'PASSAGER',
    };

    console.log('📤 Données envoyées :', inscription);

    /*
     * Appel backend
     */

    this.authService.register(inscription).subscribe({
      /*
       * ============================================
       * SUCCÈS
       * ============================================
       */

      next: (reponse) => {
        console.log('✅ Inscription réussie');

        console.log('👤 Utilisateur créé :', reponse.user);

        this.inscriptionEnCours = false;

        const returnUrl = this.getReturnUrl();

        const intention = this.reservationFlowService.recupererIntention();

        console.log('🔄 URL de retour :', returnUrl);

        console.log('💾 Intention de réservation :', intention);

        /*
         * ==========================================
         * PARCOURS RÉSERVATION
         * ==========================================
         */

        if (intention && returnUrl === intention.returnUrl) {
          console.log('🚗 Parcours réservation détecté après inscription');

          this.router.navigateByUrl(returnUrl!);

          return;
        }

        /*
         * ==========================================
         * AUTRE URL DE RETOUR
         * ==========================================
         */

        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);

          return;
        }

        /*
         * ==========================================
         * INSCRIPTION NORMALE
         * ==========================================
         */

        this.router.navigate(['/client/dashboard']);
      },

      /*
       * ============================================
       * ERREUR
       * ============================================
       */

      error: (erreur) => {
        console.error('❌ Erreur inscription :', erreur);

        this.inscriptionEnCours = false;

        if (erreur.status === 409) {
          this.erreurInscription =
            'Cette adresse email, ce numéro de téléphone ou ce nom d’utilisateur est déjà utilisé.';
        } else if (erreur.status === 400) {
          this.erreurInscription = 'Les informations fournies sont invalides.';
        } else {
          this.erreurInscription = 'Impossible de créer le compte. Veuillez réessayer.';
        }
      },
    });
  }

  /*
   * =====================================================
   * MOTS DE PASSE
   * =====================================================
   */

  basculerMotDePasse(): void {
    this.afficherMotDePasse = !this.afficherMotDePasse;
  }

  basculerConfirmation(): void {
    this.afficherConfirmation = !this.afficherConfirmation;
  }
}
