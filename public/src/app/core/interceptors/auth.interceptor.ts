import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token =
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken');

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(req.clone({ setHeaders: headers }));
};
