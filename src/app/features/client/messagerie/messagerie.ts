import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';

import {
  CommonModule,
  isPlatformBrowser,
} from '@angular/common';

import {
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import {
  firstValueFrom,
  Subscription,
} from 'rxjs';

import {
  MessagerieService,
  Inbox,
  Message,
  MessageStatusUpdate,
  TypingEvent,
  OnlineStatus,
  Attachment,
} from '../../../core/services/messagerie.service';

import {
  UserService,
} from '../../../core/services/user.service';
import { MessageDeleted, MessageUpdated } from '../../../core/models/messagerie.models';


@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './messagerie.html',
  styleUrl: './messagerie.css',
})
export class Messagerie implements OnInit, OnDestroy {

  // ==========================================================
  // TEMPLATE
  // ==========================================================

  @ViewChild('messagesContainer')
  messagesContainer?: ElementRef<HTMLDivElement>;


  // ==========================================================
  // DONNÉES
  // ==========================================================

  conversations: Inbox[] = [];

  conversationActive: Inbox | null = null;

  messages: Message[] = [];

  messageContent = '';

  recherche = '';

  chargementConversations = false;

  chargementMessages = false;

  envoiEnCours = false;

  erreur = '';

  connecte = false;

  fichierSelectionne: File | null = null;

  apercuFichier: string | null = null;

  uploadEnCours = false;


  // ==========================================================
  // MODIFICATION MESSAGE
  // ==========================================================

  /**
   * Message actuellement en cours de modification.
   */
  messageEnEdition: Message | null = null;

  messageMenuOuvert: string | null = null;

  /**
   * Contenu temporaire du message en modification.
   */
  contenuMessageEnEdition = '';

  /**
   * Indique qu'une modification est en cours
   * d'enregistrement.
   */
  modificationMessageEnCours = false;


  // ==========================================================
  // TYPING
  // ==========================================================

  utilisateurEnTrainDEcrire = false;

  autreUtilisateurEnTrainDEcrire = '';

  afficherChatMobile = false;


  // ==========================================================
  // PRÉSENCE
  // ==========================================================

  /**
   * Stocke la présence de chaque utilisateur.
   *

   */
  utilisateursEnLigne =
    new Map<string, boolean>();


  // ==========================================================
  // INTERNE
  // ==========================================================

  private subscriptions: Subscription[] = [];

  private typingEnCours = false;

  private typingTimeout?: ReturnType<typeof setTimeout>;

  private readonly navigateur: boolean;


  // ==========================================================
  // CONSTRUCTEUR
  // ==========================================================

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly messagerieService: MessagerieService,
    private readonly userService: UserService,
    private readonly cdr: ChangeDetectorRef,

    @Inject(PLATFORM_ID)
    platformId: object,
  ) {
    this.navigateur =
      isPlatformBrowser(platformId);
  }


  // ==========================================================
  // RAFRAÎCHISSEMENT VUE
  // ==========================================================

  private actualiserVue(): void {
    this.cdr.markForCheck();
  }

  toggleMessageMenu(messageId: string): void {
    this.messageMenuOuvert =
      this.messageMenuOuvert === messageId
        ? null
        : messageId;
  }

  getPhotoUtilisateur(
    photoUrl: string | null | undefined
  ): string | null {
    return this.userService.getPhotoUrl(photoUrl);
  }

  // ==========================================================
  // INITIALISATION
  // ==========================================================

  async ngOnInit(): Promise<void> {

    if (!this.navigateur) {
      return;
    }

    await this.initialiserMessagerie();
  }


  private async initialiserMessagerie(): Promise<void> {

    const utilisateur =
      this.getUtilisateurCourant();

    if (!utilisateur) {

      console.warn(
        '⚠️ Aucun utilisateur connecté.',
      );

      await this.router.navigate([
        '/login',
      ]);

      return;
    }

    console.log(
      '🚀 Initialisation de la messagerie METOA',
    );


    // --------------------------------------------------------
    // 1. Écouter les événements WebSocket
    // --------------------------------------------------------

    this.ecouterWebSocket();


    // --------------------------------------------------------
    // 2. Connexion WebSocket
    // --------------------------------------------------------

    this.connecterWebSocket();


    // --------------------------------------------------------
    // 3. Charger les conversations
    // --------------------------------------------------------

    await this.chargerConversations();


    // --------------------------------------------------------
    // 4. Vérifier userId dans URL
    // --------------------------------------------------------

    this.subscriptions.push(

      this.route.queryParamMap.subscribe(
        async (params) => {

          const userId =
            params.get('userId');

          if (!userId) {
            return;
          }

          await this.ouvrirContactDepuisUrl(
            userId,
          );
        },
      ),
    );
  }

  // ==========================================================
