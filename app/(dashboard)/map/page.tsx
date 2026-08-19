'use client';

import React, { useState, useEffect } from 'react';
import { Auction, CostaRicaProvince } from '@/lib/types/auction';
import { MapWrapper } from '@/components/map/MapWrapper';
import { 
  formatCurrency, 
  formatArea, 
  detectPropertyCharacteristics, 
  getLocalizedPropertyTitle, 
  getLiveAuctionProgressionState,
  getCallStageConfig,
} from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { fetchAuctions } from '@/lib/supabase/db';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { PropertyTypeBadge } from '@/components/ui/PropertyTypeIcon';
import Link from 'next/link';
import { 
  MapPin, 
  Search, 
  ArrowRight, 
  Maximize2, 
  Scale, 
  TrendingUp, 
  Compass, 
  AlertTriangle,
} from 'lucide-react';

export default function MapExplorerPage() {
  const { t, language } = useLanguage();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<CostaRicaProvince | 'all'>('all');

  useEffect(() => {
    let isMounted = true;
    fetchAuctions().then((data) => {
      if (isMounted && data && data.length > 0) {
        setAuctions(data);
        // Do not auto-select first auction so the map opens showing all of Costa Rica
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAuctions = auctions.filter((auction) => {
    const liveState = getLiveAuctionProgressionState(auction);
    if (liveState.callStage === 'passed_call_3' || liveState.saleStatus === 'deserted') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        auction.canton.toLowerCase().includes(q) ||
        auction.district.toLowerCase().includes(q) ||
        auction.province.toLowerCase().includes(q) ||
        auction.folio_real.toLowerCase().includes(q) ||
        auction.expediente_number.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (selectedProvince !== 'all' && auction.province !== selectedProvince) {
      return false;
    }
    return true;
  });

  const centerCoordinates: [number, number] = selectedAuction?.latitude && selectedAuction?.longitude
    ? [selectedAuction.latitude, selectedAuction.longitude]
    : [9.7489, -84.05];

  return (
    <div className="space-y-4">
      {/* Top Map Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-400" />
            <span>{language === 'es' ? 'Explorador Geoespacial de Remates' : 'Geospatial Foreclosure Explorer'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'es'
              ? 'Georreferenciación de subastas judiciales en Costa Rica con coordenadas PostGIS.'
              : 'PostGIS geospatial mapping of Costa Rican court foreclosures and property auctions.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm">
            {filteredAuctions.length} {language === 'es' ? 'Marcadores en Mapa' : 'Map Markers'}
          </Badge>
        </div>
      </div>

      {/* Geocoding Centroid Disclaimer Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200/90 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          {language === 'en'
            ? '📍 Approximate location based on district/canton centroids. Judicial foreclosure notices do not include precise GPS coordinates in edicts. Verify registered survey (Plano Catastrado) for exact boundaries.'
            : '📍 Ubicación aproximada por centroide de distrito/cantón. Los remates judiciales no incluyen coordenadas GPS exactas en el edicto. Verifique el plano catastrado para linderos definitivos.'}
        </p>
      </div>

      {/* Main Map Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-250px)] min-h-[580px]">
        {/* Left Column: Properties Sidebar */}
        <div className="lg:col-span-4 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
          {/* Search bar inside sidebar */}
          <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-950/60">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.filters.searchPlaceholder}
              icon={<Search className="w-4 h-4" />}
              className="text-xs py-1.5"
            />
            <Select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value as any)}
              className="text-xs py-1.5"
            >
              <option value="all">{t.filters.allProvinces}</option>
              <option value="San José">San José</option>
              <option value="Alajuela">Alajuela</option>
              <option value="Cartago">Cartago</option>
              <option value="Heredia">Heredia</option>
              <option value="Guanacaste">Guanacaste</option>
              <option value="Puntarenas">Puntarenas</option>
              <option value="Limón">Limón</option>
            </Select>
          </div>

          {/* Properties Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800 p-2 space-y-2">
            {filteredAuctions.length > 0 ? (
              filteredAuctions.map((auction) => {
                const isSelected = selectedAuction?.id === auction.id;
                const { propertyType: propType } = detectPropertyCharacteristics(auction);
                const liveState = getLiveAuctionProgressionState(auction);
                const stageConfig = getCallStageConfig(liveState);
                return (
                  <div
                    key={auction.id}
                    onClick={() => setSelectedAuction(auction)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border-2 ${
                      isSelected
                        ? stageConfig.selectedBorderClass
                        : `bg-slate-950/60 ${stageConfig.borderClass} ${stageConfig.hoverBorderClass}`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {auction.district ? `${auction.district}, ` : ''}{auction.canton}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold border ${stageConfig.tagClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotClass}`} />
                          <span>{language === 'es' ? stageConfig.shortLabelEs : stageConfig.shortLabelEn}</span>
                        </span>
                        <PropertyTypeBadge type={propType} language={language} size="sm" />
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-sm font-extrabold text-emerald-400 font-mono">
                        {formatCurrency(liveState.currentBasePrice, auction.currency)}
                      </span>
                      {auction.estimated_margin_pct && (
                        <span className="text-[11px] font-semibold text-emerald-300">
                          +{auction.estimated_margin_pct}% {t.card.estimatedMargin}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span className="flex items-center gap-1">
                        <Maximize2 className="w-3 h-3 text-slate-500" />
                        {formatArea(auction.area_m2)}
                      </span>
                      <span className="font-mono text-slate-400 text-[10.5px]">
                        Folio: {auction.folio_real}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-2 text-slate-400">
                <Scale className="w-6 h-6 mx-auto text-slate-500" />
                <p className="text-xs font-semibold text-white">{t.empty.waitingTitle}</p>
                <p className="text-[11px] text-slate-500">
                  {t.empty.waitingDesc}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full-Height Interactive Map */}
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
          <MapWrapper
            auctions={filteredAuctions}
            selectedAuctionId={selectedAuction?.id}
            onSelectAuction={(auction) => setSelectedAuction(auction)}
            center={centerCoordinates}
            zoom={selectedAuction ? 13 : 7.5}
            height="100%"
          />

          {/* Floating Action Card for selected property */}
          {selectedAuction && (() => {
            const selectedLive = getLiveAuctionProgressionState(selectedAuction);
            const selectedStage = getCallStageConfig(selectedLive);
            return (
              <div className={`absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-84 bg-slate-950/95 border-2 ${selectedStage.borderClass} rounded-xl p-3.5 shadow-2xl backdrop-blur-md z-[1000] space-y-2`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 pb-0.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold border ${selectedStage.tagClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedStage.dotClass}`} />
                        <span>{language === 'es' ? selectedStage.shortLabelEs : selectedStage.shortLabelEn}</span>
                      </span>
                      <p className="text-[10px] uppercase font-bold text-slate-400">
                        {selectedAuction.canton}, {selectedAuction.province}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-white line-clamp-1">
                      {getLocalizedPropertyTitle(selectedAuction, language)}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    {selectedAuction.currency}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-base font-extrabold text-emerald-400 font-mono">
                    {formatCurrency(selectedLive.currentBasePrice, selectedAuction.currency)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatArea(selectedAuction.area_m2)}
                  </span>
                </div>

                <Link
                  href={`/auctions/${selectedAuction.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-md"
                >
                  <span>{t.card.viewDossier}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
