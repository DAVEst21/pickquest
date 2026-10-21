import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { mensajeDeError } from '../../services/errores';
import { useRegistro } from '../../services/queries';
import { useAuthStore } from '../../store/authStore';
import { BotonEnviar, Campo, MarcoAuth, MensajeError } from './MarcoAuth';

export const RegistroPage: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const registro = useRegistro();
  const [email, setEmail] = useState('');
  const [nombreAventurero, setNombreAventurero] = useState('');
  const [password, setPassword] = useState('');

  if (token && !registro.isSuccess) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registro.mutate({ email, nombreAventurero, password }, { onSuccess: () => navigate('/', { replace: true }) });
  };

  return (
    <MarcoAuth titulo="Crear cuenta">
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        <Campo etiqueta="Email" nombre="email" tipo="email" valor={email} onCambio={setEmail} autoComplete="email" />
        <Campo
          etiqueta="Nombre de aventurero"
          nombre="nombreAventurero"
          valor={nombreAventurero}
          onCambio={setNombreAventurero}
          autoComplete="username"
          ayuda="Entre 3 y 30 caracteres: letras, números, guion o guion bajo."
        />
        <Campo
          etiqueta="Contraseña"
          nombre="password"
          tipo="password"
          valor={password}
          onCambio={setPassword}
          autoComplete="new-password"
          ayuda="Mínimo 8 caracteres."
        />
        <MensajeError mensaje={registro.isError ? mensajeDeError(registro.error) : null} />
        <BotonEnviar cargando={registro.isPending} texto="Crear cuenta" />
      </form>
      <p className="mt-space-lg font-body-sm text-body-sm text-on-surface-variant text-center">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </MarcoAuth>
  );
};
