import {
  ChangeDetectorRef,
  Component,
  afterNextRender,
  inject
} from '@angular/core';

import {
  UserService,
  UserResponse,
  ChangePasswordRequest
} from '../../../core/services/user.service';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ProfilePassagerService
} from '../../../core/services/profile-passager.service';

import {
  ProfilePassagerRequest,
  ProfilePassagerResponse
} from '../../../core/models/profile-passager.model';

import {
  DecimalPipe
} from '@angular/common';

import {
  CurrentUserService
} from '../../../core/services/CurrentUserService';


@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe
  ],
  templateUrl: './profil.html',
  styleUrl: './profil.css',
})
export class Profil {

  // ============================================================
  // SERVICES
  // ============================================================

  private readonly userService =
    inject(UserService);

  private readonly changeDetectorRef =
    inject(ChangeDetectorRef);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly profilePassagerService =
    inject(ProfilePassagerService);

  /**
   * Service centralisé de l'utilisateur connecté.
   *
   * Toute modification de l'utilisateur passe maintenant
   * par ce service afin de synchroniser :
   *
   * - Profil
   * - Navbar
   * - Messagerie
   * - localStorage
   */
  private readonly currentUserService =
    inject(CurrentUserService);


  // ============================================================
  // UTILISATEUR
  // ============================================================

  utilisateur: UserResponse | null = null;

  profilInitialise = false;
  chargement = true;
  erreur = '';

  modeEdition = false;
  modificationEnCours = false;
  messageSucces = '';


  // ============================================================
  // MOT DE PASSE
  // ============================================================

  modeModificationMotDePasse = false;
  modificationMotDePasseEnCours = false;

  messageSuccesMotDePasse = '';
  erreurMotDePasse = '';


  // ============================================================
  // PROFIL PASSAGER
  // ============================================================

  profilPassager: ProfilePassagerResponse | null = null;

  chargementProfilPassager = false;
  erreurProfilPassager = '';

  modeEditionPassager = false;
  modificationPassagerEnCours = false;

  messageSuccesPassager = '';


  // ============================================================
  // PHOTO DE PROFIL
  // ============================================================

  photoSelectionnee: File | null = null;
  photoApercu: string | null = null;

  uploadPhotoEnCours = false;
  suppressionPhotoEnCours = false;

  erreurPhoto = '';
  messagePhoto = '';


  // ============================================================
  // PHOTO DE COUVERTURE
  // ============================================================

  coverSelectionnee: File | null = null;
  coverApercu: string | null = null;

  uploadCoverEnCours = false;
  suppressionCoverEnCours = false;

  erreurCover = '';
  messageCover = '';


  // ============================================================
  // FORMULAIRE UTILISATEUR
  // ============================================================

