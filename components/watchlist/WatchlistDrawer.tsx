'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
        <div className="w-screen max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Bookmark className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {t.watchlist.title}
                </h2>
                <p className="text-xs text-slate-400">
                  {items.length} {t.watchlist.savedCount}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
                  >
                    {/* Header: Location & Price */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                          {auction.canton}, {auction.province}
                        </span>
                        <h3 className="text-sm font-bold text-white line-clamp-1">
                          {auction.address_description || `${auction.district}, ${auction.canton}`}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400">
                          {t.dossier.folioReal}: {auction.folio_real}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(auction.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Eliminar de mi lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price & Date Strip */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {t.card.firstCall}:
                        </span>
                        <span className="font-extrabold text-white font-mono">
                          {formatCurrency(auction.base_price_call_1, auction.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {language === 'es' ? 'Fecha de Remate:' : 'Auction Date:'}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-400">
                          {countdown.label}
                        </span>
                      </div>
                    </div>

                    {/* Investor Target Bid & Notes Section */}
                    <div className="pt-2 border-t border-slate-900 space-y-2">
                      {isEditing ? (
                        <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold text-slate-300">
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
                            <label className="text-[10.5px] font-bold text-slate-300">
                              {t.watchlist.privateNotes}:
                            </label>
                            <textarea
                              rows={2}
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder={t.watchlist.notesPlaceholder}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingNotesId(null)}
                              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                            >
                              {language === 'es' ? 'Cancelar' : 'Cancel'}
                            </button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveNotes(auction.id)}
                              className="h-7 text-xs font-bold"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              {t.watchlist.saveNotes}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                          <div className="space-y-1 flex-1">
                            {item.target_bid ? (
                              <p className="text-[11px] text-amber-400 font-bold font-mono">
                                🎯 {t.watchlist.myTargetBid}: {formatCurrency(item.target_bid, auction.currency)}
                              </p>
                            ) : null}

                            {item.notes ? (
                              <p className="text-slate-300 text-[11px] italic line-clamp-2">
                                "{item.notes}"
                              </p>
                            ) : (
                              <p className="text-slate-500 text-[11px]">
                                {language === 'es' ? 'Sin notas privadas configuradas.' : 'No private notes added yet.'}
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
                          {t.watchlist.notesSaved}
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
                        <span>{t.watchlist.openDossier}</span>
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
                  <p className="text-sm font-bold text-white">{t.watchlist.emptyTitle}</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {t.watchlist.emptyDesc}
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
              {t.watchlist.exploreCatalog}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
