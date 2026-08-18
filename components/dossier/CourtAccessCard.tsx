'use client';

import React, { useState } from 'react';
import { Mail, ExternalLink, Copy, Check, ShieldCheck, FileText, ChevronDown, ChevronUp, Landmark, Sparkles } from 'lucide-react';
import { generatePinRequestEmail } from '@/lib/utils/legal-email';
import { resolveCourtEntry } from '@/lib/constants/courts';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface CourtAccessCardProps {
  expediente: string;
  courtName: string;
  courtEmail?: string;
  fincaNumber?: string;
}

export function CourtAccessCard({
  expediente,
  courtName,
  courtEmail,
  fincaNumber,
}: CourtAccessCardProps) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const resolvedCourt = resolveCourtEntry(courtName);
  const recipientEmail = courtEmail || resolvedCourt.email;

  const emailData = generatePinRequestEmail({
    expediente,
    courtName: courtName || resolvedCourt.name,
    recipientEmail,
    fincaNumber,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(emailData.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isEn = language === 'en';

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-7 text-slate-100 shadow-xl shadow-black/40 relative overflow-hidden space-y-5">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-sky-500/5 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                {isEn ? 'Court Case File & Appraisal Report Access' : 'Acceso a Expediente & Avalúo Judicial'}
              </h3>
              <p className="text-xs text-slate-400">
                {courtName} • <span className="font-mono text-emerald-400 font-bold">Exp: {expediente}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 text-xs rounded-xl bg-sky-500/10 text-sky-300 border border-sky-500/30 font-mono font-bold whitespace-nowrap">
            {isEn ? 'Public Record (Art. 8.1 CPC)' : 'Acceso Público (Art. 8.1 CPC)'}
          </span>
          <span className="px-2.5 py-1 text-[11px] rounded-xl bg-slate-950 border border-slate-800 text-slate-400 font-mono">
            {recipientEmail}
          </span>
        </div>
      </div>

      {/* Explanatory Body */}
      <div className="relative z-10 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
        <p>
          {isEn
            ? 'Court dockets, case motions, and official real estate appraisal reports (dictamen pericial de avalúo con fotografías) are public records in Costa Rica under Article 24 of the Constitution and Art. 8.1 of the Civil Procedure Code.'
            : 'Los expedientes judiciales, autos y dictámenes periciales con fotografías de avalúo son de acceso público en Costa Rica al amparo del Artículo 24 constitucional y el Artículo 8.1 del Código Procesal Civil.'}
        </p>
        <p className="text-slate-400 text-xs">
          {isEn
            ? 'To inspect the full digitized case file online via the judiciary portal (Gestión en Línea), request your case Consultation PIN (Código de Consulta) directly from the presiding court clerk.'
            : 'Para consultar el expediente digital en la plataforma Gestión en Línea del Poder Judicial, solicite el Código de Consulta (clave de acceso) al despacho judicial.'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 relative z-10">
        {/* Mailto Primary Button */}
        <a
          href={emailData.mailtoUrl}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-black shadow-lg shadow-sky-950/50 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Mail className="w-4 h-4" />
          <span>{isEn ? 'Request PIN from Court via Email' : 'Solicitar Clave al Juzgado por Email'}</span>
        </a>

        {/* Copy Formal Template Button */}
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
            copied
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white'
          }`}
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? (isEn ? 'Copied to Clipboard!' : '¡Texto Copiado!') : (isEn ? 'Copy Legal Petition' : 'Copiar Texto Formal')}</span>
        </button>

        {/* Toggle Template Preview */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-800 transition-all"
        >
          <span>{showPreview ? (isEn ? 'Hide Petition' : 'Ocultar Texto') : (isEn ? 'Preview Petition' : 'Ver Petición')}</span>
          {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* External Link to Gestion en Linea */}
        <a
          href="https://gestionenlinea.poder-judicial.go.cr/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all ml-auto group"
        >
          <FileText className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          <span>{isEn ? 'Open Gestión en Línea Portal' : 'Abrir Gestión en Línea'}</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400" />
        </a>
      </div>

      {/* Collapsible Formal Text Preview */}
      {showPreview && (
        <div className="relative z-10 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
            <div className="pb-2 mb-2 border-b border-slate-800 flex items-center justify-between text-slate-400 font-sans text-[11px]">
              <span><strong>Destinatario:</strong> {recipientEmail}</span>
              <span><strong>Asunto:</strong> {emailData.subject}</span>
            </div>
            {emailData.body}
          </div>
        </div>
      )}
    </div>
  );
}
