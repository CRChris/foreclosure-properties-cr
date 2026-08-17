'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, ArrowRight, Mail, Lock, User, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md">
        {/* Logo Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-950/50">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Crear Perfil de Inversionista
          </h1>
          <p className="text-xs text-slate-400">
            Accede a expedientes, cálculo de rendimiento y seguimiento de remates judiciales.
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Nombre Completo o Razón Social</label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Carlos Rodríguez"
              icon={<User className="w-4 h-4 text-slate-500" />}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Correo Electrónico</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="inversionista@ejemplo.com"
              icon={<Mail className="w-4 h-4 text-slate-500" />}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Contraseña (Mínimo 6 caracteres)</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4 text-slate-500" />}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Interés de Inversión Principal</label>
            <select
              value={investorFocus}
              onChange={(e) => setInvestorFocus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="Residencial / Condominios">Residencial / Condominios de Playa & GAM</option>
              <option value="Fincas / Terrenos">Fincas Agrícolas & Terrenos de Desarrollo</option>
              <option value="Comercial / Industrial">Locales Comerciales & Bodegas Industriales</option>
              <option value="Luxury Estates">Propiedades de Lujo & Oportunidades Turísticas</option>
            </select>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full font-bold h-10">
            {isLoading ? 'Registrando...' : 'Registrar Cuenta de Inversionista'}
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-2 flex flex-col items-center gap-3 text-center border-t border-slate-800/80">
          <p className="text-xs text-slate-400">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-bold">
              Iniciar Sesión
            </Link>
          </p>

          <Link
            href="/auctions"
            className="text-xs text-slate-400 hover:text-slate-200 font-medium inline-flex items-center gap-1"
          >
            <span>Explorar remates sin registrarse</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
