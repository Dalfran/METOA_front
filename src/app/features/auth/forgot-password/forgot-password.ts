import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {

  private formBuilder = inject(FormBuilder);

  formulaireSoumis = false;
  emailEnvoye = false;

  forgotForm = this.formBuilder.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email
      ]
    ]
  });


  get email() {
    return this.forgotForm.controls.email;
  }


  envoyerLien(): void {

    this.formulaireSoumis = true;

    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    console.log(
      'Demande de réinitialisation :',
      this.forgotForm.getRawValue()
    );

    this.emailEnvoye = true;
  }


  nouvelleDemande(): void {

    this.emailEnvoye = false;

    this.formulaireSoumis = false;

    this.forgotForm.reset();
  }

}