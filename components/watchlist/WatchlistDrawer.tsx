'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Auction } from '@/lib/types/auction';
import { formatCurrency, formatArea, formatDateCR, getDaysUntilAuction, getLocalizedPropertyTitle } from '@/lib/utils';
import {
  fetchUserWatchlist,
  saveToWatchlist,
  removeFromWatchlist,
  WatchlistItem,
} from '@/lib/supabase/db';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/lib/i18n/LanguageContext';
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
  const { t, language } = useLanguage();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [targetBidInput, setTargetBidInput] = useState('');
  const [savedFeedbackId, setSavedFeedbackId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleRemove = async (auctionId: string) => {
    await removeFromWatchlist(auctionId, userId);
    setItems((prev) => prev.filter((item) => item.auction_id !== auctionId));
    if (onItemCountChange) {
      onItemCountChange(items.length - 1);
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

    const updated = items.map((item) => {
      if (item.auction_id === auctionId) {
        return {
          ...item,
          notes: noteText,
          target_bid: targetBidNum || null,
        };
      }
      return item;
    });

    setItems(updated);
    setEditingNotesId(null);
    setSavedFeedbackId(auctionId);
    setTimeout(() => setSavedFeedbackId(null), 2500);
  };

  if (!isOpen || !mounted) return null;

  const drawerContent = (
    <div className="fixed inset-0 z-[99999] overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Bookmark className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {t.watchlist.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {items.length} {t.watchlist.savedCount}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">{language === 'es' ? 'Cargando favoritos...' : 'Loading saved properties...'}</p>
              </div>
            ) : items.length > 0 ? (
              items.map((item) => {
                const auction = item.auction;
                if (!auction) return null;

                const countdown = getDaysUntilAuction(auction.auction_date_call_1, language);
                const isEditing = editingNotesId === auction.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3 shadow-sm"
                  >
                    {/* Header: Location & Price */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                          {auction.canton}, {auction.province}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {getLocalizedPropertyTitle(auction, language)}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {t.dossier.folioReal}: {auction.folio_real}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(auction.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Eliminar de mi lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price & Date Strip */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                          {t.card.firstCall}:
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-white font-mono">
                          {formatCurrency(auction.base_price_call_1, auction.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                          {language === 'es' ? 'Fecha de Remate:' : 'Auction Date:'}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {countdown.label}
                        </span>
                      </div>
                    </div>

                    {/* Investor Target Bid & Notes Section */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-900 space-y-2">
                      {isEditing ? (
                        <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                              {t.watchlist.myTargetBid} ({auction.currency}):
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
                            <label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                              {t.watchlist.privateNotes}:
                            </label>
                            <textarea
                              rows={2}
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder={t.watchlist.notesPlaceholder}
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingNotesId(null)}
                              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                            >
                              {language === 'es' ? 'Cancelar' : 'Cancel'}
                            </button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveNotes(auction.id)}
                              className="h-7 text-xs font-bold"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              <span>{language === 'es' ? 'Guardar' : 'Save'}</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <div className="space-y-0.5 max-w-[240px]">
                            {item.target_bid && (
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-[11px] font-semibold">
                                  {language === 'es' ? 'Postura objetivo:' : 'Target bid:'}{' '}
                                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(item.target_bid, auction.currency)}
                                  </strong>
                                </span>
                              </div>
                            )}

                            {item.notes ? (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                                "{item.notes}"
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {t.watchlist.noNotes}
                              </p>
                            )}

                            {savedFeedbackId === auction.id && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                {t.watchlist.savedSuccess}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors"
                            title="Editar notas"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* View Dossier Link */}
                    <div className="pt-2">
                      <Link
                        href={`/auctions/${auction.id}`}
                        onClick={onClose}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition-all shadow-sm"
                      >
                        <span>{t.card.viewDossier}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center space-y-3 text-slate-400">
                <Bookmark className="w-10 h-10 text-slate-400 dark:text-slate-700 mx-auto" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t.watchlist.emptyTitle}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {t.watchlist.emptyDesc}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
