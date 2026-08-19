'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, ArrowRight, Mail, Lock, User, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [investorFocus, setInvestorFocus] = useState('Residencial / Condominios');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos obligatorios.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'user_session',
          JSON.stringify({ email, name: fullName || email.split('@')[0], investorFocus })
        );
      }
      setSuccessMsg('¡Cuenta de inversionista creada exitosamente!');
      setTimeout(() => {
        router.push('/auctions');
      }, 700);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            investor_focus: investorFocus,
          },
        },
      });

      if (error) throw error;
      setSuccessMsg('¡Registro completado! Revisa tu correo para confirmar tu cuenta.');
      setTimeout(() => {
        router.push('/auctions');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la cuenta.');
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
            Crear Perfil de Inversionista
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Accede a expedientes, cálculo de rendimiento y seguimiento de remates judiciales.
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
              Nombre Completo
            </label>
            <Input
              type="text"
              placeholder="Carlos Rodríguez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User className="w-4 h-4" />}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Correo Electrónico *
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Contraseña (mínimo 6 caracteres) *
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Enfoque de Inversión Preferido
            </label>
            <select
              value={investorFocus}
              onChange={(e) => setInvestorFocus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Residencial / Condominios">Residencial / Casas y Condominios</option>
              <option value="Terrenos / Fincas">Terrenos / Quintas / Fincas</option>
              <option value="Comercial / Oficinas">Comercial / Locales / Oficinas</option>
              <option value="Multi-activo / Oportunidades">Todas las categorías (Mayor Margen)</option>
            </select>
          </div>

          <Button
            type="submit"
            className="w-full font-extrabold h-11 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 dark:shadow-emerald-950/60"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Creando Cuenta...</span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Registrarme como Inversionista</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Benefits Note */}
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Beneficios del Perfil:</span>
          </div>
          <p className="leading-normal text-[11px]">
            Guarda propiedades en tu lista de seguimiento, descarga expedientes en formato iCal / PDF y recibe alertas de nuevos remates.
          </p>
        </div>

        {/* Alternative Links */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
