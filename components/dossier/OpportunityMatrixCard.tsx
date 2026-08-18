'use client';

import React, { useState } from 'react';
import { Auction } from '@/lib/types/auction';
import { calculateOpportunityAlpha, calculateTitleSecurityRating, formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { OpportunityRatingModal } from '@/components/help/OpportunityRatingModal';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Scale,
  TrendingUp,
  CheckCircle2,
  HelpCircle,
  Award,
  Layers,
  Compass,
  FileCheck2,
} from 'lucide-react';

interface OpportunityMatrixCardProps {
  auction: Auction;
}

export function OpportunityMatrixCard({ auction }: OpportunityMatrixCardProps) {
  const { t, language } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const alpha = calculateOpportunityAlpha(auction, language);
  const security = calculateTitleSecurityRating(auction, language);

  // Grade color scheme
  const gradeColor = {
    AAA: 'from-emerald-400 via-teal-300 to-cyan-400 text-slate-950 ring-emerald-400/50',
    AA: 'from-emerald-500 to-teal-400 text-slate-950 ring-emerald-500/40',
    A: 'from-sky-500 to-blue-400 text-slate-950 ring-sky-500/40',
    B: 'from-amber-500 to-orange-400 text-slate-950 ring-amber-500/40',
    C: 'from-slate-600 to-slate-400 text-slate-950 ring-slate-600/30',
  }[alpha.grade];

  const securityBannerClass = {
    tier_1: 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200',
    tier_2: 'bg-amber-950/60 border-amber-500/50 text-amber-200',
    tier_3: 'bg-rose-950/60 border-rose-500/50 text-rose-200',
  }[security.tier];

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl shadow-black/40 space-y-6 relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>{t.matrix.opportunityAlpha}</span>
            </div>
            <h3 className="text-xl font-extrabold text-white mt-1">
              {language === 'es' ? 'Matriz de Oportunidad & Seguridad Registral' : 'Opportunity & Title Security Matrix'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'es'
                ? 'Evaluación algorítmica multidimensional de margen comercial, liquidez y prelación hipotecaria (Ley 9342)'
                : 'Multi-factor evaluation of discount margin, asset liquidity, and statutory mortgage rank (Law 9342)'}
            </p>
          </div>

          {/* Big Alpha Badge with Click Action */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              title={
                language === 'es'
                  ? 'Haz clic para ver el desglose detallado y los criterios de puntuación'
                  : 'Click to view detailed breakdown & scoring criteria'
              }
              className={`px-4 py-2.5 rounded-2xl bg-gradient-to-r ${gradeColor} flex items-center gap-2.5 shadow-lg ring-2 font-sans hover:scale-105 active:scale-95 transition-transform cursor-pointer text-left`}
            >
              <Award className="w-6 h-6 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Grade</span>
                <span className="text-2xl font-black leading-none block">Alpha {alpha.grade}</span>
              </div>
              <div className="border-l border-slate-950/20 pl-2.5 ml-0.5 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">Score</span>
                <span className="text-2xl font-black font-mono leading-none block">{alpha.score}</span>
              </div>
            </button>
          </div>
        </div>

      {/* Top 2 Columns: Alpha Metrics & Title Security */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Col: Opportunity Breakdown (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>{t.matrix.opportunityAlphaSubtitle}</span>
          </h4>

          {/* Factor 1: Stage Rebate */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">{t.matrix.discountAdvantage}</span>
              <span className="font-mono font-bold text-emerald-400">+{alpha.stagePoints} / 50 pts</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{ width: `${(alpha.stagePoints / 50) * 100}%` }}
              />
            </div>
          </div>

          {/* Factor 2: Valuation Spread */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">{t.matrix.valuationSpread}</span>
              <span className="font-mono font-bold text-teal-400">+{alpha.marginPoints} / 35 pts</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                style={{ width: `${(alpha.marginPoints / 35) * 100}%` }}
              />
            </div>
          </div>

          {/* Factor 3: Asset Liquidity & Road Access */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">{t.matrix.assetLiquidity}</span>
                <span className="font-mono font-bold text-sky-400">+{alpha.assetPoints}/10</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">{t.matrix.roadFrontageFactor}</span>
                <span className="font-mono font-bold text-emerald-400">+{alpha.accessPoints}/5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Title Security & Lien Hierarchy (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>{t.matrix.titleSecurity}</span>
          </h4>

          {/* Security Banner */}
          <div className={`p-4 rounded-2xl border ${securityBannerClass} space-y-2`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold tracking-wide uppercase flex items-center gap-1.5">
                {security.tier === 'tier_1' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : security.tier === 'tier_2' ? (
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                {security.label}
              </span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">
                {security.score}/100
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {security.tier === 'tier_1'
                ? t.matrix.tier1Desc
                : security.tier === 'tier_2'
                ? t.matrix.tier2Desc
                : t.matrix.tier3Desc}
            </p>
          </div>

          {/* Positive Safety Signals List */}
          <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              {language === 'es' ? 'Factores Clave de Seguridad' : 'Key Security Verification Points'}
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {security.keyFactors.map((factor, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Statutory Protection Banner (Costa Rican CPC Art. 162 Grounding) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-950 to-teal-950/70 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <FileCheck2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold text-slate-200">{t.matrix.statutoryProtection}</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              {language === 'es'
                ? 'Conforme al Artículo 162 del Código Procesal Civil, la adjudicación en firme ordena la cancelación de todos los embargos e hipotecas de grado inferior sin costo para el rematante.'
                : 'Under Article 162 of the Costa Rican Civil Procedure Code, final auction adjudication mandates the court clerk to order cancellation of all junior encumbrances.'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 font-mono font-bold whitespace-nowrap shrink-0 text-[11px]">
          {security.legalCitation}
        </span>
      </div>
    </div>

    {/* Explanatory Criteria & Breakdown Pop-up */}
    <OpportunityRatingModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      auction={auction}
    />
  </>
  );
}
