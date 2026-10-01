import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  console.log('🚨 AUTH INTERCEPTOR EXECUTE 🚨');
  console.log('URL interceptée :', req.url);

  /*
   * Angular SSR s'exécute également côté serveur.
   * localStorage n'existe que dans le navigateur.
   */
  if (typeof localStorage === 'undefined') {
    console.log('🖥️ Exécution côté serveur → aucun JWT ajouté');
    return next(req);
  }

  /*
   * Les endpoints d'authentification sont publics.
   * On ne leur envoie pas un ancien JWT éventuellement présent
   * dans le navigateur.
   */
  const endpointsPublics = [
    '/api/auth/login',
    '/api/auth/register'
  ];

  const estEndpointPublic = endpointsPublics.some(
    endpoint => req.url.includes(endpoint)
  );

  if (estEndpointPublic) {
    console.log('🔓 Endpoint public → aucun JWT ajouté');
    return next(req);
  }

  const token = localStorage.getItem('metoa_token');

  console.log('Token :', token ? 'PRESENT' : 'ABSENT');

  if (token) {
    console.log('✅ Ajout du Authorization Bearer');

    const requeteAvecToken = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(requeteAvecToken);
  }

  console.log('⚠️ Aucun token disponible');

  return next(req);
};
