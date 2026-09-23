import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './errores';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Un 4xx (404 real, 403 de fase bloqueada...) no mejora reintentando.
      retry: (intentos, error) => {
        const esErrorDelCliente = error instanceof ApiError && error.status >= 400 && error.status < 500;
        return !esErrorDelCliente && intentos < 1;
      },
    },
  },
});