  profilForm = this.formBuilder.group({

    prenom: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    nom: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    telephone: [
      '',
      [
        Validators.required
      ]
    ],

    email: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ],

    sexe: [
      '',
      Validators.required
    ],

  });


  // ============================================================
  // FORMULAIRE MOT DE PASSE
  // ============================================================

  motDePasseForm = this.formBuilder.group({

    ancienPasse: [
      '',
      [
        Validators.required
      ]
    ],

    nouveauPasse: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(100)
      ]
    ],

    confirmationPasse: [
      '',
      [
        Validators.required
      ]
    ],

  });


  // ============================================================
  // FORMULAIRE PROFIL PASSAGER
  // ============================================================

  profilPassagerForm = this.formBuilder.group({

    adresse: [
      '',
      [
        Validators.minLength(3),
        Validators.maxLength(150)
      ]
    ],

    bio: [
      '',
      [
        Validators.maxLength(500)
      ]
    ],

    preferences: [
      '',
      [
        Validators.minLength(3),
        Validators.maxLength(200)
      ]
    ],

    numeroUrgence: [''],

    typeBagageHabituel: [''],

    moyenPaiementPrefere: [''],

    frequenceVoyage: [''],

  });


  // ============================================================
  // CONSTRUCTEUR
  // ============================================================

  constructor() {

    afterNextRender(() => {

      console.log(
        '🌐 INITIALISATION PROFIL CÔTÉ NAVIGATEUR'
      );

      this.profilInitialise = true;

      this.initialiserProfil();

    });

  }


  // ============================================================
  // RECHARGEMENT APRÈS SUCCÈS
  // ============================================================
  //
  // Conservé pour les anciennes opérations qui pourraient
  // encore en avoir besoin.
  //
  // IMPORTANT :
  // Les photos et la couverture NE déclenchent plus
  // de rechargement.
  // ============================================================

  private rechargerPageApresSucces(): void {

    setTimeout(() => {

      window.location.reload();

    }, 1000);

  }


  // ============================================================
  // INITIALISATION
  // ============================================================

  private initialiserProfil(): void {

    /**
     * On récupère d'abord l'utilisateur depuis
     * CurrentUserService.
     *
     * Cela évite de dépendre directement du localStorage
     * dans ce composant.
     */
    const utilisateurCourant =
      this.currentUserService.utilisateur;


    if (!utilisateurCourant) {

      this.erreur =
        'Utilisateur non connecté.';

      this.chargement = false;

      this.changeDetectorRef.detectChanges();

      return;

    }


    const idUser =
      utilisateurCourant.idUser;


    console.log(
      '🆔 ID UTILISATEUR :',
      idUser
    );


    if (!idUser) {

      this.erreur =
        'Impossible de récupérer l’identifiant utilisateur.';

      this.chargement = false;

      this.changeDetectorRef.detectChanges();

      return;

    }


    this.chargerUtilisateur(idUser);

  }


  // ============================================================
  // RÉCUPÉRATION UTILISATEUR
  // ============================================================

  private chargerUtilisateur(idUser: string): void {

    console.log(
      '🌐 APPEL BACKEND PROFIL'
    );


    this.userService
      .getUserById(idUser)
      .subscribe({

        next: (utilisateur: UserResponse) => {

          console.log(
            '✅ UTILISATEUR RÉCUPÉRÉ :',
            utilisateur
          );


          this.utilisateur =
            utilisateur;


          /**
           * Synchronisation avec CurrentUserService.
           *
           * Très important :
           * si le backend nous retourne une nouvelle version
           * de l'utilisateur, toute l'application doit utiliser
           * cette nouvelle version.
           */
          this.currentUserService
            .setUtilisateur(utilisateur);


          console.log(
            '📸 PHOTO UTILISATEUR :',
            utilisateur.photoUrl
          );


          console.log(
            '🖼️ COUVERTURE UTILISATEUR :',
            utilisateur.coverPhotoUrl
          );


          this.chargerProfilPassager(
            utilisateur.idUser
          );


          this.chargement = false;

          this.remplirFormulaire();

          this.changeDetectorRef.detectChanges();


          console.log(
            '🟢 PROFIL CHARGÉ :',
            this.chargement
          );

        },


        error: (erreur: any) => {

          console.error(
            '❌ ERREUR PROFIL :',
            erreur
          );


          this.erreur =
            'Impossible de récupérer votre profil.';

          this.chargement = false;

          this.changeDetectorRef.detectChanges();

        },

      });

  }


  // ============================================================
  // RÉCUPÉRATION PROFIL PASSAGER
  // ============================================================

  private chargerProfilPassager(
    idUser: string
  ): void {

    console.log(
      '🚌 CHARGEMENT PROFIL PASSAGER'
    );


    this.chargementProfilPassager = true;


    this.profilePassagerService
      .getProfilePassager(idUser)
      .subscribe({

        next: (
          profil: ProfilePassagerResponse
        ) => {

          console.log(
            '✅ PROFIL PASSAGER RÉCUPÉRÉ :',
            profil
          );


          this.profilPassager =
            profil;

          this.erreurProfilPassager = '';

          this.chargementProfilPassager = false;

          this.remplirFormulairePassager();

          this.changeDetectorRef.detectChanges();

        },


        error: (erreur: any) => {

          console.error(
            '❌ ERREUR PROFIL PASSAGER :',
            erreur
          );


          this.chargementProfilPassager = false;


          if (erreur.status === 404) {

            this.erreurProfilPassager =
              'Votre profil passager n’a pas encore été créé.';

          } else {

            this.erreurProfilPassager =
              'Impossible de récupérer votre profil passager.';

          }


          this.changeDetectorRef.detectChanges();

        },

      });

  }


  // ============================================================
  // REMPLIR FORMULAIRE UTILISATEUR
  // ============================================================

  private remplirFormulaire(): void {

    if (!this.utilisateur) {
      return;
    }


    this.profilForm.patchValue({

      prenom:
      this.utilisateur.prenom,

      nom:
      this.utilisateur.nom,

      telephone:
      this.utilisateur.telephone,

      email:
      this.utilisateur.email,

      sexe:
      this.utilisateur.sexe,

    });

  }


  // ============================================================
  // REMPLIR FORMULAIRE PASSAGER
  // ============================================================

  private remplirFormulairePassager(): void {

    if (!this.profilPassager) {
      return;
    }


    this.profilPassagerForm.patchValue({

      adresse:
      this.profilPassager.adresse,

      bio:
        this.profilPassager.bio ?? '',

      preferences:
      this.profilPassager.preferences,

      numeroUrgence:
      this.profilPassager.numeroUrgence,

      typeBagageHabituel:
      this.profilPassager.typeBagageHabituel,

      moyenPaiementPrefere:
      this.profilPassager.moyenPaiementPrefere,

      frequenceVoyage:
        this.profilPassager.frequenceVoyage ?? '',

    });

  }


  // ============================================================
  // CRÉER PROFIL PASSAGER
  // ============================================================

  creerProfilPassager(): void {

    this.messageSuccesPassager = '';

    this.erreurProfilPassager = '';


    this.profilPassagerForm.reset({

      adresse: '',

      bio: '',

      preferences: '',

      numeroUrgence: '',

      typeBagageHabituel: '',

      moyenPaiementPrefere: '',

      frequenceVoyage: '',

    });


    this.modeEditionPassager = true;

    this.changeDetectorRef.detectChanges();

  }


  // ============================================================
  // MODIFIER PROFIL
  // ============================================================

  modifierProfil(): void {

    this.messageSucces = '';

    this.erreur = '';


    this.remplirFormulaire();

    this.modeEdition = true;


    this.changeDetectorRef.detectChanges();

  }


  // ============================================================
  // MODIFIER MOT DE PASSE
  // ============================================================

  modifierMotDePasse(): void {

    this.messageSuccesMotDePasse = '';

    this.erreurMotDePasse = '';


    this.motDePasseForm.reset();

    this.modeModificationMotDePasse = true;


    this.changeDetectorRef.detectChanges();

  }


  // ============================================================
  // MODIFIER PROFIL PASSAGER
  // ============================================================

  modifierProfilPassager(): void {

    this.messageSuccesPassager = '';

    this.erreurProfilPassager = '';


    this.remplirFormulairePassager();

    this.modeEditionPassager = true;


    this.changeDetectorRef.detectChanges();

  }


  // ============================================================
  // ANNULER MODIFICATION UTILISATEUR
  // ============================================================

  annulerModification(): void {

    this.modeEdition = false;

    this.messageSucces = '';

    this.erreur = '';


    this.remplirFormulaire();

    this.changeDetectorRef.detectChanges();

  }


  // ============================================================
  // ANNULER MODIFICATION MOT DE PASSE
  // ============================================================

  annulerModificationMotDePasse(): void {

    this.modeModificationMotDePasse = false;

    this.modificationMotDePasseEnCours = false;

    this.messageSuccesMotDePasse = '';

    this.erreurMotDePasse = '';


    this.motDePasseForm.reset();


    this.changeDetectorRef.detectChanges();

  }


  // ============================================================
  // ANNULER MODIFICATION PASSAGER
  // ============================================================

  annulerModificationPassager(): void {

    this.modeEditionPassager = false;

    this.messageSuccesPassager = '';

    this.erreurProfilPassager = '';


    this.remplirFormulairePassager();

    this.changeDetectorRef.detectChanges();

  }


  // ============================================================
  // MODIFIER MOT DE PASSE
  // ============================================================

  enregistrerNouveauMotDePasse(): void {

    this.messageSuccesMotDePasse = '';

    this.erreurMotDePasse = '';


    if (this.motDePasseForm.invalid) {

      this.motDePasseForm.markAllAsTouched();

      return;

    }


    const valeurs =
      this.motDePasseForm.getRawValue();


    if (
      valeurs.nouveauPasse !==
      valeurs.confirmationPasse
    ) {

      this.erreurMotDePasse =
        'Les nouveaux mots de passe ne correspondent pas.';

      return;

    }


    this.modificationMotDePasseEnCours = true;


    const donnees: ChangePasswordRequest = {

      ancienPasse:
        valeurs.ancienPasse!,

      nouveauPasse:
        valeurs.nouveauPasse!,

      confirmationPasse:
        valeurs.confirmationPasse!,

    };


    console.log(
      '🔐 MODIFICATION MOT DE PASSE'
    );


    this.userService
      .changePassword(donnees)
      .subscribe({

        next: (response) => {

          console.log(
            '✅ MOT DE PASSE MODIFIÉ :',
            response
          );


          this.modificationMotDePasseEnCours = false;

          this.modeModificationMotDePasse = false;

          this.motDePasseForm.reset();


          this.messageSuccesMotDePasse =
            response.message ||
            'Votre mot de passe a été modifié avec succès.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.messageSuccesMotDePasse = '';

          }, 3000);

        },


        error: (erreur: any) => {

          console.error(
            '❌ ERREUR MODIFICATION MOT DE PASSE :',
            erreur
          );


          this.modificationMotDePasseEnCours = false;


          if (erreur.status === 400) {

            this.erreurMotDePasse =
              erreur.error?.message ||
              'Les informations saisies sont invalides.';

          } else if (erreur.status === 401) {

            this.erreurMotDePasse =
              'Votre session a expiré. Veuillez vous reconnecter.';

          } else if (erreur.status === 403) {

            this.erreurMotDePasse =
              'Vous n’êtes pas autorisé à effectuer cette opération.';

          } else if (erreur.status === 404) {

            this.erreurMotDePasse =
              'Utilisateur introuvable.';

          } else {

            this.erreurMotDePasse =
              erreur.error?.message ||
              'Impossible de modifier votre mot de passe. Veuillez réessayer.';

          }


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.erreurMotDePasse = '';

          }, 3000);

        },

      });

  }


  // ============================================================
  // ENREGISTRER MODIFICATIONS UTILISATEUR
  // ============================================================

  enregistrerModifications(): void {

    this.messageSucces = '';

    this.erreur = '';


    if (!this.utilisateur) {

      this.erreur =
        'Utilisateur introuvable.';

      return;

    }


    if (this.profilForm.invalid) {

      this.profilForm.markAllAsTouched();

      return;

    }


    this.modificationEnCours = true;


    const donnees =
      this.profilForm.getRawValue();


    console.log(
      '📤 MODIFICATION PROFIL :',
      donnees
    );


    this.userService
      .updateUser(
        this.utilisateur.idUser,
        {
          prenom: donnees.prenom!,
          nom: donnees.nom!,
          telephone: donnees.telephone!,
          email: donnees.email!,
          sexe: donnees.sexe!,
        }
      )
      .subscribe({

        next: (
          utilisateurModifie: UserResponse
        ) => {

          console.log(
            '✅ PROFIL MODIFIÉ :',
            utilisateurModifie
          );


          this.utilisateur =
            utilisateurModifie;


          /**
           * Synchronisation globale.
           *
           * Avant :
           * localStorage.setItem(...)
           *
           * Maintenant :
           * CurrentUserService gère à la fois
           * le BehaviorSubject et le localStorage.
           */
          this.currentUserService
            .setUtilisateur(
              utilisateurModifie
            );


          this.remplirFormulaire();

          this.modeEdition = false;

          this.modificationEnCours = false;


          this.messageSucces =
            'Votre profil a été modifié avec succès.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.messageSucces = '';

          }, 3000);

        },


        error: (erreur: any) => {

          console.error(
            '❌ ERREUR MODIFICATION PROFIL :',
            erreur
          );


          this.modificationEnCours = false;


          if (erreur.status === 400) {

            this.erreur =
              'Les informations saisies sont invalides.';

          } else if (erreur.status === 409) {

            this.erreur =
              'Cet email ou ce numéro de téléphone est déjà utilisé.';

          } else if (erreur.status === 401) {

            this.erreur =
              'Votre session a expiré. Veuillez vous reconnecter.';

          } else {

            this.erreur =
              'Impossible de modifier votre profil. Veuillez réessayer.';

          }


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.erreur = '';

          }, 3000);

        },

      });

  }


  // ============================================================
  // ENREGISTRER PROFIL PASSAGER
  // ============================================================

  enregistrerProfilPassager(): void {

    this.messageSuccesPassager = '';

    this.erreurProfilPassager = '';


    if (!this.utilisateur) {

      this.erreurProfilPassager =
        'Utilisateur introuvable.';

      return;

    }


    if (this.profilPassagerForm.invalid) {

      this.profilPassagerForm.markAllAsTouched();

      return;

    }


    this.modificationPassagerEnCours = true;


    const valeurs =
      this.profilPassagerForm.getRawValue();


    const donnees: ProfilePassagerRequest = {

      adresse:
        valeurs.adresse!,

      bio:
        valeurs.bio || null,

      preferences:
        valeurs.preferences!,

      numeroUrgence:
        valeurs.numeroUrgence!,

      typeBagageHabituel:
        valeurs.typeBagageHabituel!,

      moyenPaiementPrefere:
        valeurs.moyenPaiementPrefere!,

      frequenceVoyage:
        valeurs.frequenceVoyage || null,

      userId:
      this.utilisateur.idUser,

    };


    const profilExisteDeja =
      !!this.profilPassager;


    const requete$ =
      this.profilPassager

        ? this.profilePassagerService
          .updateProfilePassager(
            this.utilisateur.idUser,
            donnees
          )

        : this.profilePassagerService
          .createProfilePassager(
            this.utilisateur.idUser,
            donnees
          );


    requete$.subscribe({

      next: (profil) => {

        console.log(
          '✅ PROFIL PASSAGER ENREGISTRÉ :',
          profil
        );


        this.profilPassager =
          profil;


        this.modeEditionPassager = false;

        this.modificationPassagerEnCours = false;


        this.messageSuccesPassager =
          profilExisteDeja
            ? 'Profil passager modifié avec succès.'
            : 'Profil passager créé avec succès.';


        this.changeDetectorRef.detectChanges();


        setTimeout(() => {

          this.messageSuccesPassager = '';

        }, 3000);

      },


      error: (erreur: any) => {

        console.error(
          '❌ ERREUR PROFIL PASSAGER :',
          erreur
        );


        this.modificationPassagerEnCours = false;


        if (erreur.status === 400) {

          this.erreurProfilPassager =
            'Les informations saisies sont invalides.';

        } else if (erreur.status === 404) {

          this.erreurProfilPassager =
            'Utilisateur introuvable.';

        } else if (erreur.status === 409) {

          this.erreurProfilPassager =
            'Un profil passager existe déjà.';

        } else if (erreur.status === 401) {

          this.erreurProfilPassager =
            'Votre session a expiré. Veuillez vous reconnecter.';

        } else {

          this.erreurProfilPassager =
            'Impossible d’enregistrer votre profil passager.';

        }


        setTimeout(() => {

          this.erreurProfilPassager = '';

        }, 3000);

      },

    });

  }


  // ============================================================
  // URL PHOTO DE PROFIL
  // ============================================================

  getPhotoProfilUrl(): string | null {

    return this.userService.getPhotoUrl(
      this.utilisateur?.photoUrl
    );

  }


  erreurChargementPhoto(): void {

    console.error(
      '❌ Impossible de charger la photo :',
      this.getPhotoProfilUrl()
    );

  }


  // ============================================================
  // SÉLECTION PHOTO DE PROFIL
  // ============================================================

  selectionnerPhoto(event: Event): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }


    const fichier =
      input.files[0];


    if (!fichier.type.startsWith('image/')) {

      this.erreurPhoto =
        'Veuillez sélectionner une image valide.';

      this.messagePhoto = '';

      return;

    }


    if (fichier.size > 5 * 1024 * 1024) {

      this.erreurPhoto =
        'La photo ne doit pas dépasser 5 Mo.';

      this.messagePhoto = '';

      return;

    }


    this.photoSelectionnee =
      fichier;

    this.erreurPhoto = '';

    this.messagePhoto = '';


    const lecteur =
      new FileReader();


    lecteur.onload = () => {

      this.photoApercu =
        lecteur.result as string;

      this.changeDetectorRef.detectChanges();

    };


    lecteur.readAsDataURL(
      fichier
    );

  }


  // ============================================================
  // UPLOAD PHOTO DE PROFIL
  // ============================================================

  uploaderPhoto(): void {

    if (
      !this.utilisateur ||
      !this.photoSelectionnee
    ) {
      return;
    }


    this.uploadPhotoEnCours = true;

    this.erreurPhoto = '';

    this.messagePhoto = '';


    this.userService
      .uploadPhoto(
        this.utilisateur.idUser,
        this.photoSelectionnee
      )
      .subscribe({

        next: (
          utilisateurModifie: UserResponse
        ) => {

          console.log(
            '✅ PHOTO UTILISATEUR UPLOADÉE :',
            utilisateurModifie
          );


          /**
           * Mise à jour locale du composant.
           */
          this.utilisateur =
            utilisateurModifie;


          /**
           * Mise à jour centrale.
           *
           * Cela déclenche automatiquement :
           *
           * - navbar
           * - messagerie
           * - autres composants abonnés
           *
           * et met également à jour localStorage.
           */
          this.currentUserService
            .setUtilisateur(
              utilisateurModifie
            );


          this.uploadPhotoEnCours = false;

          this.photoSelectionnee = null;

          this.photoApercu = null;


          this.messagePhoto =
            'Votre photo a été mise à jour avec succès.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.messagePhoto = '';

            this.changeDetectorRef.detectChanges();

          }, 3000);

        },


        error: (erreur: any) => {

          console.error(
            '❌ ERREUR UPLOAD PHOTO :',
            erreur
          );


          this.uploadPhotoEnCours = false;


          this.erreurPhoto =
            erreur.error?.message ||
            'Impossible de télécharger votre photo. Veuillez réessayer.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.erreurPhoto = '';

            this.changeDetectorRef.detectChanges();

          }, 3000);

        },

      });

  }


  // ============================================================
  // SUPPRIMER PHOTO DE PROFIL
  // ============================================================

  supprimerPhoto(): void {

    if (!this.utilisateur) {
      return;
    }


    this.suppressionPhotoEnCours = true;

    this.erreurPhoto = '';

    this.messagePhoto = '';


    this.userService
      .deletePhoto(
        this.utilisateur.idUser
      )
      .subscribe({

        next: () => {

          this.suppressionPhotoEnCours = false;

          this.photoApercu = null;

          this.photoSelectionnee = null;


          /**
           * Mise à jour locale.
           */
          if (this.utilisateur) {

            this.utilisateur = {

              ...this.utilisateur,

              photoUrl: null

            };

          }


          /**
           * Synchronisation globale.
           */
          this.currentUserService
            .mettreAJourUtilisateur({

              photoUrl: null

            });


          this.messagePhoto =
            'Votre photo a été supprimée avec succès.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.messagePhoto = '';

            this.changeDetectorRef.detectChanges();

          }, 3000);

        },


        error: (erreur: any) => {

          console.error(
            '❌ ERREUR SUPPRESSION PHOTO :',
            erreur
          );


          this.suppressionPhotoEnCours = false;


          this.erreurPhoto =
            erreur.error?.message ||
            'Impossible de supprimer votre photo. Veuillez réessayer.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.erreurPhoto = '';

            this.changeDetectorRef.detectChanges();

          }, 3000);

        },

      });

  }


  // ============================================================
  // SÉLECTION PHOTO DE COUVERTURE
  // ============================================================

  selectionnerCover(event: Event): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }


    const fichier =
      input.files[0];


    if (!fichier.type.startsWith('image/')) {

      this.erreurCover =
        'Veuillez sélectionner une image valide.';

      this.messageCover = '';

      return;

    }


    if (fichier.size > 5 * 1024 * 1024) {

      this.erreurCover =
        'La photo de couverture ne doit pas dépasser 5 Mo.';

      this.messageCover = '';

      return;

    }


    this.coverSelectionnee =
      fichier;

    this.erreurCover = '';

    this.messageCover = '';


    const lecteur =
      new FileReader();


    lecteur.onload = () => {

      this.coverApercu =
        lecteur.result as string;

      this.changeDetectorRef.detectChanges();

    };


    lecteur.readAsDataURL(
      fichier
    );

  }


  // ============================================================
  // UPLOAD PHOTO DE COUVERTURE
  // ============================================================

  uploaderCover(): void {

    if (
      !this.utilisateur ||
      !this.coverSelectionnee
    ) {
      return;
    }


    this.uploadCoverEnCours = true;

    this.erreurCover = '';

    this.messageCover = '';


    this.userService
      .uploadCoverPhoto(
        this.utilisateur.idUser,
        this.coverSelectionnee
      )
      .subscribe({

        next: (
          utilisateurModifie: UserResponse
        ) => {

          console.log(
            '✅ COUVERTURE UTILISATEUR UPLOADÉE :',
            utilisateurModifie
          );


          /**
           * Mise à jour locale.
           */
          this.utilisateur =
            utilisateurModifie;


          /**
           * Synchronisation globale.
           */
          this.currentUserService
            .setUtilisateur(
              utilisateurModifie
            );


          this.uploadCoverEnCours = false;

          this.coverSelectionnee = null;

          this.coverApercu = null;


          this.messageCover =
            'Votre photo de couverture a été mise à jour avec succès.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.messageCover = '';

            this.changeDetectorRef.detectChanges();

          }, 3000);

        },


        error: (erreur: any) => {

          console.error(
            '❌ ERREUR UPLOAD COUVERTURE :',
            erreur
          );


          this.uploadCoverEnCours = false;


          this.erreurCover =
            erreur.error?.message ||
            'Impossible de télécharger la photo de couverture. Veuillez réessayer.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.erreurCover = '';

            this.changeDetectorRef.detectChanges();

          }, 3000);

        },

      });

  }


  // ============================================================
  // SUPPRIMER PHOTO DE COUVERTURE
  // ============================================================

  supprimerCover(): void {

    if (!this.utilisateur) {
      return;
    }


    this.suppressionCoverEnCours = true;

    this.erreurCover = '';

    this.messageCover = '';


    this.userService
      .deleteCoverPhoto(
        this.utilisateur.idUser
      )
      .subscribe({

        next: () => {

          this.suppressionCoverEnCours = false;

          this.coverApercu = null;

          this.coverSelectionnee = null;


          /**
           * Mise à jour locale.
           */
          if (this.utilisateur) {

            this.utilisateur = {

              ...this.utilisateur,

              coverPhotoUrl: null

            };

          }


          /**
           * Synchronisation globale.
           */
          this.currentUserService
            .mettreAJourUtilisateur({

              coverPhotoUrl: null

            });


          this.messageCover =
            'Votre photo de couverture a été supprimée avec succès.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.messageCover = '';

            this.changeDetectorRef.detectChanges();

          }, 3000);

        },


        error: (erreur: any) => {

          console.error(
            '❌ ERREUR SUPPRESSION COUVERTURE :',
            erreur
          );


          this.suppressionCoverEnCours = false;


          this.erreurCover =
            erreur.error?.message ||
            'Impossible de supprimer la photo de couverture. Veuillez réessayer.';


          this.changeDetectorRef.detectChanges();


          setTimeout(() => {

            this.erreurCover = '';

            this.changeDetectorRef.detectChanges();

          }, 3000);

        },

      });

  }


  // ============================================================
  // URL PHOTO DE COUVERTURE
  // ============================================================

  getCoverPhotoProfilUrl(): string | null {

    return this.userService.getPhotoUrl(
      this.utilisateur?.coverPhotoUrl
    );

  }


  erreurChargementCover(): void {

    console.error(
      '❌ Impossible de charger la couverture :',
      this.getCoverPhotoProfilUrl()
    );

  }


  // ============================================================
  // GETTERS POUR LE TEMPLATE
  // ============================================================

  get prenom() {
    return this.profilForm.controls.prenom;
  }


  get nom() {
    return this.profilForm.controls.nom;
  }


  get telephone() {
    return this.profilForm.controls.telephone;
  }


  get email() {
    return this.profilForm.controls.email;
  }


  get sexe() {
    return this.profilForm.controls.sexe;
  }


  get adressePassager() {
    return this.profilPassagerForm.controls.adresse;
  }


  get bioPassager() {
    return this.profilPassagerForm.controls.bio;
  }


  get preferencesPassager() {
    return this.profilPassagerForm.controls.preferences;
  }


  get numeroUrgencePassager() {
    return this.profilPassagerForm.controls.numeroUrgence;
  }


  get typeBagagePassager() {
    return this.profilPassagerForm.controls.typeBagageHabituel;
  }


  get moyenPaiementPassager() {
    return this.profilPassagerForm.controls.moyenPaiementPrefere;
  }


  get frequenceVoyagePassager() {
    return this.profilPassagerForm.controls.frequenceVoyage;
  }


  get ancienPasse() {
    return this.motDePasseForm.controls.ancienPasse;
  }


  get nouveauPasse() {
    return this.motDePasseForm.controls.nouveauPasse;
  }


  get confirmationPasse() {
    return this.motDePasseForm.controls.confirmationPasse;
  }

}