// SÉLECTIONNER FICHIER
// ==========================================================

  selectionnerFichier(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const fichier =
      input.files[0];

    // --------------------------------------------------------
    // Taille maximale : 10 Mo
    // --------------------------------------------------------

    if (
      fichier.size >
      10 * 1024 * 1024
    ) {

      this.erreur =
        'Le fichier ne doit pas dépasser 10 Mo.';

      input.value = '';

      this.fichierSelectionne =
        null;

      this.apercuFichier =
        null;

      this.actualiserVue();

      return;
    }

    this.erreur = '';

    this.fichierSelectionne =
      fichier;

    // --------------------------------------------------------
    // Aperçu image
    // --------------------------------------------------------

    if (
      fichier.type.startsWith('image/')
    ) {

      const reader =
        new FileReader();

      reader.onload = () => {

        this.apercuFichier =
          reader.result as string;

        this.actualiserVue();
      };

      reader.readAsDataURL(
        fichier,
      );

    } else {

      this.apercuFichier =
        null;
    }

    this.actualiserVue();
  }

  // ==========================================================
// TYPE FICHIER
// ==========================================================

  private determinerTypeFichier(
    fichier: File,
  ): 'IMAGE' | 'FILE' {

    if (
      fichier.type.startsWith('image/')
    ) {

      return 'IMAGE';
    }

    return 'FILE';
  }

  // ==========================================================
