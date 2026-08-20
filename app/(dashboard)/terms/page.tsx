'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Scale,
  ShieldAlert,
  AlertTriangle,
  FileText,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Landmark,
  Compass,
  Printer,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TermsPage() {
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const c = t.disclaimer.comprehensive;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <Link
            href="/auctions"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.dossier.backToCatalog}</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {c.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {c.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="text-xs font-bold gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isEn ? 'Print Terms' : 'Imprimir Aviso'}</span>
          </Button>
        </div>
      </div>

      {/* Primary Legal Statement Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Section 1: Automated Aggregation & Public Records */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <Info className="w-4 h-4" />
            <span>{isEn ? '1. Public Data Aggregation & Clerical Change Notice' : '1. Agregación de Datos Públicos y Avisos de Modificación'}</span>
          </div>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            {c.p1}
          </p>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        {/* Section 2: Non-Advisory & Informational Purpose */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <Scale className="w-4 h-4" />
            <span>{isEn ? '2. Informational Discovery Tool & No Warranties' : '2. Herramienta Informativa y Ausencia de Garantías'}</span>
          </div>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            {c.p2}
          </p>
        </div>
      </div>

      {/* Section 3: User Responsibility & Mandatory Due Diligence Alert Box */}
      <div className="bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-100">
              {c.userResponsibilityTitle}
            </h2>
            <p className="text-sm text-amber-900/90 dark:text-amber-200/90 leading-relaxed font-medium">
              {c.userResponsibilityBody}
            </p>
          </div>
        </div>

        {/* Essential Due Diligence Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/60 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {isEn ? 'Title & Lien Registry Audit' : 'Estudio de Registro y Gravámenes'}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {isEn ? 'Verify mortgage rank and active court liens on Folio Real.' : 'Verificar grado hipotecario y purga de gravámenes en Folio Real.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/60 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {isEn ? 'Cadastral Plan Verification' : 'Concordancia Catastral (SNIT/SIRI)'}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {isEn ? 'Confirm survey plan boundaries, surface area, and road access.' : 'Confirmar linderos, cabida superficial y frente a calle pública.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/60 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {isEn ? 'Municipal & HOA Tax Clearance' : 'Solvencia de Impuestos Municipales'}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {isEn ? 'Check territorial taxes and condominium maintenance reserves.' : 'Revisar impuestos territoriales y cuotas condominales pendientes.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/60 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {isEn ? 'Court Case File & Physical Inspection' : 'Expediente Judicial y Visita Física'}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {isEn ? 'Inspect physical possession status and judicial docket resolution.' : 'Inspeccionar ocupación física y resoluciones del despacho judicial.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Limitation of Liability Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>{c.liabilityTitle}</span>
        </div>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {c.liabilityBody}
        </p>
      </div>

      {/* Section 5: Official Costa Rican Public Portals & Registry Links */}
      <div className="bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{c.officialSourcesTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {c.officialSourcesBody}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://www.rnpdigital.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Registro Nacional de Costa Rica</p>
                <p className="text-[11px] text-slate-500 font-normal">rnpdigital.com (Folio Real & SIRI)</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
          </a>

          <a
            href="https://www.imprentanacional.go.cr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Boletín Judicial de Costa Rica</p>
                <p className="text-[11px] text-slate-500 font-normal">imprentanacional.go.cr (Edictos Oficiales)</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
          </a>

          <a
            href="https://pj.poder-judicial.go.cr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-2.5">
              <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Poder Judicial de Costa Rica</p>
                <p className="text-[11px] text-slate-500 font-normal">pj.poder-judicial.go.cr (Gestión en Línea)</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
          </a>

          <a
            href="https://www.snitcr.go.cr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">SNIT (Catastro Nacional Digital)</p>
                <p className="text-[11px] text-slate-500 font-normal">snitcr.go.cr (Visualizador Geográfico)</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
          </a>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs text-slate-500">
        <span>{c.lastUpdated}</span>
        <div className="flex items-center gap-3">
          <Link
            href="/auctions"
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {t.nav.catalog}
          </Link>
          <span>•</span>
          <Link
            href="/map"
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {t.nav.map}
          </Link>
        </div>
      </div>
    </div>
  );
}
