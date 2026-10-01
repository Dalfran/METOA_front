import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',

  imports: [RouterLink, RouterLinkActive],

  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  menuOuvert = false;

  toggleMenu(): void {
    this.menuOuvert = !this.menuOuvert;
  }

  fermerMenu(): void {
    this.menuOuvert = false;
  }
}