// ANNULER PIÈCE JOINTE
// ==========================================================

  annulerFichier(): void {

    this.fichierSelectionne =
      null;

    this.apercuFichier =
      null;

    const input =
      document.getElementById(
        'message-file-input',
      ) as HTMLInputElement | null;

    if (input) {
      input.value = '';
    }

    this.actualiserVue();
  }


  // ==========================================================
  // OUVRIR CONTACT DEPUIS URL
  // ==========================================================

  private async ouvrirContactDepuisUrl(
    userId: string,
  ): Promise<void> {

    try {

      console.log(
        '👤 Ouverture de la messagerie avec :',
        userId,
      );

      // ------------------------------------------------------
      // Chercher conversation existante
      // ------------------------------------------------------

      const conversationExistante =
        this.conversations.find(
          (conversation) =>
            conversation.otherUserId ===
            userId,
        );

      // ------------------------------------------------------
      // Conversation existante
      // ------------------------------------------------------

      if (conversationExistante) {

        console.log(
          '✅ Conversation existante trouvée :',
          conversationExistante,
        );

        await this.ouvrirConversation(
          conversationExistante,
        );

        return;
      }

      // ------------------------------------------------------
      // Nouveau contact
      // ------------------------------------------------------

      const utilisateur =
        await firstValueFrom(
          this.userService.getUserById(
            userId,
          ),
        );

      const nomComplet =
        `${utilisateur.prenom ?? ''} ${utilisateur.nom ?? ''}`
          .trim();

      this.conversationActive = {

        conversationId: '',

        otherUserId: userId,

        otherUsername:
          nomComplet ||
          'Utilisateur METOA',

        // ✅ PHOTO DE PROFIL DU USER
        otherUserPhoto:
          utilisateur.photoUrl ?? undefined,

        lastMessage:
        undefined,

        lastMessageDate:
        undefined,

        unreadCount: 0,
      };

      this.messages = [];

      this.afficherChatMobile = true;

      // ------------------------------------------------------
      // Reset typing
      // ------------------------------------------------------

      this.utilisateurEnTrainDEcrire =
        false;

      this.autreUtilisateurEnTrainDEcrire =
        '';

      this.actualiserVue();

      console.log(
        '🆕 Nouveau contact préparé :',
        this.conversationActive,
      );

      // ------------------------------------------------------
      // Charger présence initiale
      // ------------------------------------------------------

      await this.chargerPresenceUtilisateur();

    } catch (error) {

      console.error(
        '❌ Impossible de récupérer le contact :',
        error,
      );

      this.conversationActive = {

        conversationId: '',

        otherUserId: userId,

        otherUsername:
          'Utilisateur METOA',

        // Pas de photo si récupération impossible
        otherUserPhoto: undefined,

        lastMessage:
        undefined,

        lastMessageDate:
        undefined,

        unreadCount: 0,
      };

      this.messages = [];

      this.afficherChatMobile = true;

      // ------------------------------------------------------
      // Reset typing
      // ------------------------------------------------------

      this.utilisateurEnTrainDEcrire =
        false;

      this.autreUtilisateurEnTrainDEcrire =
        '';

      this.actualiserVue();

      // ------------------------------------------------------
      // Même si les infos utilisateur échouent,
      // on peut toujours vérifier sa présence.
      // ------------------------------------------------------

      await this.chargerPresenceUtilisateur();
    }
  }
  // ==========================================================
  // WEBSOCKET
  // ==========================================================

  private connecterWebSocket(): void {

    this.messagerieService.connect();
  }


  private ecouterWebSocket(): void {


    // ========================================================
    // ÉTAT CONNEXION
    // ========================================================

    this.subscriptions.push(

      this.messagerieService
        .isConnected$()
        .subscribe((etat) => {

          this.connecte = etat;

          console.log(
            '🔌 État WebSocket :',
            etat,
          );

          this.actualiserVue();
        }),
    );


    // ========================================================
    // NOUVEAU MESSAGE
    // ========================================================

    this.subscriptions.push(

      this.messagerieService
        .getMessages$()
        .subscribe((message) => {

          if (!message) {
            return;
          }

          this.traiterNouveauMessage(
            message,
          );

          this.actualiserVue();
        }),
    );


    // ========================================================
    // MISE À JOUR INBOX
    // ========================================================

    this.subscriptions.push(

      this.messagerieService
        .getInboxUpdates$()
        .subscribe((inbox) => {

          if (!inbox) {
            return;
          }

          this.traiterMiseAJourInbox(
            inbox,
          );

          this.actualiserVue();
        }),
    );


    // ========================================================
    // STATUT MESSAGE
    // ========================================================

    this.subscriptions.push(

      this.messagerieService
        .getMessageStatus$()
        .subscribe((update) => {

          if (!update) {
            return;
          }

          this.traiterStatutMessage(
            update,
          );

          this.actualiserVue();
        }),
    );


    // ========================================================
    // MESSAGE MODIFIÉ
    // ========================================================

    this.subscriptions.push(

      this.messagerieService
        .getMessageUpdated$()
        .subscribe(
          (update: MessageUpdated | null) => {

            if (!update) {
              return;
            }

            console.log(
              '✏️ MESSAGE MODIFIÉ REÇU :',
              update,
            );

            this.traiterMessageModifie(
              update,
            );

            this.actualiserVue();
          },
        ),
    );


    // ========================================================
    // MESSAGE SUPPRIMÉ
    // ========================================================

    this.subscriptions.push(

      this.messagerieService
        .getMessageDeleted$()
        .subscribe(
          (update: MessageDeleted | null) => {

            if (!update) {
              return;
            }

            console.log(
              '🗑️ MESSAGE SUPPRIMÉ REÇU :',
              update,
            );

            this.traiterMessageSupprime(
              update,
            );

            this.actualiserVue();
          },
        ),
    );


    // ========================================================
    // TYPING
    // ========================================================

    this.subscriptions.push(

      this.messagerieService
        .getTyping$()
        .subscribe((event) => {

          if (!event) {
            return;
          }

          console.log(
            '⌨️ ÉVÉNEMENT TYPING REÇU :',
            event,
          );

          this.traiterTyping(event);

          this.actualiserVue();
        }),
    );


    // ========================================================
    // PRÉSENCE
    // ========================================================

    this.subscriptions.push(

      this.messagerieService
        .getOnlineStatus$()
        .subscribe(
          (status: OnlineStatus | null) => {

            if (!status) {
              return;
            }

            console.log(
              '🟢 STATUT PRÉSENCE REÇU :',
              status,
            );

            /*
             * On mémorise la présence de chaque utilisateur.
             */

            this.mettreAJourPresence(
              status,
            );
          },
        ),
    );
  }


  // ==========================================================
  // MESSAGE MODIFIÉ
  // ==========================================================

  private traiterMessageModifie(
    update: MessageUpdated,
  ): void {

    if (!update.messageId) {
      return;
    }


    const index =
      this.messages.findIndex(
        (message) =>
          message.messageId ===
          update.messageId,
      );


    if (index < 0) {

      console.warn(
        '⚠️ Message modifié introuvable :',
        update.messageId,
      );

      return;
    }


    const message =
      this.messages[index];


    this.messages[index] = {

      ...message,

      content:
      update.content,

      edited:
      update.edited,

      deleted:
      update.deleted,
    };


    // --------------------------------------------------------
    // Si le message actuellement modifié était en édition,
    // on ferme le mode édition.
    // --------------------------------------------------------

    if (
      this.messageEnEdition?.messageId ===
      update.messageId
    ) {

      this.annulerModification();
    }


    console.log(
      '✅ Message localement modifié :',
      this.messages[index],
    );
  }


  // ==========================================================
  // MESSAGE SUPPRIMÉ
  // ==========================================================

  private traiterMessageSupprime(
    update: MessageDeleted,
  ): void {

    if (!update.messageId) {
      return;
    }


    const index =
      this.messages.findIndex(
        (message) =>
          message.messageId ===
          update.messageId,
      );


    if (index < 0) {

      console.warn(
        '⚠️ Message supprimé introuvable :',
        update.messageId,
      );

      return;
    }


    const message =
      this.messages[index];


    /*
     * On ne retire PAS le message du tableau.
     *
     * Le backend conserve le message et le marque
     * comme supprimé.
     */

    this.messages[index] = {

      ...message,

      content:
        'Message supprimé',

      deleted:
        true,

      edited:
        message.edited ?? false,

      attachment:
      undefined,
    };


    if (
      this.messageEnEdition?.messageId ===
      update.messageId
    ) {

      this.annulerModification();
    }


    console.log(
      '✅ Message localement supprimé :',
      this.messages[index],
    );
  }


  // ==========================================================
  // COMMENCER MODIFICATION
  // ==========================================================

  commencerModification(
    message: Message,
  ): void {

    if (!this.estMonMessage(message)) {
      return;
    }


    if (message.deleted) {
      return;
    }


    this.messageEnEdition =
      message;


    this.contenuMessageEnEdition =
      message.content ?? '';


    this.modificationMessageEnCours =
      false;


    this.actualiserVue();
  }


  // ==========================================================
  // ANNULER MODIFICATION
  // ==========================================================

  annulerModification(): void {

    this.messageEnEdition =
      null;

    this.contenuMessageEnEdition =
      '';

    this.modificationMessageEnCours =
      false;


    this.actualiserVue();
  }


  // ==========================================================
  // MODIFIER MESSAGE
  // ==========================================================

  async modifierMessage(): Promise<void> {

    if (
      !this.messageEnEdition ||
      !this.contenuMessageEnEdition.trim()
    ) {

      return;
    }


    if (
      this.modificationMessageEnCours
    ) {

      return;
    }


    const message =
      this.messageEnEdition;


    const nouveauContenu =
      this.contenuMessageEnEdition
        .trim();


    /*
     * Ne rien envoyer si le contenu n'a pas changé.
     */

    if (
      nouveauContenu ===
      (message.content ?? '').trim()
    ) {

      this.annulerModification();

      return;
    }


    this.modificationMessageEnCours =
      true;


    try {

      await this.messagerieService
        .modifierMessage(
          message.messageId,
          nouveauContenu,
        );


      /*
       * Le WebSocket diffusera ensuite la modification
       * aux deux utilisateurs.
       */

      this.annulerModification();

    } catch (error) {

      console.error(
        '❌ Erreur modification message :',
        error,
      );


      this.erreur =
        'Impossible de modifier le message.';

      this.modificationMessageEnCours =
        false;


      this.actualiserVue();

      this.messageMenuOuvert = null;
    }
  }


  // ==========================================================
  // SUPPRIMER MESSAGE
  // ==========================================================

  async supprimerMessage(
    message: Message,
  ): Promise<void> {

    if (!this.estMonMessage(message)) {
      return;
    }


    if (message.deleted) {
      return;
    }


    try {

      await this.messagerieService
        .supprimerMessage(
          message.messageId,
        );


      /*
       * Le WebSocket diffusera ensuite la suppression
       * aux deux utilisateurs.
       */

    } catch (error) {

      console.error(
        '❌ Erreur suppression message :',
        error,
      );


      this.erreur =
        'Impossible de supprimer le message.';

      this.actualiserVue();

      this.messageMenuOuvert = null;
    }
  }


  // ==========================================================
  // PRÉSENCE - MISE À JOUR
  // ==========================================================

  private mettreAJourPresence(
    status: OnlineStatus,
  ): void {

    if (!status?.userId) {
      return;
    }


    this.utilisateursEnLigne.set(
      status.userId,
      status.online,
    );


    console.log(
      '🟢 MAP PRÉSENCE MISE À JOUR :',
      {
        userId: status.userId,
        online: status.online,
      },
    );


    this.actualiserVue();
  }


  // ==========================================================
  // PRÉSENCE - VÉRIFIER UTILISATEUR
  // ==========================================================

  estUtilisateurEnLigne(
    userId?: string,
  ): boolean {

    if (!userId) {
      return false;
    }


    return (
      this.utilisateursEnLigne.get(
        userId,
      ) ?? false
    );
  }


  // ==========================================================
  // CHARGER CONVERSATIONS
  // ==========================================================

  async chargerConversations(): Promise<void> {

    const utilisateur =
      this.getUtilisateurCourant();

    if (!utilisateur) {
      return;
    }


    this.chargementConversations =
      true;

    this.erreur = '';

    this.actualiserVue();


    try {

      const page =
        await this.messagerieService
          .getInbox(
            utilisateur.idUser,
          );


      this.conversations =
        page.content ?? [];


      console.log(
        '📥 Conversations chargées :',
        this.conversations,
      );

    } catch (error) {

      console.error(
        '❌ Erreur chargement conversations :',
        error,
      );

      this.erreur =
        'Impossible de charger vos conversations.';

    } finally {

      this.chargementConversations =
        false;

      console.log(
        '✅ Chargement conversations terminé',
      );

      this.actualiserVue();
    }
  }


  // ==========================================================
  // OUVRIR CONVERSATION
  // ==========================================================

  async ouvrirConversation(
    conversation: Inbox,
  ): Promise<void> {

    console.log(
      '💬 Ouverture conversation :',
      conversation,
    );


    // --------------------------------------------------------
    // Définir conversation active
    // --------------------------------------------------------

    this.conversationActive =
      conversation;


    // --------------------------------------------------------
    // Sortir du mode édition
    // --------------------------------------------------------

    this.annulerModification();


    // --------------------------------------------------------
    // Reset typing
    // --------------------------------------------------------

    this.utilisateurEnTrainDEcrire =
      false;

    this.autreUtilisateurEnTrainDEcrire =
      '';

    this.typingEnCours = false;


    if (this.typingTimeout) {

      clearTimeout(
        this.typingTimeout,
      );

      this.typingTimeout =
        undefined;
    }


    // --------------------------------------------------------
    // Affichage mobile
    // --------------------------------------------------------

    this.afficherChatMobile =
      true;


    this.actualiserVue();


    // --------------------------------------------------------
    // Charger présence
    // --------------------------------------------------------

    await this.chargerPresenceUtilisateur();


    // --------------------------------------------------------
    // Conversation virtuelle
    // --------------------------------------------------------

    if (!conversation.conversationId) {

      this.messages = [];

      this.actualiserVue();

      return;
    }


    // --------------------------------------------------------
    // Conversation réelle
    // --------------------------------------------------------

    this.conversationActive =
      conversation;

    this.messages = [];


    this.actualiserVue();


    // --------------------------------------------------------
    // Charger messages
    // --------------------------------------------------------

    await this.chargerMessages(
      conversation.conversationId,
    );


    // --------------------------------------------------------
    // Marquer comme lus
    // --------------------------------------------------------

    await this.marquerCommeLus();


    this.programmerScroll();
  }


  // ==========================================================
  // CHARGER MESSAGES
  // ==========================================================

  async chargerMessages(
    conversationId?: string,
  ): Promise<void> {

    const id =
      conversationId ??
      this.conversationActive
        ?.conversationId;


    if (!id) {

      this.messages = [];

      this.actualiserVue();

      return;
    }


    this.chargementMessages =
      true;

    this.erreur = '';

    this.actualiserVue();


    try {

      const page =
        await this.messagerieService
          .getMessages(id);


      this.messages =
        [...(page.content ?? [])]
          .reverse();


      this.actualiserVue();

      this.programmerScroll();

    } catch (error) {

      console.error(
        '❌ Erreur chargement messages :',
        error,
      );

      this.erreur =
        'Impossible de charger les messages.';

    } finally {

      this.chargementMessages =
        false;

      this.actualiserVue();
    }
  }


  // ==========================================================
  // CHARGER PRÉSENCE UTILISATEUR
  // ==========================================================

  private async chargerPresenceUtilisateur(): Promise<void> {

    if (!this.conversationActive) {
      return;
    }


    const userId =
      this.conversationActive.otherUserId;


    if (!userId) {
      return;
    }


    try {

      console.log(
        '🔎 Vérification présence de :',
        userId,
      );


      const status =
        await this.messagerieService
          .getUserPresence(userId);


      console.log(
        '🟢 PRÉSENCE INITIALE :',
        status,
      );


      /*
       * Vérifier que la conversation n'a pas changé
       * pendant la requête HTTP.
       */

      if (!this.conversationActive) {
        return;
      }


      if (
        this.conversationActive
          .otherUserId !==
        status.userId
      ) {

        console.warn(
          '⚠️ Présence reçue pour un autre utilisateur.',
          {
            reçu: status.userId,
            attendu:
            this.conversationActive
              .otherUserId,
          },
        );

        return;
      }


      this.mettreAJourPresence(
        status,
      );


      console.log(
        status.online
          ? '🟢 UTILISATEUR INITIALEMENT EN LIGNE'
          : '⚪ UTILISATEUR INITIALEMENT HORS LIGNE',

        this.conversationActive
          .otherUsername,
      );

    } catch (error) {

      console.error(
        '❌ Erreur récupération présence :',
        error,
      );


      /*
       * Si aucune information de présence
       * n'existe encore, on considère l'utilisateur
       * hors ligne.
       */

      if (
        !this.utilisateursEnLigne.has(
          userId,
        )
      ) {

        this.utilisateursEnLigne.set(
          userId,
          false,
        );
      }


      this.actualiserVue();
    }
  }


  // ==========================================================
  // ENVOYER MESSAGE
  // ==========================================================


  async envoyerMessage(): Promise<void> {



    const contenu =
      this.messageContent.trim();

    // --------------------------------------------------------
    // Un message doit avoir soit du texte,
    // soit une pièce jointe.
    // --------------------------------------------------------

    if (
      !contenu &&
      !this.fichierSelectionne
    ) {

      return;
    }

    // --------------------------------------------------------
    // Vérifier conversation
    // --------------------------------------------------------

    if (!this.conversationActive) {
      return;
    }

    if (
      !this.conversationActive
        .otherUserId
    ) {

      return;
    }

    // --------------------------------------------------------
    // Vérifier WebSocket
    // --------------------------------------------------------

    if (!this.connecte) {

      this.erreur =
        'La connexion à la messagerie est indisponible.';

      this.actualiserVue();

      return;
    }

    this.envoiEnCours =
      true;

    this.uploadEnCours =
      !!this.fichierSelectionne;

    try {

      const receiverId =
        this.conversationActive
          .otherUserId;

      const conversationId =
        this.conversationActive
          .conversationId ||
        undefined;



      // ------------------------------------------------------
      // Variables pièce jointe
      // ------------------------------------------------------

      let attachment: Attachment | undefined;

      let type:
        'TEXT'
        | 'IMAGE'
        | 'FILE'
        | 'AUDIO' =
        'TEXT';

      // ------------------------------------------------------
      // UPLOAD DU FICHIER
      // ------------------------------------------------------

      if (this.fichierSelectionne) {

        console.log(
          '📎 Upload du fichier :',
          this.fichierSelectionne.name,
        );

        attachment =
          await firstValueFrom(
            this.messagerieService.uploadFile(
              this.fichierSelectionne,
            ),
          );

        type =
          this.determinerTypeFichier(
            this.fichierSelectionne,
          );

        console.log(
          '✅ Fichier uploadé :',
          attachment,
        );
      }

      // ------------------------------------------------------
      // ENVOI WEBSOCKET
      // ------------------------------------------------------

      console.log(
        '📤 Envoi message avec pièce jointe :',
        {
          receiverId,
          conversationId,
          content: contenu,
          type,
          attachment,
        },
      );

      this.messagerieService.sendMessage(
        receiverId,
        contenu,
        conversationId,
        type,
        attachment,
      );

      // ------------------------------------------------------
      // RESET
      // ------------------------------------------------------

      this.messageContent = '';

      this.annulerFichier();

      this.arreterTyping();

    } catch (error) {

      console.error(
        '❌ Erreur envoi message/pièce jointe :',
        error,
      );

      this.erreur =
        'Impossible d’envoyer la pièce jointe.';

    } finally {

      this.envoiEnCours =
        false;

      this.uploadEnCours =
        false;

      this.actualiserVue();
    }
  }

  // ==========================================================
  // CLAVIER
  // ==========================================================

  gererSaisie(): void {

    console.log(
      '⌨️ SAISIE DÉTECTÉE :',
      this.messageContent,
    );


    if (
      !this.messageContent.trim()
    ) {

      this.arreterTyping();

      return;
    }


    this.demarrerTyping();
  }


  gererToucheClavier(
    event: KeyboardEvent,
  ): void {

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      this.arreterTyping();

      this.envoyerMessage();
    }
  }


  // ==========================================================
  // TYPING - DÉMARRER
  // ==========================================================

  private demarrerTyping(): void {

    if (!this.conversationActive) {

      console.warn(
        '⌨️ TYPING : aucune conversation active',
      );

      return;
    }


    if (!this.connecte) {

      console.warn(
        '⌨️ TYPING : WebSocket non connecté',
      );

      return;
    }


    const receiverId =
      this.conversationActive
        .otherUserId;


    const conversationId =
      this.conversationActive
        .conversationId;


    if (!this.typingEnCours) {

      console.log(
        '🔥 DEMARRAGE TYPING',
        {
          receiverId,
          conversationId,
        },
      );


      this.messagerieService.sendTyping(
        receiverId,
        conversationId || undefined,
        true,
      );


      this.typingEnCours =
        true;
    }


    if (this.typingTimeout) {

      clearTimeout(
        this.typingTimeout,
      );
    }


    this.typingTimeout =
      setTimeout(() => {

        this.arreterTyping();

      }, 1500);
  }


  // ==========================================================
  // TYPING - ARRÊTER
  // ==========================================================

  private arreterTyping(): void {

    if (this.typingTimeout) {

      clearTimeout(
        this.typingTimeout,
      );

      this.typingTimeout =
        undefined;
    }


    if (!this.typingEnCours) {
      return;
    }


    if (!this.conversationActive) {

      this.typingEnCours =
        false;

      return;
    }


    if (!this.connecte) {

      this.typingEnCours =
        false;

      return;
    }


    const receiverId =
      this.conversationActive
        .otherUserId;


    const conversationId =
      this.conversationActive
        .conversationId;


    console.log(
      '🛑 ARRÊT TYPING',
      {
        receiverId,
        conversationId,
      },
    );


    this.messagerieService.sendTyping(
      receiverId,
      conversationId || undefined,
      false,
    );


    this.typingEnCours =
      false;


    this.utilisateurEnTrainDEcrire =
      false;

    this.autreUtilisateurEnTrainDEcrire =
      '';


    this.actualiserVue();
  }


  // ==========================================================
  // TYPING - RÉCEPTION
  // ==========================================================

  private traiterTyping(
    event: TypingEvent,
  ): void {

    const utilisateur =
      this.getUtilisateurCourant();


    if (!utilisateur) {
      return;
    }


    if (!this.conversationActive) {

      console.log(
        '⌨️ Typing ignoré : aucune conversation active.',
      );

      return;
    }


    console.log(
      '⌨️ Traitement typing :',
      event,
    );


    // --------------------------------------------------------
    // Vérifier sender
    // --------------------------------------------------------

    if (
      event.senderId !==
      this.conversationActive
        .otherUserId
    ) {

      console.log(
        '⌨️ Typing ignoré : mauvais sender.',
        {
          sender: event.senderId,

          attendu:
          this.conversationActive
            .otherUserId,
        },
      );

      return;
    }


    // --------------------------------------------------------
    // Vérification conversation
    // --------------------------------------------------------

    const conversationActiveId =
      this.conversationActive
        .conversationId;


    const eventConversationId =
      event.conversationId;


    if (
      conversationActiveId &&
      eventConversationId &&
      conversationActiveId !==
      eventConversationId
    ) {

      console.log(
        '⌨️ Typing ignoré : mauvaise conversation.',
        {
          active:
          conversationActiveId,

          event:
          eventConversationId,
        },
      );

      return;
    }


    // --------------------------------------------------------
    // Mise à jour indicateur
    // --------------------------------------------------------

    this.utilisateurEnTrainDEcrire =
      event.typing;


    if (event.typing) {

      this.autreUtilisateurEnTrainDEcrire =
        this.conversationActive
          .otherUsername;

    } else {

      this.autreUtilisateurEnTrainDEcrire =
        '';
    }


    console.log(
      event.typing
        ? '✍️ Utilisateur en train d’écrire...'
        : '✋ Utilisateur a arrêté d’écrire.',
    );


    this.actualiserVue();
  }


  // ==========================================================
  // NOUVEAU MESSAGE
  // ==========================================================

  private traiterNouveauMessage(
    message: Message,
  ): void {

    const utilisateur =
      this.getUtilisateurCourant();


    if (!utilisateur) {
      return;
    }


    if (!this.conversationActive) {

      console.log(
        '📨 Message reçu sans conversation active.',
      );

      return;
    }


    const conversationId =
      this.conversationActive
        .conversationId;


    // --------------------------------------------------------
    // Conversation réelle
    // --------------------------------------------------------

    const messageDeLaConversation =
      conversationId !== '' &&
      message.conversationId ===
      conversationId;


    // --------------------------------------------------------
    // Conversation virtuelle
    // --------------------------------------------------------

    const conversationVirtuelle =
      conversationId === '';


    const messageDuContactVirtuel =
      conversationVirtuelle &&
      (
        message.senderId ===
        this.conversationActive
          .otherUserId ||

        message.receiverId ===
        this.conversationActive
          .otherUserId
      ) &&
      (
        message.senderId ===
        utilisateur.idUser ||

        message.receiverId ===
        utilisateur.idUser
      );


    // --------------------------------------------------------
    // Message hors conversation active
    // --------------------------------------------------------

    if (
      !messageDeLaConversation &&
      !messageDuContactVirtuel
    ) {

      console.log(
        '📨 Message reçu dans une autre conversation :',
        message.conversationId,
      );

      return;
    }


    // --------------------------------------------------------
    // Première création conversation
    // --------------------------------------------------------

    if (
      conversationVirtuelle &&
      message.conversationId
    ) {

      console.log(
        '🆕 Conversation créée automatiquement :',
        message.conversationId,
      );


      this.conversationActive = {

        ...this.conversationActive,

        conversationId:
        message.conversationId,
      };
    }


    // --------------------------------------------------------
    // Éviter doublons
    // --------------------------------------------------------

    const existe =
      this.messages.some(
        (item) =>
          item.messageId ===
          message.messageId,
      );


    if (!existe) {

      this.messages.push(
        message,
      );

      this.programmerScroll();
    }


    // --------------------------------------------------------
    // Message reçu
    // --------------------------------------------------------

    const messageRecu =
      message.receiverId ===
      utilisateur.idUser;


    if (messageRecu) {

      // ------------------------------------------------------
      // Accusé livraison
      // ------------------------------------------------------

      this.messagerieService
        .acknowledgeDelivered(
          message.messageId,
        );


      // ------------------------------------------------------
      // Conversation active
      // ------------------------------------------------------

      const conversationEstActive =
        !!this.conversationActive &&

        this.conversationActive
          .conversationId ===
        message.conversationId;


      if (conversationEstActive) {

        console.log(
          '👁️ Message reçu dans la conversation actuellement ouverte → LU',
        );

        void this.marquerCommeLus();

      } else {

        console.log(
          '📬 Message reçu dans une conversation non ouverte → NON LU',
        );
      }
    }


    // --------------------------------------------------------
    // Nouveau message = arrêter typing
    // --------------------------------------------------------

    this.utilisateurEnTrainDEcrire =
      false;

    this.autreUtilisateurEnTrainDEcrire =
      '';
  }


  // ==========================================================
  // MISE À JOUR INBOX
  // ==========================================================

  private traiterMiseAJourInbox(
    inbox: Inbox,
  ): void {

    const index =
      this.conversations.findIndex(
        (item) =>
          item.conversationId ===
          inbox.conversationId,
      );


    // --------------------------------------------------------
    // Conversation déjà présente
    // --------------------------------------------------------

    if (index >= 0) {

      this.conversations[index] = {

        ...this.conversations[index],

        ...inbox,
      };


      const updated =
        this.conversations.splice(
          index,
          1,
        )[0];


      this.conversations.unshift(
        updated,
      );

    } else {

      // ------------------------------------------------------
      // Nouvelle conversation
      // ------------------------------------------------------

      this.conversations.unshift(
        inbox,
      );
    }


    // --------------------------------------------------------
    // Mise à jour conversation active
    // --------------------------------------------------------

    if (
      this.conversationActive &&

      this.conversationActive
        .otherUserId ===
      inbox.otherUserId
    ) {

      this.conversationActive = {

        ...this.conversationActive,

        conversationId:
        inbox.conversationId,

        otherUsername:
          inbox.otherUsername ||
          this.conversationActive
            .otherUsername,

        otherUserPhoto:
          inbox.otherUserPhoto ??
          this.conversationActive
            .otherUserPhoto,

        lastMessage:
        inbox.lastMessage,

        lastMessageDate:
        inbox.lastMessageDate,

        unreadCount:
        inbox.unreadCount,
      };
    }
  }


  // ==========================================================
  // STATUT MESSAGE
  // ==========================================================

  private traiterStatutMessage(
    update: MessageStatusUpdate,
  ): void {

    console.log(
      '📊 Mise à jour statut reçue :',
      update,
    );


    const message =
      this.messages.find(
        (item) =>
          item.messageId ===
          update.messageId,
      );


    if (!message) {

      console.warn(
        '⚠️ Message introuvable pour mise à jour statut :',
        update.messageId,
      );

      console.log(
        '📋 Messages actuellement présents :',
        this.messages,
      );

      return;
    }


    console.log(
      `🔄 Statut ${message.status} → ${update.status}`,
    );


    message.status =
      update.status;


    this.actualiserVue();
  }


  // ==========================================================
  // MARQUER COMME LU
  // ==========================================================

  private async marquerCommeLus(): Promise<void> {

    const conversationId =
      this.conversationActive
        ?.conversationId;


    if (!conversationId) {
      return;
    }


    try {

      await this.messagerieService
        .markConversationAsRead(
          conversationId,
        );


      if (this.conversationActive) {

        this.conversationActive
          .unreadCount = 0;
      }


      const index =
        this.conversations.findIndex(
          (item) =>
            item.conversationId ===
            conversationId,
        );


      if (index >= 0) {

        this.conversations[index] = {

          ...this.conversations[index],

          unreadCount: 0,
        };
      }


      this.actualiserVue();

    } catch (error) {

      console.error(
        '❌ Erreur marquage messages lus :',
        error,
      );
    }
  }


  // ==========================================================
  // RECHERCHE
  // ==========================================================

  get conversationsFiltrees(): Inbox[] {

    const recherche =
      this.recherche
        .trim()
        .toLowerCase();


    if (!recherche) {
      return this.conversations;
    }


    return this.conversations.filter(
      (conversation) =>
        conversation.otherUsername
          ?.toLowerCase()
          .includes(recherche),
    );
  }


  // ==========================================================
  // UTILISATEUR COURANT
  // ==========================================================

  private getUtilisateurCourant(): any {

    if (!this.navigateur) {
      return null;
    }


    const raw =
      localStorage.getItem(
        'metoa_user',
      );


    if (!raw) {
      return null;
    }


    try {

      return JSON.parse(raw);

    } catch {

      return null;
    }
  }


  // ==========================================================
  // MES MESSAGE ?
  // ==========================================================

  estMonMessage(
    message: Message,
  ): boolean {

    const utilisateur =
      this.getUtilisateurCourant();


    return (
      !!utilisateur &&

      message.senderId ===
      utilisateur.idUser
    );
  }


  // ==========================================================
  // FORMAT DATE MESSAGE
  // ==========================================================

  formatDate(
    date?: string,
  ): string {

    if (!date) {
      return '';
    }


    const value =
      new Date(date);


    if (
      Number.isNaN(
        value.getTime(),
      )
    ) {
      return '';
    }


    return value.toLocaleTimeString(
      'fr-FR',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  }


  // ==========================================================
  // FORMAT DATE CONVERSATION
  // ==========================================================

  formatDateConversation(
    date?: string,
  ): string {

    if (!date) {
      return '';
    }


    const value =
      new Date(date);


    if (
      Number.isNaN(
        value.getTime(),
      )
    ) {
      return '';
    }


    return value.toLocaleDateString(
      'fr-FR',
      {
        day: '2-digit',
        month: '2-digit',
      },
    );
  }


  // ==========================================================
  // INITIALES
  // ==========================================================

  initiales(
    nom?: string,
  ): string {

    if (!nom) {
      return '?';
    }


    const morceaux =
      nom
        .trim()
        .split(/\s+/);


    return morceaux
      .slice(0, 2)
      .map(
        (morceau) =>
          morceau
            .charAt(0)
            .toUpperCase(),
      )
      .join('');
  }


  // ==========================================================
  // RETOUR DASHBOARD
  // ==========================================================

  retour(): void {

    this.router.navigate([
      '/client/dashboard',
    ]);
  }


  // ==========================================================
  // RETOUR LISTE MOBILE
  // ==========================================================

  retourListeMobile(): void {

    this.arreterTyping();

    this.annulerModification();


    this.afficherChatMobile =
      false;


    this.conversationActive =
      null;


    this.utilisateurEnTrainDEcrire =
      false;


    this.autreUtilisateurEnTrainDEcrire =
      '';


    /*
     * On ne vide PAS utilisateursEnLigne.
     */

    this.messages = [];


    this.actualiserVue();
  }


  // ==========================================================
  // SCROLL
  // ==========================================================

  private programmerScroll(): void {

    if (!this.navigateur) {
      return;
    }


    setTimeout(() => {

      const element =
        this.messagesContainer
          ?.nativeElement;


      if (!element) {
        return;
      }


      element.scrollTop =
        element.scrollHeight;

    }, 0);
  }


  // ==========================================================
  // DESTROY
  // ==========================================================

  ngOnDestroy(): void {

    this.arreterTyping();

    this.annulerModification();


    if (this.typingTimeout) {

      clearTimeout(
        this.typingTimeout,
      );

      this.typingTimeout =
        undefined;
    }


    this.subscriptions.forEach(
      (subscription) =>
        subscription.unsubscribe(),
    );


    this.subscriptions = [];
  }
}
