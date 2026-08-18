'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Auction } from '@/lib/types/auction';
import { calculateOpportunityAlpha, calculateTitleSecurityRating } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Scale,
  TrendingUp,
  Award,
  CheckCircle2,
  X,
  Zap,
  Info,
  Compass,
  FileCheck2,
} from 'lucide-react';

interface OpportunityRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  auction?: Auction | null;
}

export function OpportunityRatingModal({
  isOpen,
  onClose,
  auction,
}: OpportunityRatingModalProps) {
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState<'property' | 'guide'>(auction ? 'property' : 'guide');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (auction) {
      setActiveView('property');
    } else {
      setActiveView('guide');
    }
  }, [auction]);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const isEn = language === 'en';
  const alpha = auction ? calculateOpportunityAlpha(auction, language) : null;
  const security = auction ? calculateTitleSecurityRating(auction, language) : null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                {isEn ? 'Opportunity Alpha & Title Security Guide' : 'Guía de Calificación de Oportunidad & Título'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn
                  ? 'Understanding investment yield grades (AAA-C) and statutory title rankings'
                  : 'Significado de grados de rentabilidad (AAA-C) y rango registral (Ley 9342)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher (If an auction is selected) */}
        {auction && (
          <div className="px-6 pt-4 pb-1 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView('property')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'property'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'This Property Score Breakdown' : 'Desglose de este Inmueble'}
            </button>
            <button
              type="button"
              onClick={() => setActiveView('guide')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'guide'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'Global Scoring Reference' : 'Criterios Generales de Puntuación'}
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* VIEW 1: Specific Property Score (if available) */}
          {activeView === 'property' && alpha && security && (
            <div className="space-y-5">
              {/* Score Highlight Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-950 to-teal-950/70 border border-emerald-500/40 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                    {isEn ? 'Opportunity Alpha Rating' : 'Calificación de Oportunidad'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black text-white">Grade {alpha.grade}</span>
                    <span className="text-slate-400 font-mono">({alpha.score}/100 pts)</span>
                  </div>
                  <p className="text-xs text-emerald-300 font-semibold mt-0.5">{alpha.label}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    {isEn ? 'Title Security Tier' : 'Nivel de Seguridad Registral'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 mt-1">
                    {security.label}
                  </span>
                </div>
              </div>

              {/* Point Allocation Breakdown */}
              <div className="space-y-2.5">
                <h3 className="font-bold text-slate-300 text-xs uppercase tracking-wider">
                  {isEn ? 'How this score was calculated:' : 'Desglose del puntaje obtenido:'}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">{isEn ? 'Statutory Call Discount' : 'Descuento por Etapa de Remate'}</span>
                    <span className="font-mono font-bold text-emerald-400">+{alpha.stagePoints} / 50 pts</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">{isEn ? 'Valuation Margin Spread' : 'Margen vs. Avalúo'}</span>
                    <span className="font-mono font-bold text-teal-400">+{alpha.marginPoints} / 35 pts</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">{isEn ? 'Asset Liquidity / Type' : 'Liquidez y Tipología'}</span>
                    <span className="font-mono font-bold text-sky-400">+{alpha.assetPoints} / 10 pts</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">{isEn ? 'Public Road Frontage' : 'Frente a Calle Pública'}</span>
                    <span className="font-mono font-bold text-emerald-400">+{alpha.accessPoints} / 5 pts</span>
                  </div>
                </div>
              </div>

              {/* Legal Safety Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{security.priorityName}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {security.tier === 'tier_1'
                    ? isEn
                      ? 'First-degree registered mortgage. Under Article 162 of the Costa Rican Civil Procedure Code (Law 9342), all junior mortgages and secondary liens are automatically cancelled upon judicial decree transfer.'
                      : 'Primer grado hipotecario registrado. Conforme al Artículo 162 del Código Procesal Civil (Ley 9342), los gravámenes e hipotecas inferiores se cancelan automáticamente en la adjudicación judicial.'
                    : security.tier === 'tier_2'
                    ? isEn
                      ? 'Second-degree subordinate mortgage. Requires verifying the balance of the senior 1st mortgage before bidding.'
                      : 'Hipoteca de segundo grado subordinada. Requiere verificar el saldo de la primera hipoteca preferente antes de participar.'
                    : isEn
                    ? 'Unsecured litigation court execution. Prior registered mortgages retain senior collection priority.'
                    : 'Ejecución por embargo judicial. Los acreedores hipotecarios previos conservan prioridad de cobro.'}
                </p>
              </div>
            </div>
          )}

          {/* VIEW 2: Global Reference Guide */}
          {(activeView === 'guide' || !auction) && (
            <div className="space-y-6">
              {/* Section 1: Opportunity Alpha Grades */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-extrabold text-white text-sm">
                    {isEn ? '1. Opportunity Alpha Grading Scale (0 – 100)' : '1. Escala de Calificación de Oportunidad (0 – 100)'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  {isEn
                    ? 'Evaluates the economic upside and resale liquidity of the foreclosure auction:'
                    : 'Evalúa la rentabilidad económica y la liquidez de reventa del remate judicial:'}
                </p>

                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-xs">AAA</span>
                        <strong className="text-white text-xs font-bold">90 – 100 pts</strong>
                        <span className="text-emerald-400 text-xs font-semibold">· {isEn ? 'Exceptional Spread / Prime Liquidity' : 'Oportunidad Extraordinaria'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {isEn
                          ? 'Deep discount (2nd/3rd call), high profit spread (>35%), premium property in a liquid market.'
                          : 'Gran descuento (2° o 3° remate), alto margen (>35%), inmueble de alta demanda y liquidez.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-teal-500/30 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-teal-500 text-slate-950 font-black text-xs">AA</span>
                        <strong className="text-white text-xs font-bold">80 – 89 pts</strong>
                        <span className="text-teal-400 text-xs font-semibold">· {isEn ? 'High Yield Opportunity' : 'Excelente Rentabilidad'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {isEn
                          ? 'Strong statutory discount and healthy margin (>25%). Very attractive risk-adjusted upside.'
                          : 'Sólido descuento de ley y margen atractivo (>25%). Excelente relación riesgo-retorno.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-sky-500/30 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-black text-xs">A</span>
                        <strong className="text-white text-xs font-bold">70 – 79 pts</strong>
                        <span className="text-sky-400 text-xs font-semibold">· {isEn ? 'Solid Investment Margin' : 'Sólido Margen'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {isEn
                          ? 'Healthy commercial margin (18-25%) with solid underlying registered characteristics.'
                          : 'Margen comercial saludable (18-25%) con buenas características registrales.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-xs">B</span>
                        <strong className="text-white text-xs font-bold">55 – 69 pts</strong>
                        <span className="text-amber-400 text-xs font-semibold">· {isEn ? 'Moderate Spread' : 'Margen Moderado'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {isEn
                          ? 'Moderate margin (10-17%) or 1st call base price with standard upside.'
                          : 'Margen moderado (10-17%) o remate en 1° base con descuento estándar.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-700 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-600 text-white font-black text-xs">C</span>
                        <strong className="text-white text-xs font-bold">&lt; 55 pts</strong>
                        <span className="text-slate-400 text-xs font-semibold">· {isEn ? 'Narrow Spread' : 'Margen Reducido'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {isEn
                          ? 'Base price is close to market value; requires strict bidding discipline.'
                          : 'Precio base cercano al valor de mercado; requiere análisis estricto.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Mathematical Weighting */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-extrabold text-white text-sm">
                    {isEn ? '2. Scoring Factors (100 Points Total)' : '2. Factores de Puntuación (100 Puntos Totales)'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-400 block">{isEn ? '1. Statutory Call Rebate (50 pts)' : '1. Rebaja de Ley (50 pts)'}</span>
                    <p className="text-slate-400">
                      {isEn ? 'Call 1 = 15 pts · Call 2 (-25%) = 35 pts · Call 3 (-75%) = 50 pts' : '1° Remate = 15 pts · 2° (-25%) = 35 pts · 3° (-75%) = 50 pts'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-teal-400 block">{isEn ? '2. Valuation Spread (35 pts)' : '2. Margen de Descuento (35 pts)'}</span>
                    <p className="text-slate-400">
                      {isEn ? '≥40% = 35 pts · 28-39% = 28 pts · 18-27% = 18 pts · <18% = 5-10 pts' : '≥40% = 35 pts · 28-39% = 28 pts · 18-27% = 18 pts · <18% = 5-10 pts'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-sky-400 block">{isEn ? '3. Asset Liquidity (10 pts)' : '3. Liquidez del Inmueble (10 pts)'}</span>
                    <p className="text-slate-400">
                      {isEn ? 'Condo / Single-family = 10 pts · Commercial = 8 pts · Land/Lots = 7 pts' : 'Condominio / Casa = 10 pts · Comercial = 8 pts · Lote/Finca = 7 pts'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-400 block">{isEn ? '4. Public Road Access (5 pts)' : '4. Acceso Vial (5 pts)'}</span>
                    <p className="text-slate-400">
                      {isEn ? 'Direct Municipal Road = 5 pts · Private Easement = 2 pts' : 'Calle Pública = 5 pts · Servidumbre = 2 pts'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Title Security Tiers */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-extrabold text-white text-sm">
                    {isEn ? '3. Title Security Tiers (Costa Rica CPC Art. 162)' : '3. Rango Registral y Seguridad (Art. 162 CPC)'}
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <strong className="text-emerald-300 text-xs font-bold">
                        {isEn ? 'Tier 1 · First Mortgage Senior Secured Lien (1° Grado Hipotecario)' : 'Nivel 1 · Primer Grado Hipotecario Preferente'}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isEn
                        ? 'Senior secured lender executing. Under Article 162 of the Costa Rican Civil Procedure Code, judicial adjudication automatically purges and cancels all junior mortgages, secondary liens, and subsequent embargos.'
                        : 'Acreedor de primer grado ejecutando. Conforme al Art. 162 del Código Procesal Civil, la adjudicación en firme ordena la cancelación obligatoria de todos los embargos e hipotecas de grado inferior.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <strong className="text-amber-300 text-xs font-bold">
                        {isEn ? 'Tier 2 · Subordinate Second Mortgage (2° Grado Hipotecario)' : 'Nivel 2 · Segundo Grado Hipotecario Subordinado'}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isEn
                        ? 'Foreclosure by a junior creditor. The prior 1st mortgage may remain or must be satisfied; requires confirming the outstanding senior balance before bidding.'
                        : 'Ejecución por acreedor de segundo grado. La primera hipoteca preferente puede subsistir; se requiere verificar el saldo adeudado previo.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <strong className="text-rose-300 text-xs font-bold">
                        {isEn ? 'Tier 3 · Complex Judicial Embargo (Embargo en Ejecución)' : 'Nivel 3 · Embargo Judicial Complejo'}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isEn
                        ? 'Unsecured personal or commercial litigation execution. Prior registered mortgages and rights retain senior priority over the auction proceeds.'
                        : 'Ejecución por cobro judicial no hipotecario. Los acreedores hipotecarios y derechos registrados previos conservan prelación preferente.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span>{isEn ? 'Art. 162 CPC · Ley 9342 Costa Rica' : 'Art. 162 CPC · Ley 9342 de Costa Rica'}</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700"
          >
            {isEn ? 'Got it' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
