import { createBrowserRouter, Navigate } from 'react-router-dom';
import { OverworldPage } from './features/overworld/OverworldPage';
import { MisionPage } from './features/mision/MisionPage';
import { RetoPage } from './features/reto/RetoPage';
import { ResultadoPage } from './features/resultado/ResultadoPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <OverworldPage />,
  },
  {
    path: '/mision/:faseId',
    element: <MisionPage />,
  },
  {
    path: '/reto/:faseId',
    element: <RetoPage />,
  },
  {
    path: '/resultado/:intentoId',
    element: <ResultadoPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
