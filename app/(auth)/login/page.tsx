'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, ArrowRight, Mail, Lock, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email) {
      setErrorMsg('Por favor ingresa tu correo electrónico.');
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      // Offline / Simulation mode: log in locally and redirect
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_session', JSON.stringify({ email, name: email.split('@')[0] }));
      }
      setSuccessMsg('Accediendo a la plataforma...');
      setTimeout(() => {
        router.push('/auctions');
      }, 700);
      return;
    }

    try {
      const supabase = createClient();

      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auctions`,
          },
        });
        if (error) throw error;
        setSuccessMsg('¡Enlace de acceso enviado! Revisa tu bandeja de entrada.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/auctions');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6 backdrop-blur-md">
        {/* Logo Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/50">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            REmatrix<span className="text-emerald-600 dark:text-emerald-400">CR</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Portal de Inteligencia Inmobiliaria Judicial y Remates en Costa Rica
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Correo Electrónico
            </label>
            <Input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              required
            />
          </div>

          {!isMagicLink && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setIsMagicLink(true)}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  ¿Ingresar sin contraseña?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required={!isMagicLink}
              />
            </div>
          )}

          {isMagicLink && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Recibirás un enlace directo para iniciar sesión.</span>
              <button
                type="button"
                onClick={() => setIsMagicLink(false)}
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline ml-2"
              >
                Usar contraseña
              </button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full font-extrabold h-11 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 dark:shadow-emerald-950/60"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Verificando...</span>
            ) : isMagicLink ? (
              <span className="flex items-center gap-2">
                <span>Enviar Magic Link</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Alternative Links */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ¿No tienes cuenta aún?{' '}
            <Link
              href="/register"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Regístrate gratis
            </Link>
          </p>

          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            <Link href="/auctions" className="hover:underline">
              Continuar como invitado al catálogo público
            </Link>
          </p>

          <p className="text-[10.5px] text-slate-400 dark:text-slate-500 pt-1">
            Al ingresar aceptas nuestro{' '}
            <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              Aviso Legal y Términos de Uso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
