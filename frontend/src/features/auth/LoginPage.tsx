import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { mensajeDeError } from '../../services/errores';
import { useLogin } from '../../services/queries';
import { useAuthStore } from '../../store/authStore';
import { BotonEnviar, Campo, MarcoAuth, MensajeError } from './MarcoAuth';

export const LoginPage: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const location = useLocation();
  const desde = (location.state as { desde?: string } | null)?.desde ?? '/';
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (token && !login.isSuccess) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate(desde, { replace: true }) });
  };

  return (
    <MarcoAuth titulo="Iniciar sesión">
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        <Campo etiqueta="Email" nombre="email" tipo="email" valor={email} onCambio={setEmail} autoComplete="email" />
        <Campo
          etiqueta="Contraseña"
          nombre="password"
          tipo="password"
          valor={password}
          onCambio={setPassword}
          autoComplete="current-password"
        />
        <MensajeError mensaje={login.isError ? mensajeDeError(login.error) : null} />
        <BotonEnviar cargando={login.isPending} texto="Entrar" />
      </form>
      <p className="mt-space-lg font-body-sm text-body-sm text-on-surface-variant text-center">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </MarcoAuth>
  );
};
