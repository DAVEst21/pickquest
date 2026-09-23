import { useAuthStore } from '../store/authStore';
import { ApiError } from './errores';

const API_URL = import.meta.env.VITE_API_URL;

interface OpcionesPeticion {
  method?: 'GET' | 'POST';
  body?: unknown;
}

/**
 * fetch contra el backend: agrega el JWT de la sesión y convierte las
 * respuestas no exitosas en ApiError con el mensaje que manda NestJS.
 * Un 401 con sesión abierta significa token vencido o inválido: se cierra la
 * sesión y la ruta protegida redirige a /login.
 */
export async function http<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, 'Falta configurar VITE_API_URL (ver frontend/.env.example)');
  }
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {};
  if (opciones.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: opciones.method ?? 'GET',
      headers,
      body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }

  const datos: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) {
      useAuthStore.getState().cerrarSesion();
    }
    throw new ApiError(respuesta.status, extraerMensaje(datos, respuesta.status));
  }
  return datos as T;
}

// NestJS responde { message: string | string[] } (string[] con errores de validación).
function extraerMensaje(datos: unknown, status: number): string {
  const mensaje = (datos as { message?: unknown } | null)?.message;
  if (Array.isArray(mensaje)) return mensaje.join('. ');
  if (typeof mensaje === 'string') return mensaje;
  return `Error ${status}`;
}
