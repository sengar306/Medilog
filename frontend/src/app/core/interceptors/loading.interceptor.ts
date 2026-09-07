import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Show global loader for all API requests except background polling
  const isSilentPoll = req.url.includes('/result/') || req.url.includes('/notifications');
  
  if (!isSilentPoll) {
    loadingService.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (!isSilentPoll) {
        loadingService.hide();
      }
    })
  );
};
