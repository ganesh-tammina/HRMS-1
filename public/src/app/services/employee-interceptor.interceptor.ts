import { HttpInterceptorFn } from '@angular/common/http';

export const employeeInterceptor: HttpInterceptorFn = (req, next) => {
  // Use a more robust token lookup (covers all potential storage keys)
  const token = localStorage.getItem('access_token') || 
                localStorage.getItem('token') || 
                localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const authReq = req.clone({
    setHeaders: headers,
  });

  return next(authReq);
};