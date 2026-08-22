'use client';

import React, { useState, useEffect } from 'react';
import { Auction, CostaRicaProvince } from '@/lib/types/auction';
import { MapWrapper } from '@/components/map/MapWrapper';
import { COSTA_RICA_CENTER, COSTA_RICA_DEFAULT_ZOOM } from '@/components/map/mapConstants';
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
import { CadastralLocationBadge } from '@/components/ui/CadastralLocationBadge';
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
  RotateCcw,
  Navigation,
  ExternalLink,
} from 'lucide-react';

export default function MapExplorerPage() {
  const { t, language } = useLanguage();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<CostaRicaProvince | 'all'>('all');
  const [selectedSubParcelIndex, setSelectedSubParcelIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchAuctions().then((data) => {
      if (isMounted && data && data.length > 0) {
        setAuctions(data);
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
    : COSTA_RICA_CENTER;

  return (
    <div className="space-y-4">
      {/* Top Map Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'es' ? 'Explorador Geoespacial de Remates' : 'Geospatial Foreclosure Explorer'}</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {language === 'es'
              ? 'Georreferenciación de subastas judiciales en Costa Rica con polígonos del Catastro Nacional (SNIT).'
              : 'Geospatial mapping of Costa Rican court foreclosures with exact SNIT cadastral lot overlays.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm">
            {filteredAuctions.length} {language === 'es' ? 'Marcadores en Mapa' : 'Map Markers'}
          </Badge>
        </div>
      </div>

      {/* Main Map Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[580px]">
        {/* Left Column: Properties Sidebar */}
        <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
          {/* Search bar inside sidebar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50 dark:bg-slate-950/60">
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
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
            {filteredAuctions.length > 0 ? (
              filteredAuctions.map((auction) => {
                const isSelected = selectedAuction?.id === auction.id;
                const { propertyType: propType } = detectPropertyCharacteristics(auction);
                const liveState = getLiveAuctionProgressionState(auction);
                const stageConfig = getCallStageConfig(liveState);
                return (
                  <div
                    key={auction.id}
                    onClick={() => {
                      setSelectedAuction(auction);
                      setSelectedSubParcelIndex(null);
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all border-2 ${
                      isSelected
                        ? stageConfig.selectedBorderClass
                        : `bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 ${stageConfig.borderClass} ${stageConfig.hoverBorderClass}`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {auction.is_portfolio_auction && auction.sub_properties
                          ? `📦 Portafolio (${auction.sub_properties.length} Fincas)`
                          : `${auction.district ? `${auction.district}, ` : ''}${auction.canton}`}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold border ${stageConfig.tagClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotClass}`} />
                          <span>{language === 'es' ? stageConfig.shortLabelEs : stageConfig.shortLabelEn}</span>
                        </span>
                        <PropertyTypeBadge type={propType} language={language} size="sm" />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CadastralLocationBadge
                        locationType={auction.location_type}
                        hasPolygon={!!auction.parcel_polygon}
                        language={language}
                        size="xs"
                      />
                    </div>

                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(liveState.currentBasePrice, auction.currency)}
                      </span>
                      {auction.estimated_margin_pct && (
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          +{auction.estimated_margin_pct}% {t.card.estimatedMargin}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 px-4 space-y-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {searchQuery.trim() || selectedProvince !== 'all' || auctions.length > 0
                    ? t.empty.noResultsTitle
                    : t.empty.waitingTitle}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {searchQuery.trim() || selectedProvince !== 'all' || auctions.length > 0
                    ? t.empty.noResultsDesc
                    : t.empty.waitingDesc}
                </p>
                {(searchQuery.trim() || selectedProvince !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedProvince('all');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t.empty.resetFilters}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full-Height Interactive Map */}
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
          <MapWrapper
            auctions={filteredAuctions}
            selectedAuctionId={selectedAuction?.id}
            selectedSubParcelIndex={selectedSubParcelIndex}
            onSelectAuction={(auction) => {
              setSelectedAuction(auction);
              setSelectedSubParcelIndex(null);
            }}
            onSelectSubProperty={(auction, subProp) => {
              setSelectedAuction(auction);
              setSelectedSubParcelIndex(subProp.parcel_index);
            }}
            center={centerCoordinates}
            zoom={selectedAuction ? (selectedAuction.is_portfolio_auction ? 8 : 14) : COSTA_RICA_DEFAULT_ZOOM}
            height="100%"
          />

          {/* Floating Action Card for selected property */}
          {selectedAuction && (() => {
            const selectedLive = getLiveAuctionProgressionState(selectedAuction);
            const selectedStage = getCallStageConfig(selectedLive);
            const isPortfolio = Boolean(selectedAuction.is_portfolio_auction && selectedAuction.sub_properties);
            const activeSub = isPortfolio && selectedSubParcelIndex !== null
              ? selectedAuction.sub_properties?.find((sp) => sp.parcel_index === selectedSubParcelIndex) || null
              : null;

            const lat = activeSub ? activeSub.latitude : selectedAuction.latitude;
            const lng = activeSub ? activeSub.longitude : selectedAuction.longitude;
            const googleMapsUrl = lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;
            const wazeUrl = lat && lng ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : null;

            return (
              <div className={`absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white/95 dark:bg-slate-950/95 border-2 ${selectedStage.borderClass} rounded-2xl p-4 shadow-2xl backdrop-blur-md z-[1000] space-y-2.5`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 pb-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold border ${selectedStage.tagClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedStage.dotClass}`} />
                        <span>{language === 'es' ? selectedStage.shortLabelEs : selectedStage.shortLabelEn}</span>
                      </span>
                      <CadastralLocationBadge
                        locationType={activeSub ? activeSub.location_type : selectedAuction.location_type}
                        hasPolygon={Boolean(activeSub?.parcel_polygon || selectedAuction.parcel_polygon)}
                        language={language}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {activeSub ? activeSub.title : getLocalizedPropertyTitle(selectedAuction, language)}
                    </p>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      {activeSub
                        ? `${activeSub.district ? `${activeSub.district}, ` : ''}${activeSub.canton}, ${activeSub.province}`
                        : `${selectedAuction.district ? `${selectedAuction.district}, ` : ''}${selectedAuction.canton}, ${selectedAuction.province}`}
                    </p>
                  </div>
                </div>

                {isPortfolio && selectedAuction.sub_properties && (
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide block">
                      {language === 'es' ? 'Fincas en este Remate:' : 'Parcels in this Foreclosure:'}
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      {selectedAuction.sub_properties.map((sp) => {
                        const isSubActive = selectedSubParcelIndex === sp.parcel_index;
                        return (
                          <button
                            key={sp.parcel_index}
                            type="button"
                            onClick={() => setSelectedSubParcelIndex(sp.parcel_index)}
                            className={`text-[10px] p-1.5 rounded-lg font-bold truncate text-left transition-all border ${
                              isSubActive
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <span>#{sp.parcel_index}: {sp.canton}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      {isPortfolio ? (language === 'es' ? 'Base Paquete (4 Fincas)' : 'Package Base') : (language === 'es' ? selectedStage.shortLabelEs : selectedStage.shortLabelEn)}
                    </span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(selectedLive.currentBasePrice, selectedAuction.currency)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    {formatArea(activeSub ? activeSub.area_m2 : selectedAuction.area_m2)}
                  </span>
                </div>

                {/* Direct GPS Navigation Links */}
                {googleMapsUrl && wazeUrl && (
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[10px] font-bold py-1 px-2 rounded-lg transition-colors shadow-sm"
                    >
                      <MapPin className="w-3 h-3 text-blue-500" />
                      <span>Google Maps</span>
                    </a>
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[10px] font-bold py-1 px-2 rounded-lg transition-colors shadow-sm"
                    >
                      <Navigation className="w-3 h-3 text-sky-500" />
                      <span>Waze</span>
                    </a>
                  </div>
                )}

                <Link
                  href={`/auctions/${selectedAuction.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition-colors shadow-md shadow-emerald-600/20"
                >
                  <span>{t.card.viewDossier}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Map Explorer Micro-Notice Footer */}
      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11.5px] text-slate-600 dark:text-slate-400 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>{t.disclaimer.micro.text}</span>
        <Link href="/terms" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0">
          {t.nav.terms}
        </Link>
      </div>
    </div>
  );
}

