import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RutaProtegida } from './components/RutaProtegida';
import { LoginPage } from './features/auth/LoginPage';
import { RegistroPage } from './features/auth/RegistroPage';
import { BibliotecaPage } from './features/estudio/BibliotecaPage';
import { MaterialPage } from './features/estudio/MaterialPage';
import { RepasoPage } from './features/estudio/RepasoPage';
import { MisionPage } from './features/mision/MisionPage';
import { OverworldPage } from './features/overworld/OverworldPage';
import { ResultadoPage } from './features/resultado/ResultadoPage';
import { RetoPage } from './features/reto/RetoPage';
import { TiendaPage } from './features/tienda/TiendaPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegistroPage /> },
  {
    // Todo lo del juego exige sesión válida.
    element: <RutaProtegida />,
    children: [
      { path: '/', element: <OverworldPage /> },
      // Tablón de la fase (RF-18)
      { path: '/mision/:faseId', element: <MisionPage /> },
      // Un intento en curso (se inicia o retoma desde el tablón)
      { path: '/intento/:intentoId', element: <RetoPage /> },
      { path: '/resultado/:intentoId', element: <ResultadoPage /> },
      // Biblioteca de estudio y repaso con tarjetas (CU-09)
      { path: '/estudio', element: <BibliotecaPage /> },
      { path: '/estudio/repaso/:sesionId', element: <RepasoPage /> },
      { path: '/estudio/:faseId', element: <MaterialPage /> },
      // Tienda de objetos (CU-12)
      { path: '/tienda', element: <TiendaPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
