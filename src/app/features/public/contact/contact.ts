import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  imports: [FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {

  nom = '';
  email = '';
  sujet = '';
  message = '';

  formulaireEnvoye = false;
  erreur = '';

  envoyerMessage(): void {

    this.erreur = '';
    this.formulaireEnvoye = false;

    if (
      !this.nom.trim() ||
      !this.email.trim() ||
      !this.sujet.trim() ||
      !this.message.trim()
    ) {
      this.erreur = 'Veuillez remplir tous les champs.';
      return;
    }

    this.formulaireEnvoye = true;

    console.log('Message de contact :', {
      nom: this.nom,
      email: this.email,
      sujet: this.sujet,
      message: this.message
    });

    this.nom = '';
    this.email = '';
    this.sujet = '';
    this.message = '';
  }
}
