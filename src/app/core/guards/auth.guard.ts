import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {

  const router = inject(Router);

  // Angular SSR : localStorage n'existe pas côté serveur
  if (typeof window === 'undefined') {
    return true;
  }

  const token = localStorage.getItem('metoa_token');

  if (token) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
