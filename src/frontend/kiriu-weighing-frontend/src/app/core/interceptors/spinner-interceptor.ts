import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { SpinnerService } from '../services/spinner.service';

export const spinnerInterceptor: HttpInterceptorFn = (req, next) => {
  const spinnerService = inject(SpinnerService);

  // Mostrar spinner
  spinnerService.show();

  return next(req).pipe(
    finalize(() => {
      // Ocultar spinner cuando termine la petición
      spinnerService.hide();
    })
  );
};
