'use client';

import React from 'react';
import { Auction } from '@/lib/types/auction';
import { formatCurrency, formatDateCR, getDaysUntilAuction, getLiveAuctionProgressionState } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Calendar,
  Clock,
  DollarSign,
  ShieldAlert,
  Gavel,
  AlertTriangle,
} from 'lucide-react';

interface AuctionCallLadderProps {
  auction: Auction;
  selectedCall: (1 | 2 | 3) | null;
  onSelectCall: (call: 1 | 2 | 3) => void;
  onOpenParticipate?: () => void;
}

export function AuctionCallLadder({
  auction,
  selectedCall,
  onSelectCall,
  onOpenParticipate,
}: AuctionCallLadderProps) {
  const { t, language } = useLanguage();
  const liveState = getLiveAuctionProgressionState(auction);
  const activeCallNumber = liveState.currentCallNumber; // 1 | 2 | 3 | null
  const isPassedCall3 = activeCallNumber === null || liveState.callStage === 'passed_call_3' || liveState.saleStatus === 'deserted';

  const countdown1 = getDaysUntilAuction(auction.auction_date_call_1, language);
  const countdown2 = auction.auction_date_call_2
    ? getDaysUntilAuction(auction.auction_date_call_2, language)
    : null;
  const countdown3 = auction.auction_date_call_3
    ? getDaysUntilAuction(auction.auction_date_call_3, language)
    : null;

  // Call status evaluations:
  const isCall1Active = activeCallNumber === 1;
  const isCall1Past = activeCallNumber === 2 || activeCallNumber === 3 || isPassedCall3;

  const isCall2Active = activeCallNumber === 2;
  const isCall2Past = activeCallNumber === 3 || isPassedCall3;
  const isCall2Upcoming = activeCallNumber === 1;

  const isCall3Active = activeCallNumber === 3;
  const isCall3Past = isPassedCall3;
  const isCall3Upcoming = activeCallNumber === 1 || activeCallNumber === 2;

  // Under Costa Rican CPC (Art. 159), participation deposit is 50% of the base price
  const depositCall1 = auction.base_price_call_1 * 0.5;
  const depositCall2 = auction.base_price_call_2 
    ? auction.base_price_call_2 * 0.5 
    : Math.round(auction.base_price_call_1 * 0.75 * 0.5);
  const depositCall3 = auction.base_price_call_3 
    ? auction.base_price_call_3 * 0.5 
    : Math.round(auction.base_price_call_1 * 0.25 * 0.5);

  return (
    <div className="space-y-4">
      {/* Live Lifecycle State Alerts */}
      {liveState.saleStatus === 'in_progress' || countdown1.isHearing || (countdown2 && countdown2.isHearing) || (countdown3 && countdown3.isHearing) ? (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/90 border border-rose-300 dark:border-rose-500/80 text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 shadow-lg shadow-rose-950/20 dark:shadow-rose-950/50 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-sm font-extrabold tracking-wide uppercase">
              {language === 'es' ? '🔴 Audiencia Judicial en Vivo' : '🔴 Judicial Hearing In Progress'}
            </span>
          </div>
          <span className="text-xs text-rose-700 dark:text-rose-300 font-medium hidden sm:inline">
            {language === 'es'
              ? 'Se está llevando a cabo la diligencia de remate en estrados judiciales.'
              : 'The foreclosure hearing is currently taking place at the courthouse.'}
          </span>
        </div>
      ) : isPassedCall3 ? (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-amber-800 dark:text-amber-300 text-sm">
                {language === 'es'
                  ? '3° Remate Vencido • Todos los Señalamientos Concluidos (Desierto)'
                  : '3rd Call Expired • All Statutory Calls Concluded (Deserted)'}
              </p>
              <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 text-[10px] font-bold uppercase">
                {language === 'es' ? 'Concluido' : 'Concluded'}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              {language === 'es'
                ? 'Los 3 señalamientos de subasta judicial han concluido sin postores adjudicatarios. El expediente entra en fase de liquidación / adjudicación a favor del acreedor ejecutante (Art. 161 Código Procesal Civil).'
                : 'All 3 foreclosure auction calls have concluded without qualifying bids. The docket enters the creditor adjudication phase under Art. 161 of the Costa Rican Civil Procedure Code.'}
            </p>
          </div>
        </div>
      ) : liveState.saleStatus === 'suspended' ? (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-500/50 text-red-900 dark:text-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <div className="text-xs">
            <p className="font-extrabold text-red-800 dark:text-red-300">
              {language === 'es' ? 'Remate Suspendido Judicialmente' : 'Judicially Suspended Auction'}
            </p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">
              {language === 'es'
                ? 'La subasta fue suspendida por resolución judicial o arreglo de pago (Art. 160 Código Procesal Civil).'
                : 'The auction was suspended by court resolution or payment settlement (Art. 160 CPC).'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {t.dossier.auctionCallSchedule}
              </h2>
              {isPassedCall3 ? (
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  {language === 'es' ? 'Subastas Concluidas' : 'Auction Concluded'}
                </span>
              ) : activeCallNumber ? (
                <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs flex items-center gap-1 ${
                  activeCallNumber === 1
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                    : activeCallNumber === 2
                    ? 'bg-yellow-100 dark:bg-yellow-950/80 border border-yellow-300 dark:border-yellow-500/40 text-yellow-800 dark:text-yellow-300'
                    : 'bg-orange-100 dark:bg-orange-950/80 border border-orange-300 dark:border-orange-500/40 text-orange-800 dark:text-orange-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                    activeCallNumber === 1 ? 'bg-emerald-500' : activeCallNumber === 2 ? 'bg-yellow-500' : 'bg-orange-500'
                  }`} />
                  {language === 'es' ? `${activeCallNumber}° Remate Activo` : `Call ${activeCallNumber} Active`}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isPassedCall3
                ? (language === 'es' ? 'Historial de los 3 señalamientos celebrados' : 'Historical record of the 3 statutory auction calls')
                : t.dossier.auctionCallScheduleDesc}
            </p>
          </div>
        </div>

        {onOpenParticipate && (
          isPassedCall3 ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold self-start sm:self-auto">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'es' ? 'Subastas Concluidas (Sin Postores)' : 'Auction Calls Concluded'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenParticipate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 dark:shadow-emerald-950/60 ring-1 ring-emerald-400/30 self-start sm:self-auto"
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>
                {selectedCall
                  ? (language === 'es' ? `Participar en ${selectedCall}° Remate` : `Participate in Call ${selectedCall}`)
                  : (language === 'es' ? 'Participar en este Remate' : 'Participate in this Auction')}
              </span>
            </button>
          )
        )}
      </div>

      {/* 3-Call Cards Ladder Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CALL 1 (100% Base - Green) */}
        <div
          onClick={() => onSelectCall(1)}
          className={`relative p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm ${
            isCall1Active
              ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-950/10 dark:shadow-emerald-950/50'
              : isCall1Past
              ? (selectedCall === 1
                  ? 'bg-slate-100 dark:bg-slate-950/80 border-slate-400 dark:border-slate-700 ring-1 ring-slate-500 opacity-90'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 opacity-75 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700')
              : (selectedCall === 1
                  ? 'bg-white dark:bg-slate-900 border-slate-400 dark:border-slate-700 ring-1 ring-slate-500'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/90')
          }`}
        >
          {isCall1Active && (
            <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md animate-pulse">
              {countdown1.isHearing
                ? (language === 'es' ? 'En Audiencia Judicial' : 'In Hearing')
                : (language === 'es' ? 'Señalamiento Actual' : 'Active Call')}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black tracking-wider uppercase flex items-center gap-1 ${
                isCall1Active ? 'text-emerald-600 dark:text-emerald-400' : isCall1Past ? 'text-slate-500 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                <span>{t.card.firstCall}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isCall1Active
                    ? 'bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  100% Base
                </span>
              </span>
              <Badge
                variant={
                  countdown1.isHearing
                    ? 'danger'
                    : isCall1Past
                    ? 'default'
                    : isCall1Active
                    ? 'success'
                    : 'default'
                }
                size="sm"
              >
                {countdown1.isHearing 
                  ? (language === 'es' ? 'En Audiencia' : 'In Hearing') 
                  : isCall1Past 
                  ? (language === 'es' ? 'Desierto' : 'Past') 
                  : countdown1.label}
              </Badge>
            </div>

            <div>
              <p className={`text-2xl font-extrabold tracking-tight font-mono ${isCall1Active ? 'text-slate-900 dark:text-white' : isCall1Past ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {formatCurrency(auction.base_price_call_1, auction.currency)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{formatDateCR(auction.auction_date_call_1, language)}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>{t.dossier.legalDeposit}:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(depositCall1, auction.currency)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {t.dossier.legalDepositNotice}
            </p>
          </div>
        </div>

        {/* CALL 2 (75% Base / -25% Rebaja - Yellow) */}
        {auction.base_price_call_2 && auction.auction_date_call_2 ? (
          <div
            onClick={() => onSelectCall(2)}
            className={`relative p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm ${
              isCall2Active
                ? 'bg-white dark:bg-slate-900 border-yellow-500 ring-2 ring-yellow-500/40 shadow-xl shadow-yellow-950/10 dark:shadow-yellow-950/50'
                : isCall2Past
                ? (selectedCall === 2
                    ? 'bg-slate-100 dark:bg-slate-950/80 border-slate-400 dark:border-slate-700 ring-1 ring-slate-500 opacity-90'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 opacity-75 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700')
                : (selectedCall === 2
                    ? 'bg-white dark:bg-slate-900 border-slate-400 dark:border-slate-700 ring-1 ring-slate-500'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-yellow-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/90')
            }`}
          >
            {isCall2Active && (
              <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-yellow-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md animate-pulse">
                {countdown2?.isHearing
                  ? (language === 'es' ? 'En Audiencia Judicial' : 'In Hearing')
                  : (language === 'es' ? 'Señalamiento Actual' : 'Active Call')}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black tracking-wider uppercase flex items-center gap-1 ${
                  isCall2Active ? 'text-yellow-600 dark:text-yellow-400' : isCall2Past ? 'text-slate-500 dark:text-slate-400' : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  <span>{t.card.secondCall}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isCall2Active
                      ? 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800/60 text-yellow-800 dark:text-yellow-300'
                      : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    -25%
                  </span>
                </span>
                {countdown2 && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                    countdown2.isHearing
                      ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:border-rose-500/60 dark:text-rose-300'
                      : isCall2Past
                      ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-400'
                      : isCall2Active
                      ? 'bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/80 dark:border-yellow-500/60 dark:text-yellow-300'
                      : 'bg-yellow-50/60 text-yellow-800 border-yellow-200 dark:bg-yellow-950/60 dark:border-yellow-700/40 dark:text-yellow-300'
                  }`}>
                    {countdown2.isHearing
                      ? (language === 'es' ? 'En Audiencia' : 'In Hearing')
                      : isCall2Past
                      ? (language === 'es' ? 'Desierto' : 'Past')
                      : countdown2.label}
                  </span>
                )}
              </div>

              <div>
                <p className={`text-2xl font-extrabold tracking-tight font-mono ${isCall2Active ? 'text-slate-900 dark:text-white' : isCall2Past ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {formatCurrency(auction.base_price_call_2, auction.currency)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{formatDateCR(auction.auction_date_call_2, language)}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>{t.dossier.legalDeposit}:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(depositCall2, auction.currency)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {isCall2Active
                  ? (language === 'es'
                      ? 'Señalamiento activo con rebaja legal del 25%.'
                      : 'Active stage with statutory 25% reduction.')
                  : (language === 'es'
                      ? 'Se abre automáticamente si el 1er remate queda desierto.'
                      : 'Triggers automatically if the 1st call receives no qualifying bids.')}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 text-xs">
            <Calendar className="w-6 h-6 mb-2 opacity-50" />
            <p className="font-medium">{language === 'es' ? '2do Señalamiento no fijado' : '2nd Call Not Scheduled'}</p>
          </div>
        )}

        {/* CALL 3 (25% Base Liquidación / No Reserve - Orange) */}
        {auction.base_price_call_3 && auction.auction_date_call_3 ? (
          <div
            onClick={() => onSelectCall(3)}
            className={`relative p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm ${
              isCall3Active
                ? 'bg-white dark:bg-slate-900 border-orange-500 ring-2 ring-orange-500/40 shadow-xl shadow-orange-950/10 dark:shadow-orange-950/50'
                : isCall3Past
                ? (selectedCall === 3
                    ? 'bg-slate-100 dark:bg-slate-950/80 border-slate-400 dark:border-slate-700 ring-1 ring-slate-500 opacity-90'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 opacity-75 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700')
                : (selectedCall === 3
                    ? 'bg-white dark:bg-slate-900 border-slate-400 dark:border-slate-700 ring-1 ring-slate-500'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-orange-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/90')
            }`}
          >
            {isCall3Active && (
              <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider shadow-md animate-pulse">
                {countdown3?.isHearing
                  ? (language === 'es' ? 'En Audiencia Judicial' : 'In Hearing')
                  : (language === 'es' ? 'Señalamiento Actual' : 'Active Call')}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black tracking-wider uppercase flex items-center gap-1 ${
                  isCall3Active ? 'text-orange-600 dark:text-orange-400' : isCall3Past ? 'text-slate-500 dark:text-slate-400' : 'text-orange-600 dark:text-orange-400'
                }`}>
                  <span>{t.card.thirdCall}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isCall3Active
                      ? 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800/60 text-orange-800 dark:text-orange-300'
                      : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    25% Base
                  </span>
                </span>
                {countdown3 && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                    countdown3.isHearing
                      ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:border-rose-500/60 dark:text-rose-300'
                      : isCall3Past
                      ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-400'
                      : isCall3Active
                      ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/80 dark:border-orange-500/60 dark:text-orange-300'
                      : 'bg-orange-50/60 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:border-orange-700/40 dark:text-orange-300'
                  }`}>
                    {countdown3.isHearing
                      ? (language === 'es' ? 'En Audiencia' : 'In Hearing')
                      : isCall3Past
                      ? (language === 'es' ? 'Desierto' : 'Past')
                      : countdown3.label}
                  </span>
                )}
              </div>

              <div>
                <p className={`text-2xl font-extrabold tracking-tight font-mono ${isCall3Active ? 'text-slate-900 dark:text-white' : isCall3Past ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {formatCurrency(auction.base_price_call_3, auction.currency)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{formatDateCR(auction.auction_date_call_3, language)}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>{t.dossier.legalDeposit}:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(depositCall3, auction.currency)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {language === 'es'
                  ? 'Remate al mejor postor sobre la base mínima legal del 25%.'
                  : 'Auction to highest bidder starting from 25% statutory baseline.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 text-xs">
            <Calendar className="w-6 h-6 mb-2 opacity-50" />
            <p className="font-medium">{language === 'es' ? '3er Señalamiento no fijado' : '3rd Call Not Scheduled'}</p>
          </div>
        )}
      </div>

      {/* Helpful context note */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>
          {language === 'es'
            ? 'Haz clic en cualquiera de los señalamientos para recalcular los costos de traspaso, timbres e impuestos proyectados.'
            : 'Click on any of the auction stages above to automatically recompute statutory closing taxes and ROI.'}
        </span>
      </div>
    </div>
  );
}
