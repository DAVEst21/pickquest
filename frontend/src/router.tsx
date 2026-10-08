import { ProgresoPage } from './features/progreso/ProgresoPage';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RutaProtegida } from './components/RutaProtegida';
import { LoginPage } from './features/auth/LoginPage';
import { RegistroPage } from './features/auth/RegistroPage';
import { MisionPage } from './features/mision/MisionPage';
import { OverworldPage } from './features/overworld/OverworldPage';
import { ResultadoPage } from './features/resultado/ResultadoPage';
import { RetoPage } from './features/reto/RetoPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegistroPage /> },
  {
    // Todo lo del juego exige sesión válida.
    element: <RutaProtegida />,
    children: [
      { path: '/', element: <OverworldPage /> },
      { path: '/progreso', element: <ProgresoPage /> },
      { path: '/mision/:faseId', element: <MisionPage /> },
      { path: '/reto/:faseId', element: <RetoPage /> },
      { path: '/resultado/:intentoId', element: <ResultadoPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
