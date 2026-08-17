'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Auction } from '@/lib/types/auction';
import { formatCurrency, formatArea, formatDateCR, getDaysUntilAuction } from '@/lib/utils';
import {
  fetchUserWatchlist,
  saveToWatchlist,
  removeFromWatchlist,
  WatchlistItem,
} from '@/lib/supabase/db';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Bookmark,
  X,
  Trash2,
  ExternalLink,
  DollarSign,
  FileEdit,
  TrendingUp,
  MapPin,
  Calendar,
  Save,
  Check,
  Building,
  Sparkles,
} from 'lucide-react';

interface WatchlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onItemCountChange?: (count: number) => void;
}

export function WatchlistDrawer({
  isOpen,
  onClose,
  userId,
  onItemCountChange,
}: WatchlistDrawerProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [targetBidInput, setTargetBidInput] = useState('');
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);

  const loadWatchlist = async () => {
    setLoading(true);
    const data = await fetchUserWatchlist(userId);
    setItems(data);
    setLoading(false);
    if (onItemCountChange) {
      onItemCountChange(data.length);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWatchlist();
    }
  }, [isOpen, userId]);

  const handleRemove = async (auctionId: string) => {
    await removeFromWatchlist(auctionId, userId);
    const updated = items.filter((item) => item.auction_id !== auctionId);
    setItems(updated);
    if (onItemCountChange) {
      onItemCountChange(updated.length);
    }
  };

  const handleStartEdit = (item: WatchlistItem) => {
    setEditingNotesId(item.auction_id);
    setNoteText(item.notes || '');
    setTargetBidInput(item.target_bid ? String(item.target_bid) : '');
  };

  const handleSaveNotes = async (auctionId: string) => {
    const targetBidNum = targetBidInput ? parseFloat(targetBidInput) : undefined;
    await saveToWatchlist(auctionId, userId, noteText, targetBidNum);

    setItems((prev) =>
      prev.map((item) =>
        item.auction_id === auctionId
          ? { ...item, notes: noteText, target_bid: targetBidNum }
          : item
      )
    );

    setSavedFeedbackId(auctionId);
    setEditingNotesId(null);
    setTimeout(() => setSavedFeedbackId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Bookmark className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Mi Lista de Seguimiento
                </h2>
                <p className="text-xs text-slate-400">
                  {items.length} {items.length === 1 ? 'remate guardado' : 'remates guardados'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Cargando propiedades guardadas...</p>
              </div>
            ) : items.length > 0 ? (
              items.map((item) => {
                const auction = item.auction;
                if (!auction) return null;

                const countdown = getDaysUntilAuction(auction.auction_date_call_1);
                const isEditing = editingNotesId === auction.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-md relative"
                  >
                    {/* Header: District, Province & Price */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-white flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {auction.district}, {auction.canton}
                          </span>
                        </span>
                        <p className="text-[10.5px] font-mono text-slate-400">
                          Exp: {auction.expediente_number}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(auction.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Eliminar de favoritos"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price & Countdown Strip */}
                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-900">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">1er Remate:</span>
                        <p className="text-sm font-bold text-emerald-400 font-mono">
                          {formatCurrency(auction.base_price_call_1, auction.currency)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3" />
                          {countdown.label}
                        </span>
                        {auction.estimated_margin_pct && (
                          <span className="text-[10.5px] font-semibold text-emerald-300 font-mono">
                            +{auction.estimated_margin_pct}% Margen
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Investor Target Bid & Notes Section */}
                    <div className="pt-2 border-t border-slate-900 space-y-2">
                      {isEditing ? (
                        <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold text-slate-300">
                              Mi Puja Objetivo ({auction.currency}):
                            </label>
                            <Input
                              type="number"
                              placeholder={`Ej: ${auction.base_price_call_1}`}
                              value={targetBidInput}
                              onChange={(e) => setTargetBidInput(e.target.value)}
                              className="text-xs py-1 h-8 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold text-slate-300">
                              Notas Privadas de Debida Diligencia:
                            </label>
                            <textarea
                              rows={2}
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Ej: Revisado en SIRI, 1° hipoteca con BNCR, pendiente visita..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingNotesId(null)}
                              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveNotes(auction.id)}
                              className="h-7 text-xs font-bold"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Guardar Notas
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                          <div className="space-y-1 flex-1">
                            {item.target_bid ? (
                              <p className="text-[11px] text-amber-400 font-bold font-mono">
                                🎯 Puja Objetivo: {formatCurrency(item.target_bid, auction.currency)}
                              </p>
                            ) : null}

                            {item.notes ? (
                              <p className="text-slate-300 text-[11px] italic line-clamp-2">
                                "{item.notes}"
                              </p>
                            ) : (
                              <p className="text-slate-500 text-[11px]">
                                Sin notas privadas configuradas.
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Editar notas y puja objetivo"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {savedFeedbackId === auction.id && (
                        <p className="text-[10.5px] text-emerald-400 flex items-center gap-1 justify-end font-bold">
                          <Check className="w-3 h-3" />
                          ¡Notas guardadas!
                        </p>
                      )}
                    </div>

                    {/* View Dossier Button */}
                    <div className="pt-1">
                      <Link
                        href={`/auctions/${auction.id}`}
                        onClick={onClose}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-bold py-2 rounded-xl border border-slate-700 hover:border-emerald-500 transition-colors shadow"
                      >
                        <span>Abrir Expediente y Avalúo</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty state */
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">No tienes remates guardados</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Haz clic en el icono de marcador en cualquier tarjeta de remate para guardarlo aquí y definir tu estrategia de puja.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-center">
            <Link
              href="/auctions"
              onClick={onClose}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
            >
              Explorar Catálogo de Remates →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
