'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IngestionLog } from '@/lib/types/auction';
import { fetchIngestionLogs } from '@/lib/supabase/db';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDateCR } from '@/lib/utils';
import {
  X,
  Database,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Sparkles,
  FileText,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface IngestionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IngestionLogModal({ isOpen, onClose }: IngestionLogModalProps) {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchIngestionLogs();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching ingestion logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const latestLog = logs[0];

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>{t.ingestionModal.title}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.ingestionModal.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadLogs}
              disabled={loading}
              title="Refresh logs"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Status & Next Run KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Automated Schedule Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {language === 'es' ? 'Frecuencia Automática' : 'Automated Schedule'}
              </span>
              <p className="text-xs font-semibold text-slate-200">
                {language === 'es'
                  ? 'Lunes a Viernes • 8:20 AM (UTC-6)'
                  : 'Monday – Friday • 8:20 AM (UTC-6)'}
              </p>
              <p className="text-[10.5px] text-slate-500">
                {language === 'es'
                  ? 'GitHub Actions Ingestion Pipeline'
                  : 'GitHub Actions Ingestion Pipeline'}
              </p>
            </div>

            {/* Latest Run Status Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {language === 'es' ? 'Última Ejecución' : 'Latest Execution'}
              </span>
              <p className="text-xs font-bold text-white">
                {latestLog ? formatDateCR(latestLog.created_at, language) : 'N/A'}
              </p>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-400">
                {latestLog?.properties_added ? (
                  <>
                    <Sparkles className="w-3 h-3" />
                    +{latestLog.properties_added}{' '}
                    {language === 'es' ? 'remates nuevos agregados' : 'new auctions added'}
                  </>
                ) : (
                  <span>
                    {language === 'es'
                      ? 'Base de datos al día (0 nuevos)'
                      : 'Database up-to-date (0 new)'}
                  </span>
                )}
              </span>
            </div>

            {/* Source of Truth Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                {language === 'es' ? 'Fuente Oficial' : 'Official Data Source'}
              </span>
              <p className="text-xs font-semibold text-slate-200">
                Poder Judicial de Costa Rica
              </p>
              <p className="text-[10.5px] text-slate-400">
                Nexus PJ · Boletín Judicial (nexuspj.poder-judicial.go.cr)
              </p>
            </div>
          </div>

          {/* Logs History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.ingestionModal.runHistory}</span>
              </h3>
              <span className="text-xs text-slate-500">
                {logs.length} {language === 'es' ? 'registros' : 'records'}
              </span>
            </div>

            {loading && logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">
                  {language === 'es' ? 'Consultando historial de Supabase...' : 'Loading Supabase logs...'}
                </p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-xs">{t.ingestionModal.noLogsYet}</p>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 divide-y divide-slate-800/80">
                {logs.map((log) => {
                  const isSuccessWithNew = log.properties_added > 0;
                  const isNoNew = log.status === 'no_new_properties' || log.properties_added === 0;
                  const isError = log.status === 'error';

                  return (
                    <div
                      key={log.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white">
                            {log.run_date}
                          </span>

                          {isSuccessWithNew ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-extrabold text-[10.5px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              +{log.properties_added}{' '}
                              {language === 'es' ? 'Nuevas Propiedades' : 'New Properties'}
                            </span>
                          ) : isError ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-950/90 border border-rose-500/50 text-rose-300 font-bold text-[10.5px] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-400" />
                              {t.ingestionModal.statusError}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-medium text-[10.5px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-slate-400" />
                              {language === 'es' ? 'Sin Propiedades Nuevas (0)' : 'No New Properties (0)'}
                            </span>
                          )}

                          <span className="text-[10.5px] text-slate-500 font-mono">
                            {formatDateCR(log.created_at, language)}
                          </span>
                        </div>

                        {/* Details chips */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span>
                            <strong>{log.total_edicts_found}</strong>{' '}
                            {language === 'es' ? 'edictos analizados' : 'edicts parsed'}
                          </span>
                          <span>•</span>
                          <span>
                            <strong>{log.properties_skipped}</strong>{' '}
                            {language === 'es' ? 'ya existentes' : 'already registered'}
                          </span>
                          <span>•</span>
                          <span>
                            <strong>{log.duration_seconds}s</strong>{' '}
                            {language === 'es' ? 'duración' : 'runtime'}
                          </span>
                        </div>

                        {/* List of Expedientes added if present */}
                        {log.expedientes_added && log.expedientes_added.length > 0 && (
                          <div className="pt-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10.5px] text-slate-500 font-semibold">
                              {language === 'es' ? 'Expedientes:' : 'Dockets:'}
                            </span>
                            {log.expedientes_added.map((exp) => (
                              <span
                                key={exp}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400"
                              >
                                {exp}
                              </span>
                            ))}
                          </div>
                        )}

                        {log.error_message && (
                          <p className="text-xs text-rose-400 font-mono bg-rose-950/40 p-2 rounded border border-rose-900/60">
                            {log.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="text-[11px] text-slate-500">
            {language === 'es'
              ? 'Para consultas directas, revise la tabla public.ingestion_logs en Supabase.'
              : 'Direct SQL queries available on public.ingestion_logs in Supabase.'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors border border-slate-700"
          >
            {t.ingestionModal.close}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
