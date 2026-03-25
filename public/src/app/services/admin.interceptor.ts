import { HttpInterceptorFn } from '@angular/common/http';

export const adminInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  // If token exists, attach Authorization header
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  // If no token, pass request as-is
  return next(req);
};




