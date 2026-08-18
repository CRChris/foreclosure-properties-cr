'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Auction } from '@/lib/types/auction';
import { formatCurrency, formatArea, getDaysUntilAuction } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, MapPin, Calendar, Maximize2, Scale, TrendingUp, Sparkles, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { PropertyTypeBadge, inferPropertyType } from '@/components/ui/PropertyTypeIcon';

export interface PropertyMapProps {
  auctions: Auction[];
  selectedAuctionId?: string | null;
  onSelectAuction?: (auction: Auction) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
}

// Controller to smoothly pan & zoom map when selection or center changes
function MapController({
  center,
  zoom,
  selectedAuction,
}: {
  center?: [number, number];
  zoom?: number;
  selectedAuction?: Auction | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedAuction && selectedAuction.latitude && selectedAuction.longitude) {
      map.flyTo([selectedAuction.latitude, selectedAuction.longitude], Math.max(map.getZoom(), 13), {
        duration: 0.9,
        easeLinearity: 0.25,
      });
    } else if (center) {
      map.flyTo(center, zoom || 8, { duration: 1.0 });
    }
  }, [center, zoom, selectedAuction, map]);

  return null;
}

export function PropertyMap({
  auctions,
  selectedAuctionId,
  onSelectAuction,
  center = [9.7489, -83.7534], // Central Costa Rica
  zoom = 8,
  height = '100%',
  className = '',
}: PropertyMapProps) {
  const { language } = useLanguage();

  // Color-coded marker generator based on discount margin:
  // - Green: > 35% Margin (High Discount)
  // - Yellow/Amber: 20% - 35% Margin (Medium Discount)
  // - Blue: < 20% / Standard Auction (Standard)
  const createColorCodedIcon = (auction: Auction, isSelected: boolean) => {
    const margin = auction.estimated_margin_pct || 0;
    
    let colorClass = 'bg-blue-600 border-blue-300 text-white shadow-blue-900/50';
    let ringClass = isSelected ? 'ring-4 ring-blue-400/80 scale-125 z-50' : 'hover:scale-115';
    let badgeText = margin > 0 ? `+${Math.round(margin)}%` : 'CR';

    if (margin >= 35) {
      colorClass = 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-950/70';
      ringClass = isSelected ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50 animate-pulse' : 'hover:scale-115';
    } else if (margin >= 20) {
      colorClass = 'bg-amber-600 border-amber-300 text-white shadow-amber-950/70';
      ringClass = isSelected ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' : 'hover:scale-115';
    } else {
      colorClass = 'bg-sky-600 border-sky-300 text-white shadow-sky-950/70';
      ringClass = isSelected ? 'ring-4 ring-sky-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' : 'hover:scale-115';
    }

    const iconHtml = `
      <div class="relative flex items-center justify-center cursor-pointer transition-all duration-300 ${ringClass}">
        <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-xl ${colorClass} text-[10.5px] font-extrabold tracking-tight">
          ${badgeText}
        </div>
        <div class="absolute -bottom-1 w-2 h-2 rotate-45 ${colorClass.split(' ')[0]}"></div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-marker-pin',
      html: iconHtml,
      iconSize: [40, 44],
      iconAnchor: [20, 42],
      popupAnchor: [0, -42],
    });
  };

  const validAuctions = auctions.filter(
    (a) => a.latitude !== null && a.longitude !== null && !isNaN(a.latitude) && !isNaN(a.longitude)
  );

  const selectedAuction = validAuctions.find((a) => a.id === selectedAuctionId) || null;

  return (
    <div style={{ height }} className={`w-full h-full relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner ${className}`}>
      {/* Persistent Map Centroid Disclaimer Badge (Centered & Shifted to clear +/- Zoom Controls) */}
      <div className="absolute top-3 left-14 sm:left-1/2 sm:-translate-x-1/2 z-[400] max-w-xs sm:max-w-md bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-xl px-3 py-2 text-[11px] text-amber-200/95 shadow-2xl flex items-start gap-2 pointer-events-auto">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-tight">
          {language === 'en'
            ? '📍 Approximate location by district centroid. Edicts do not contain GPS coordinates. Verify registered survey (Plano Catastrado).'
            : '📍 Ubicación aproximada por centroide de distrito/cantón. Los remates judiciales no incluyen GPS exacto en el edicto. Verifique el plano catastrado.'}
        </p>
      </div>

      {/* Interactive Legend Overlay (Top-Right) */}
      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-2 text-[11px] text-slate-300 shadow-xl space-y-1.5 pointer-events-auto hidden md:block">
        <p className="font-semibold text-slate-200 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          {language === 'es' ? 'Margen de Oportunidad' : 'Opportunity Margin'}
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-500/20" />
          <span>{language === 'es' ? '> 35% Margen Alto' : '> 35% High Margin'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block ring-2 ring-amber-500/20" />
          <span>{language === 'es' ? '20% – 35% Margen Medio' : '20% – 35% Medium Margin'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block ring-2 ring-sky-500/20" />
          <span>{language === 'es' ? '< 20% Base Estándar' : '< 20% Standard Base'}</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapController center={center} zoom={zoom} selectedAuction={selectedAuction} />
        
        {/* OpenStreetMap Standard Tile Layer ($0 External API Cost) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {validAuctions.map((auction) => {
          const isSelected = selectedAuctionId === auction.id;
          const countdown = getDaysUntilAuction(auction.auction_date_call_1, language);
          const propertyType =
            auction.property_type ||
            inferPropertyType(
              `${auction.address_description || ''} ${auction.legal_summary || ''} ${auction.raw_edict_text || ''}`
            );

          return (
            <Marker
              key={auction.id}
              position={[auction.latitude!, auction.longitude!]}
              icon={createColorCodedIcon(auction, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectAuction) onSelectAuction(auction);
                },
              }}
            >
              <Popup className="custom-auction-popup">
                <div className="w-72 space-y-2.5 p-1">
                  {/* Category Pill & Disclaimer Header */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <PropertyTypeBadge type={propertyType} language={language} size="sm" />
                      {auction.estimated_margin_pct && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-extrabold">
                          +{Math.round(auction.estimated_margin_pct)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                      <span>📍</span>
                      <span>
                        {language === 'en'
                          ? 'Estimated District Centroid • Verify Plano Catastrado'
                          : 'Centroide Distrital Estimado • Consulte el Plano Catastrado'}
                      </span>
                    </p>
                  </div>

                  {/* Title & Expediente */}
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white line-clamp-1">
                      {auction.district}, {auction.canton} • Folio {auction.folio_real}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 truncate flex items-center gap-1">
                      <Scale className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                      {auction.expediente_number}
                    </p>
                  </div>

                  {/* Price breakdown */}
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-400 text-[11px]">{language === 'es' ? 'Base 1er Remate:' : '1st Call Base:'}</span>
                      <span className="font-extrabold text-emerald-400">
                        {formatCurrency(auction.base_price_call_1, auction.currency)}
                      </span>
                    </div>
                    {auction.estimated_market_value && (
                      <div className="flex justify-between items-baseline text-[11px]">
                        <span className="text-slate-500">{language === 'es' ? 'Valor Estimado:' : 'Est. Market Value:'}</span>
                        <span className="text-slate-400 line-through">
                          {formatCurrency(auction.estimated_market_value, auction.currency)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Area & Countdown */}
                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Maximize2 className="w-3 h-3 text-slate-500" />
                      {formatArea(auction.area_m2)}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-amber-400">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      {countdown.label}
                    </span>
                  </div>

                  {/* Link to Dossier */}
                  <Link
                    href={`/auctions/${auction.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition-colors shadow-md"
                  >
                    <span>{language === 'es' ? 'Ver Expediente y Avalúo' : 'View Legal Dossier'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
