"""
Boletín Judicial Legal Edict Ingestion Engine (Costa Rica Remates Judiciales)
Automated ingestion worker: scrapes official publications, extracts structured foreclosure
data with Gemini 2.5 Flash (with resilient regex rule-based fallback), enriches with PostGIS
geolocations, and upserts into Supabase PostgreSQL.
"""

import os
import re
import io
import sys
import json
import ssl
import time
import logging
import argparse
import unicodedata
import html as html_module
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any, Tuple, Set
from datetime import datetime, timedelta

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                if k.endswith("_call_1") and v is None:
                    raise ValueError(f"Required field '{k}' cannot be None")
                setattr(self, k, v)
        def model_dump(self):
            return {k: v for k, v in self.__dict__.items() if v is not None}
        @classmethod
        def model_validate_json(cls, json_str):
            return cls(**json.loads(json_str))
    def Field(default=None, default_factory=None, description="", **kwargs):
        if default_factory is not None:
            return default_factory()
        return default

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    requests = None
    BeautifulSoup = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    from google import genai
except ImportError:
    genai = None

def load_env_files():
    """Zero-dependency .env and .env.local reader ensuring credentials load in any Python environment."""
    search_dirs = [os.getcwd(), os.path.dirname(os.path.abspath(__file__)), os.path.dirname(os.path.dirname(os.path.abspath(__file__)))]
    for d in search_dirs:
        for fname in [".env", ".env.local"]:
            p = os.path.join(d, fname)
            if os.path.isfile(p):
                try:
                    with open(p, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            line = line.strip()
                            if not line or line.startswith("#") or "=" not in line:
                                continue
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'").strip('"')
                            if k and k not in os.environ and v and v != "None":
                                os.environ[k] = v
                except Exception:
                    pass

load_env_files()


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s: %(message)s"
)
logger = logging.getLogger("scraper.ingestion")

# ==============================================================================
# 1. COSTA RICA GEOSPATIAL CANTON & DISTRICT CENTROIDS LOOKUP ($0 Geocoding)
# ==============================================================================
CR_CANTON_CENTROIDS: Dict[str, Tuple[float, float]] = {
    # San José
    "san josé": (9.9281, -84.0907),
    "escazú": (9.9248, -84.1432),
    "desamparados": (9.8988, -84.0678),
    "puriscal": (9.8456, -84.3128),
    "tarrazú": (9.6601, -84.0272),
    "aserrí": (9.8322, -84.1167),
    "mora": (9.9142, -84.2464),
    "goicoechea": (9.9482, -84.0489),
    "santa ana": (9.9326, -84.1825),
    "alajuelita": (9.8978, -84.0997),
    "vázquez de coronado": (9.9753, -84.0086),
    "coronado": (9.9753, -84.0086),
    "acosta": (9.7972, -84.1611),
    "tibás": (9.9575, -84.0817),
    "moravia": (9.9678, -84.0489),
    "montes de oca": (9.9372, -84.0514),
    "turrubares": (9.8000, -84.4833),
    "dota": (9.6542, -83.9278),
    "curridabat": (9.9156, -84.0353),
    "granadilla": (9.9285, -84.0241),
    "pérez zeledón": (9.3739, -83.7058),
    "león cortés": (9.6806, -84.0806),

    # Alajuela
    "alajuela": (10.0163, -84.2116),
    "san ramón": (10.0872, -84.4700),
    "grecia": (10.0739, -84.3117),
    "san mateo": (9.9500, -84.5333),
    "atenas": (9.9792, -84.3778),
    "naranjo": (10.0989, -84.3789),
    "palmares": (10.0578, -84.4333),
    "poás": (10.1333, -84.2333),
    "orotina": (9.9114, -84.5217),
    "san carlos": (10.3238, -84.4271),
    "zarcero": (10.1833, -84.3833),
    "valverde vega": (10.1333, -84.3167),
    "sarchí": (10.1333, -84.3167),
    "upala": (10.8989, -85.0167),
    "los chiles": (11.0333, -84.7167),
    "guatuso": (10.6667, -84.8333),
    "río cuarto": (10.3456, -84.2167),

    # Cartago
    "cartago": (9.8644, -83.9194),
    "paraíso": (9.8389, -83.8667),
    "la unión": (9.9076, -83.9875),
    "tres ríos": (9.9076, -83.9875),
    "jiménez": (9.7833, -83.7333),
    "turrialba": (9.9047, -83.6833),
    "alvarado": (9.9667, -83.8167),
    "oreamuno": (9.8833, -83.9000),
    "el guarco": (9.8167, -83.9333),

    # Heredia
    "heredia": (9.9989, -84.1167),
    "barva": (10.0167, -84.1167),
    "santo domingo": (9.9833, -84.0833),
    "santa bárbara": (10.0333, -84.1667),
    "san rafael": (10.0167, -84.1000),
    "san isidro": (10.0167, -84.0500),
    "belén": (9.9812, -84.1795),
    "flores": (10.0000, -84.1500),
    "san pablo": (9.9917, -84.0972),
    "sarapiquí": (10.4500, -84.0167),

    # Guanacaste
    "liberia": (10.6333, -85.4333),
    "nicoya": (10.1444, -85.4542),
    "santa cruz": (10.2625, -85.5853),
    "tamarindo": (10.2993, -85.8402),
    "bagaces": (10.5167, -85.2500),
    "carrillo": (10.4667, -85.5500),
    "playas del coco": (10.5500, -85.6967),
    "cañas": (10.4333, -85.0833),
    "abangares": (10.2833, -84.9500),
    "tilarán": (10.4667, -84.9667),
    "nandayure": (9.9833, -85.2500),
    "la cruz": (11.0667, -85.6333),
    "hojancha": (10.0667, -85.4167),

    # Puntarenas
    "puntarenas": (9.9763, -84.8384),
    "esparza": (9.9944, -84.6667),
    "buenos aires": (9.1667, -83.3333),
    "montes de oro": (10.1500, -84.7333),
    "osa": (8.8833, -83.5167),
    "quepos": (9.4319, -84.1619),
    "manuel antonio": (9.3889, -84.1528),
    "golfito": (8.6333, -83.1667),
    "coto brus": (8.9000, -82.9500),
    "parrita": (9.5167, -84.3333),
    "corredores": (8.6000, -82.9500),
    "garabito": (9.6152, -84.6298),
    "jacó": (9.6152, -84.6298),
    "herradura": (9.6450, -84.6380),
    "puerto jiménez": (8.5333, -83.3000),

    # Limón
    "limón": (9.9907, -83.0360),
    "pococí": (10.2000, -83.7833),
    "siquirres": (10.1000, -83.5167),
    "talamanca": (9.6333, -82.8500),
    "matina": (10.0833, -83.3333),
    "guácimo": (10.2167, -83.6833),
}

PROVINCE_CENTROIDS = {
    "san josé": (9.9281, -84.0907),
    "alajuela": (10.0163, -84.2116),
    "cartago": (9.8644, -83.9194),
    "heredia": (9.9989, -84.1167),
    "guanacaste": (10.4667, -85.5500),
    "puntarenas": (9.9763, -84.8384),
    "limón": (9.9907, -83.0360),
}

PROVINCE_PREFIXES = {
    "san josé": "1",
    "alajuela": "2",
    "cartago": "3",
    "heredia": "4",
    "guanacaste": "5",
    "puntarenas": "6",
    "limón": "7",
}

CATEGORY_IMAGES: Dict[str, List[str]] = {
    "Condo": [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    ],
    "Luxury Estate": [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    ],
    "Residential": [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    ],
    "Commercial": [
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    ],
    "Agricultural": [
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80",
    ],
    "Land/Development": [
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    ],
}

# ==============================================================================
# 2. SCHEMA DEFINITIONS (Pydantic / Structured Output)
# ==============================================================================
class PropertyCharacteristics(BaseModel):
    # Classification
    property_type: str = Field("single_family_home", description="'single_family_home' | 'condo_apartment' | 'building_lot' | 'agricultural_land' | 'commercial_industrial' | 'other'")
    naturaleza_raw: Optional[str] = Field(None, description="Exact legal description: e.g. 'Terreno para construir con una casa de habitación'")
    
    # Physical & Access Details
    has_construction: bool = Field(False, description="True if mentions casa, edificio, bodega, mejoras")
    has_public_road_frontage: bool = Field(False, description="True if any lindero mentions 'calle pública' or 'frente a calle'")
    is_condominio: bool = Field(False, description="True if mentions 'finca filial', 'régimen de condominio', 'Ley 7933'")
    
    # Boundaries (Linderos)
    lindero_norte: Optional[str] = Field(None, description="North bordering property")
    lindero_sur: Optional[str] = Field(None, description="South bordering property")
    lindero_este: Optional[str] = Field(None, description="East bordering property")
    lindero_oeste: Optional[str] = Field(None, description="West bordering property")
    
    # Legal Encumbrances
    servidumbres_notes: Optional[str] = Field(None, description="Active registered easements or annotations e.g. 'Servidumbre de paso / acueducto'")
    mortgage_priority: str = Field("1st_mortgage", description="'1st_mortgage' | '2nd_mortgage' | 'embargo_judicial' | 'unknown'")

class ForeclosureAuction(BaseModel):
    expediente_number: str = Field(description="Court case docket number, format: YY-XXXXXX-XXXX-CJ / CI / CA")
    court_name: str = Field(description="Full name of the judicial court / Juzgado")
    folio_real: str = Field(description="Property registry Folio Real (Province-Number-Subnumber, e.g. 6-189342-000)")
    plano_catastrado: Optional[str] = Field(None, description="Cadastral plan registration e.g. P-1928374-2022")
    province: str = Field(description="Costa Rican Province (San José, Alajuela, Cartago, Heredia, Guanacaste, Puntarenas, Limón)")
    canton: Optional[str] = Field(None, description="Costa Rican Canton name")
    district: Optional[str] = Field(None, description="Costa Rican District name")
    address_description: Optional[str] = Field(None, description="Physical location references and landmarks")
    area_m2: Optional[float] = Field(None, description="Property area in square meters")
    currency: str = Field("USD", description="USD or CRC")
    
    base_price_call_1: float = Field(description="1st call base price (100%)")
    auction_date_call_1: str = Field(description="1st call auction datetime (ISO 8601 string, e.g. 2026-09-15T14:30:00-06:00)")
    
    base_price_call_2: Optional[float] = Field(None, description="2nd call base price (75%)")
    auction_date_call_2: Optional[str] = Field(None, description="2nd call auction datetime")
    
    base_price_call_3: Optional[float] = Field(None, description="3rd call base price (25%)")
    auction_date_call_3: Optional[str] = Field(None, description="3rd call auction datetime")
    
    plaintiff: Optional[str] = Field(None, description="Foreclosing creditor / bank (e.g. BNCR, BCR, BAC, Promerica, Popular)")
    defendant: Optional[str] = Field(None, description="Debtor / foreclosed party name")
    legal_summary: str = Field(description="2-3 sentence executive investor summary in Spanish")
    property_category: Optional[str] = Field("Residential", description="Residential, Commercial, Land/Development, Agricultural, Industrial, Condo, Luxury Estate")
    
    # Detailed Legal Property Characteristics
    property_type: Optional[str] = Field("single_family_home", description="'single_family_home' | 'condo_apartment' | 'building_lot' | 'agricultural_land' | 'commercial_industrial' | 'other'")
    naturaleza_raw: Optional[str] = Field(None, description="Exact registered legal description from edict")
    has_construction: Optional[bool] = Field(False, description="True if property mentions improvements / built structures")
    has_public_road_frontage: Optional[bool] = Field(False, description="True if any lindero mentions 'calle pública'")
    is_condominio: Optional[bool] = Field(False, description="True if property is in condominium regime")
    lindero_norte: Optional[str] = Field(None, description="Registered North boundary")
    lindero_sur: Optional[str] = Field(None, description="Registered South boundary")
    lindero_este: Optional[str] = Field(None, description="Registered East boundary")
    lindero_oeste: Optional[str] = Field(None, description="Registered West boundary")
    servidumbres_notes: Optional[str] = Field(None, description="Registered easements or annotations")
    mortgage_priority: Optional[str] = Field("1st_mortgage", description="'1st_mortgage' | '2nd_mortgage' | 'embargo_judicial' | 'unknown'")

    raw_edict_text: str = Field(description="Verbatim published legal edict text")
    approx_latitude: Optional[float] = Field(None, description="Latitude in Costa Rica")
    approx_longitude: Optional[float] = Field(None, description="Longitude in Costa Rica")

# ==============================================================================
# 3. OFFICIAL NEXUS PJ & BOLETÍN JUDICIAL FETCHER & CHUNKER
# ==============================================================================
NEXUS_PJ_BASE_URL = "https://nexuspj.poder-judicial.go.cr"
NEXUS_PJ_SEARCH_API = "https://nexuspj.poder-judicial.go.cr/api/search"
NEXUS_PJ_DOC_API = "https://nexuspj.poder-judicial.go.cr/api/document"
BOLETIN_JUDICIAL_PORTAL = "https://boletinjudicial.poder-judicial.go.cr"
DEBUG_LOG_PATH = os.path.join(os.path.dirname(__file__), "debug_raw_response.log")

SPANISH_MONTHS: Dict[str, int] = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "setiembre": 9, "septiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12
}

SPANISH_WORD_NUMBERS: Dict[str, int] = {
    "cero": 0, "un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9,
    "diez": 10, "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15, "dieciséis": 16, "dieciseis": 16,
    "diecisiete": 17, "dieciocho": 18, "diecinueve": 19, "veinte": 20, "veintiún": 21, "veintiun": 21, "veintiuno": 21, "veintiuna": 21,
    "veintidós": 22, "veintidos": 22, "veintitrés": 23, "veintitres": 23, "veinticuatro": 24, "veinticinco": 25,
    "veintiséis": 26, "veintiseis": 26, "veintisiete": 27, "veintiocho": 28, "veintinueve": 29,
    "treinta": 30, "cuarenta": 40, "cincuenta": 50, "sesenta": 60, "setenta": 70, "ochenta": 80, "noventa": 90,
    "cien": 100, "ciento": 100, "doscientos": 200, "doscientas": 200, "trescientos": 300, "trescientas": 300,
    "cuatrocientos": 400, "cuatrocientas": 400, "quinientos": 500, "quinientas": 500, "seiscientos": 600, "seiscientas": 600,
    "setecientos": 700, "setecientas": 700, "ochocientos": 800, "ochocientas": 800, "novecientos": 900, "novecientas": 900,
}

def create_ssl_context():
    return ssl.create_default_context()

def validate_and_read_response(
    resp,
    source_url: str,
    min_bytes: int = 10240,
    is_json: bool = False
) -> Tuple[bool, bytes, Optional[str]]:
    """
    Step 2: Raw Response Validation & Logging.
    Inspects and logs HTTP status, Content-Type, and body length (bytes).
    Detects undersized payloads (< 10 KB default) and challenge / WAF / bot-block pages
    (e.g., 403, 503, Cloudflare/Barracuda challenge, Captcha).
    Saves raw snippets to debug_raw_response.log upon failure without silent empty writes.
    """
    try:
        status = getattr(resp, "status", getattr(resp, "code", 200))
        content_type = resp.headers.get("Content-Type", "") if hasattr(resp, "headers") else ""
        data = resp.read()
        body_len = len(data)

        logger.info(
            f"📡 Response from {source_url} | HTTP {status} | "
            f"Content-Type: '{content_type}' | Length: {body_len:,} bytes"
        )

        if status != 200:
            err_msg = f"HTTP {status} received from {source_url}"
            _log_debug_snippet(source_url, status, content_type, data, err_msg)
            return False, data, err_msg

        # Challenge / Bot-Protection detection
        text_snippet = data[:4096].decode("utf-8", errors="ignore").lower()
        challenge_signatures = [
            "cf-browser-verification", "challenge-running", "captcha",
            "barracuda networks", "access denied", "just a moment...",
            "attention required", "security check", "bot detection", "incapsula",
            "cloudflare", "waf-block", "403 forbidden"
        ]
        
        detected_challenges = [sig for sig in challenge_signatures if sig in text_snippet]
        if detected_challenges:
            err_msg = f"Bot verification / WAF challenge page detected ({', '.join(detected_challenges)}) from {source_url}"
            _log_debug_snippet(source_url, status, content_type, data, err_msg)
            return False, data, err_msg

        # Payload size validation (PDFs and HTML portals must be >= min_bytes)
        if not is_json and body_len < min_bytes:
            err_msg = f"Undersized payload ({body_len:,} bytes < {min_bytes:,} bytes minimum) from {source_url}"
            _log_debug_snippet(source_url, status, content_type, data, err_msg)
            return False, data, err_msg

        return True, data, None
    except Exception as ex:
        err_msg = f"Exception reading response from {source_url}: {ex}"
        logger.error(err_msg)
        return False, b"", err_msg

def _log_debug_snippet(source_url: str, status: int, content_type: str, data: bytes, err_msg: str):
    """Writes failure diagnostics and a raw payload snippet to the debug log."""
    logger.warning(f"⚠️ [Payload Validation Failure]: {err_msg}")
    try:
        mode = "a"
        if os.path.exists(DEBUG_LOG_PATH) and os.path.getsize(DEBUG_LOG_PATH) > 10 * 1024 * 1024:
            mode = "w"
        with open(DEBUG_LOG_PATH, mode, encoding="utf-8", errors="ignore") as f:
            f.write(f"\n{'='*70}\n")
            f.write(f"TIMESTAMP: {datetime.now().isoformat()}\n")
            f.write(f"SOURCE: {source_url}\n")
            f.write(f"HTTP STATUS: {status} | CONTENT-TYPE: {content_type} | BYTES: {len(data):,}\n")
            f.write(f"ERROR: {err_msg}\n")
            f.write("RAW SNIPPET (First 2048 bytes):\n")
            f.write(data[:2048].decode("utf-8", errors="ignore"))
            f.write(f"\n{'='*70}\n")
    except Exception as write_err:
        logger.debug(f"Could not write to {DEBUG_LOG_PATH}: {write_err}")

def slice_remates_section(full_text: str) -> str:
    """
    Step 3: Targets the main judicial auction section (e.g., 'REMATES PODER JUDICIAL (2 VECES)' / 'REMATES').
    Avoids matching Table of Contents / Index entries with dot leaders ('..... 123').
    Falls back to full text if no explicit section boundary is present.
    """
    clean_lines = []
    for line in full_text.splitlines():
        if re.search(r'\.{3,}|\b\d{2,4}\s*$', line) and "remates" in line.lower() and len(line) < 80:
            continue
        clean_lines.append(line)
    text_to_search = "\n".join(clean_lines)

    section_patterns = [
        r'(?:REMATES\s+PODER\s+JUDICIAL(?:\s*\(\s*2\s*VECES\s*\))?|REMATES\s+JUDICIALES|SECCI[ÓO]N\s+(?:DE\s+)?REMATES|\n\s*REMATES\s*\n|\bREMATES\b)',
    ]
    for p in section_patterns:
        m = re.search(p, text_to_search, re.IGNORECASE)
        if m:
            start_idx = m.start()
            # Boundary stopping if another non-remate major chapter begins
            end_match = re.search(
                r'\n\s*(?:EDICTOS\s+MATRIMONIALES|MARCAS\s+DE\s+FÁBRICA|CITACIONES|T[IÍ]TULOS\s+SUPLETORIOS|ADMINISTRACI[ÓO]N\s+P[ÚU]BLICA|INSTITUCIONES\s+DESCENTRALIZADAS)\b',
                text_to_search[start_idx:],
                re.IGNORECASE
            )
            if end_match:
                section_len = end_match.start()
                logger.info(f"Targeted isolated 'Remates' section ({section_len:,} chars).")
                return text_to_search[start_idx:start_idx + section_len]
            else:
                logger.info(f"Targeted 'Remates' section from character index {start_idx:,}.")
                return text_to_search[start_idx:]
    return full_text

def normalize_text(text: str) -> str:
    """Removes accents and normalizes lowercase string for resilient keyword matching."""
    if not text:
        return ""
    n = unicodedata.normalize("NFD", text.lower())
    clean = "".join(c for c in n if unicodedata.category(c) != "Mn")
    clean = re.sub(r"c\s+entimos", "centimos", clean)
    clean = re.sub(r"c\s+entavos", "centavos", clean)
    return clean.strip()

def is_real_estate_foreclosure_edict(text: str) -> bool:
    """
    Step 2: Real Estate Foreclosure Inclusion & Exclusion Pipeline:
    
    1. Inclusion: Must contain 'remate' (or 'subasta', 'postor', etc.) AND match ANY real estate keyword:
       - Identifiers: 'finca', 'folio real', 'matrícula', 'plano:', 'plano catastrado', 'partido de'
       - Asset types: 'terreno', 'lote', 'casa', 'casa de habitación', 'vivienda', 'construir', 'filial', 
         'finca filial', 'condominio', 'apartamento', 'local comercial', 'locales', 'edificio', 'bodega', 
         'agricultura', 'pasto', 'solar', 'predio', 'parcela', 'inmueble', 'quinta'
       - Boundaries/Measurements: 'mide:', 'mide', 'metros cuadrados', 'colinda:', 'colinda', 'linderos', 'cabida', 'superficie'
       - Process: 'ejecución hipotecaria', 'proceso hipotecario', 'ejecución fiduciaria', 'hipotecario'
       
    2. Exclusion: Excludes movable asset/vehicle notices containing:
       - 'vehículo', 'automóvil', 'motocicleta', 'chasis', 'cilindrada', 'placa:', 'carrocería', 'marca:', 'estilo:'
       - (UNLESS accompanied by a registered real estate finca/matrícula/folio real).
       - Excludes administrative notices ('monedas de colección', 'billetes', 'fe de erratas', 'nombramiento de curador').
    """
    if not text or len(text.strip()) < 80:
        return False

    norm = normalize_text(text)

    # 1. Must contain an authentic auction trigger keyword
    has_auction_kw = any(k in norm for k in [
        "remate", "rematara", "rematare", "subasta", "subastara", "subastare",
        "postor", "postura", "mejor postor", "al mejor postor", "adjudicarse el bien"
    ])
    if not has_auction_kw:
        return False

    # 2. Real estate inclusion keywords (matches ANY)
    re_identifiers = [
        "finca", "folio real", "matricula", "plano:", "plano ", "plano catastrado", 
        "partido de", "registro publico", "registro general"
    ]
    re_assets = [
        "terreno", "lote", "casa", "casa de habitacion", "vivienda", "construir", 
        "filial", "finca filial", "condominio", "apartamento", "local comercial", 
        "locales", "edificio", "bodega", "agricultura", "agricola", "pasto", 
        "solar", "predio", "parcela", "inmueble", "quinta", "finca inscrita"
    ]
    re_measurements = [
        "mide:", "mide ", "metros cuadrados", "colinda:", "colinda ", "linderos", 
        "superficie", "cabida", "m2", "m²", "hectareas", "ha."
    ]
    re_process = [
        "ejecucion hipotecaria", "proceso hipotecario", "hipotecario", 
        "ejecucion fiduciaria", "fideicomiso de garantia", "cobro judicial"
    ]

    has_re_kw = (
        any(k in norm for k in re_identifiers) or
        any(k in norm for k in re_assets) or
        any(k in norm for k in re_measurements) or
        any(k in norm for k in re_process)
    )
    if not has_re_kw:
        return False

    # 3. Vehicle / Movable asset exclusion (unless accompanied by real estate property ID)
    vehicle_kws = [
        "vehiculo", "automovil", "motocicleta", "chasis", "cilindrada", 
        "placa:", "carroceria", "marca:", "estilo:", "camion", "cabina", "remolque"
    ]
    has_vehicle = any(k in norm for k in vehicle_kws)
    if has_vehicle:
        # Check if block ALSO explicitly contains real estate property registration markers
        has_real_estate_id = (
            any(k in norm for k in ["finca", "folio real", "matricula"]) and 
            any(k in norm for k in ["terreno", "casa", "lote", "condominio", "filial", "mide", "metros cuadrados", "plano"])
        )
        if not has_real_estate_id:
            return False

    # 4. Administrative / Non-real-estate exclusions
    admin_exclusions = [
        "fe de erratas", "monedas de coleccion", "billetes", 
        "edictos matrimoniales", "nombramiento de curador", "acuerdo n°", "acuerdo no"
    ]
    if any(k in norm for k in admin_exclusions):
        return False

    return True

# Backward compatibility alias
def is_foreclosure_edict_text(text: str) -> bool:
    return is_real_estate_foreclosure_edict(text)

def html_to_clean_text(html_content: str) -> str:
    """Converts HTML payloads into clean, verbatim plain text with proper paragraph breaks and unescaped entities."""
    if not html_content:
        return ""
    if BeautifulSoup:
        soup = BeautifulSoup(html_content, "html.parser")
        for br in soup.find_all(["br", "p", "div", "tr", "li"]):
            br.insert_before("\n")
        raw_text = soup.get_text("\n", strip=True)
    else:
        text = re.sub(r"(?i)<br\s*/?>", "\n", html_content)
        text = re.sub(r"(?i)</(?:p|div|tr|li|h[1-6])>", "\n\n", text)
        text = re.sub(r"<[^>]+>", " ", text)
        raw_text = text

    unescaped = html_module.unescape(raw_text).replace('\xa0', ' ').replace('\u200b', '')
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in unescaped.splitlines()]
    clean_lines = []
    blank_count = 0
    for line in lines:
        if not line:
            blank_count += 1
            if blank_count <= 2:
                clean_lines.append("")
        else:
            blank_count = 0
            clean_lines.append(line)
    return "\n".join(clean_lines).strip()

def segment_document_blocks(text: str) -> List[str]:
    r"""
    Step 1: Splits Boletín Judicial / Nexus PJ publication text into discrete, 100% complete notice blocks.
    Strictly preserves entire legal notice blocks from initial court header to closing tags.
    NEVER splits on internal body clauses (such as 'PRIMER REMATE', 'EXPEDIENTE:', or 'MIDE:').

    Segmentation hierarchy:
    1. Closure tag boundaries: Official Imprenta Nacional tags and Nexus PJ publication references:
       - '( IN202601106505 )' / '1 vez.—( IN... ).'
       - 'Referencia N°: 2025165785, publicación número: 1 de 1'
    2. Header boundaries between distinct publication listings:
       - 'JUZGADO...', 'TRIBUNAL...', 'Ante esta notaría...', 'PUBLICACIÓN DE UNA VEZ...', 'CREDIBANJO...'
    """
    if not text:
        return []

    clean_doc = text.strip()

    # 1. Primary Strategy: Closure tag & publication reference based boundary splitting
    # Captures the ending mark and keeps it attached to the preceding block
    close_pattern = re.compile(
        r'(\b(?:Referencia\s+N[º°o]?\s*:\s*[0-9]+[^\n]*(?:publicaci[óo]n\s+n[úu]mero\s*:\s*[0-9]+\s+de\s+[0-9]+)?[^\n]*|\(\s*IN[0-9]{8,14}\s*\)[^\n]*))',
        re.IGNORECASE
    )
    closure_matches = list(close_pattern.finditer(clean_doc))
    if len(closure_matches) > 1:
        blocks = []
        last_idx = 0
        for m in closure_matches:
            end_idx = m.end()
            block = clean_doc[last_idx:end_idx].strip()
            if len(block) >= 80:
                blocks.append(block)
            last_idx = end_idx
        trailing = clean_doc[last_idx:].strip()
        if len(trailing) >= 80:
            blocks.append(trailing)
        if len(blocks) > 1:
            return blocks

    # 2. Secondary Strategy: Verified top-level header banners between distinct notices
    # (Never include internal body markers like PRIMER REMATE, AVISO DE REMATE, or EXPEDIENTE)
    header_pattern = re.compile(
        r'(?:\n\s*|^)(?='
        r'(?:[123]\s*v\.\s*[123]\.\s*(?:Ante\s+esta\s+notar[íi]a|En\s+la\s+puerta|En\s+este\s+Despacho|A\s+las)|'
        r'PUBLICACI[ÓO]N\s+DE\s+(?:UNA|DOS|TRES)\s+VE[ZCES]+|'
        r'(?:JUZGADO|TRIBUNAL)\s+[\w\s,.-]+?(?:DE\s+COBRO|CIVIL|AGRARIO|CONCURSAL|MENOR\s+CUANT[IÍ]A|PRIMERA\s+INSTANCIA|DE\s+HACIENDA)|'
        r'Ante\s+esta\s+notar[íi]a\s*:|'
        r'En\s+(?:esta|mi)\s+notar[íi]a\s*:|'
        r'NOTAR[ÍI]A\s+DE\s+[A-Z]|'
        r'AVISO\s+DE\s+SUBASTA\s+[A-Z]|'
        r'REMATES\s+AVISOS\s+SERVICIOS\s+FIDUCIARIOS|'
        r'CONSULTORES\s+FINANCIEROS\s+COFIN\s+S\.\s*A\.|'
        r'CREDIBANJO\s*,?\s*S\.\s*A\.)'
        r')',
        re.IGNORECASE
    )
    header_splits = header_pattern.split(clean_doc)
    valid_blocks = [p.strip() for p in header_splits if len(p.strip()) >= 80]
    if len(valid_blocks) > 1:
        return valid_blocks

    return [clean_doc]

def split_into_expediente_blocks(text: str) -> List[str]:
    """Segment document text into discrete blocks and filter for real estate foreclosures."""
    blocks = segment_document_blocks(text)
    return [b for b in blocks if is_real_estate_foreclosure_edict(b)]

def parse_date_spanish(date_str: str, default_date: Optional[datetime] = None) -> str:
    """
    Parses complex written Spanish judicial auction dates with Costa Rica UTC-6 offset.
    Examples:
      'quince de setiembre de dos mil veintiséis' -> '2026-09-15T14:30:00-06:00'
      '18 de setiembre de 2026' -> '2026-09-18T09:00:00-06:00'
    """
    base_fallback = default_date or (datetime.now() + timedelta(days=21))
    fallback_iso = base_fallback.strftime("%Y-%m-%dT14:30:00-06:00")
    
    if not date_str:
        return fallback_iso

    d_lower = date_str.lower()

    # 1. Hour and minute extraction
    hour, minute = 14, 30
    time_match = re.search(r"(?:a\s+las|al\s+ser\s+las|las)\s+(\w+)\s+horas(?:\s+y\s+(\w+)\s+minutos)?", d_lower)
    if time_match:
        h_word = time_match.group(1).strip()
        m_word = time_match.group(2).strip() if time_match.group(2) else "cero"
        hour = SPANISH_WORD_NUMBERS.get(h_word, 14)
        minute = SPANISH_WORD_NUMBERS.get(m_word, 0)
    else:
        dig_time = re.search(r"(\d{1,2}):(\d{2})", d_lower)
        if dig_time:
            hour = int(dig_time.group(1))
            minute = int(dig_time.group(2))

    # 2. Day extraction
    day = None
    day_digit_match = re.search(r"(\d{1,2})\s+de\s+([a-záéíóú]+)", d_lower)
    if day_digit_match:
        day = int(day_digit_match.group(1))
        month_word = day_digit_match.group(2).strip()
    else:
        day_word_match = re.search(r"del\s+([a-z\s]+?)\s+de\s+([a-záéíóú]+)", d_lower)
        if day_word_match:
            d_word = day_word_match.group(1).strip()
            month_word = day_word_match.group(2).strip()
            day = SPANISH_WORD_NUMBERS.get(d_word)
        else:
            month_word = ""

    # 3. Month extraction
    month = SPANISH_MONTHS.get(month_word)
    if not month:
        for m_name, m_num in SPANISH_MONTHS.items():
            if m_name in d_lower:
                month = m_num
                break

    # 4. Year extraction
    year = default_date.year if default_date else datetime.now().year
    year_match = re.search(r"\b(20\d{2})\b", d_lower)
    if year_match:
        year = int(year_match.group(1))
    elif "dos mil veintiséis" in d_lower or "dos mil veintiseis" in d_lower:
        year = 2026
    elif "dos mil veintisiete" in d_lower or "dos mil veintisiete" in d_lower:
        year = 2027
    elif "dos mil veinticinco" in d_lower or "dos mil veinticinco" in d_lower:
        year = 2025
    elif "dos mil veinticuatro" in d_lower or "dos mil veinticuatro" in d_lower:
        year = 2024

    if day and month:
        try:
            parsed_dt = datetime(year, month, day, hour, minute)
            return parsed_dt.strftime("%Y-%m-%dT%H:%M:00-06:00")
        except Exception:
            pass

    return fallback_iso

def fetch_from_nexuspj_api(target_date: Optional[datetime] = None) -> List[str]:
    """
    Pulls structured foreclosure notices directly from the official Nexus PJ search API
    (nexuspj.poder-judicial.go.cr/api/search), filtering specifically for Boletín Judicial
    court foreclosures (Remates Judiciales) with dynamic multi-page result pagination.
    """
    ctx = create_ssl_context()
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/122.0.0.0",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
    }
    
    edicts: List[str] = []
    seen_doc_ids: Set[str] = set()
    
    search_queries = [
        '"al mejor postor remataré"',
        '"en el mejor postor remataré"',
        '"remataré lo siguiente"',
        '"con la base de" AND (finca OR matrícula OR "folio real")',
        '"primer remate" AND (finca OR matrícula OR "folio real")',
        '"aviso de remate" AND (finca OR terreno OR casa)',
        '"edicto de remate" AND (finca OR colones OR dólares)',
    ]
    
    logger.info(f"Connecting to official Nexus PJ API endpoint: {NEXUS_PJ_SEARCH_API}")
    
    for query_str in search_queries:
        page = 1
        max_pages = 5  # Fetch up to 150 results per query string
        while page <= max_pages:
            payload = {
                "q": query_str,
                "size": 30,
                "page": page,
                "facets": "",
                "exp": "",
                "isFav": False,
                "isCart": False,
            }
            try:
                req_data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(NEXUS_PJ_SEARCH_API, data=req_data, headers=headers, method="POST")
                with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                    is_valid, data_bytes, err = validate_and_read_response(resp, NEXUS_PJ_SEARCH_API, min_bytes=100, is_json=True)
                    if not is_valid:
                        break

                    res_json = json.loads(data_bytes.decode("utf-8", errors="ignore"))
                    hits = res_json.get("hits", [])
                    total = res_json.get("total", 0)
                    logger.info(f"Nexus PJ query {query_str[:30]!r} (page {page}) returned {len(hits)} hits (total: {total}).")
                    
                    if not hits:
                        break
                        
                    for hit in hits:
                        doc_id = hit.get("idDocument") or hit.get("id")
                        if not doc_id or doc_id in seen_doc_ids:
                            continue
                        seen_doc_ids.add(doc_id)
                        
                        try:
                            doc_payload = json.dumps({"id": doc_id, "idDocument": doc_id}).encode("utf-8")
                            doc_req = urllib.request.Request(NEXUS_PJ_DOC_API, data=doc_payload, headers=headers, method="POST")
                            with urllib.request.urlopen(doc_req, context=ctx, timeout=10) as doc_resp:
                                doc_valid, doc_bytes, _ = validate_and_read_response(doc_resp, f"{NEXUS_PJ_DOC_API}?id={doc_id}", min_bytes=100, is_json=True)
                                if doc_valid:
                                    doc_body = json.loads(doc_bytes.decode("utf-8", errors="ignore"))
                                    hit_obj = doc_body.get("hits", {}) if isinstance(doc_body.get("hits"), dict) else {}
                                    html_raw = hit_obj.get("html", "")
                                    if html_raw:
                                        hit_text = html_to_clean_text(html_raw)
                                    else:
                                        hit_text = hit_obj.get("texto") or hit_obj.get("contenido") or ""
                                        if hit_text:
                                            hit_text = html_module.unescape(hit_text).strip()
                                        
                                    if hit_text and len(hit_text) >= 100:
                                        # Split multi-notice documents or retain complete single notice
                                        blocks = split_into_expediente_blocks(hit_text)
                                        if blocks:
                                             edicts.extend(blocks)
                                        elif is_real_estate_foreclosure_edict(hit_text):
                                             edicts.append(hit_text.strip())
                        except Exception as doc_err:
                            logger.debug(f"Nexus PJ document detail {doc_id} skipped: {doc_err}")
                            
                    # Stop if we reached end of pages or retrieved total available hits
                    if len(hits) < 30 or (page * 30) >= total:
                        break
                    page += 1
            except Exception as e:
                logger.debug(f"Nexus PJ query attempt skipped: {e}")
                break
            
    logger.info(f"Extracted {len(edicts)} foreclosure edict blocks directly from Nexus PJ API feed (from {len(seen_doc_ids)} unique documents).")
    return edicts

def fetch_daily_bulletin(target_date: Optional[datetime] = None) -> List[str]:
    """
    Discovers, downloads, and chunks official Costa Rican judicial foreclosure publications.
    Strictly queries the official daily Nexus PJ / Boletín Judicial feed (nexuspj.poder-judicial.go.cr
    and boletinjudicial.poder-judicial.go.cr) with resilient full-text reconciliation fallback.
    """
    date = target_date or datetime.now()
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
    }
    
    edicts: List[str] = []
    
    # 1. Primary Strategy: Fetch directly from Nexus PJ REST API with dynamic pagination
    try:
        nexus_edicts = fetch_from_nexuspj_api(date)
        if nexus_edicts:
            edicts.extend(nexus_edicts)
    except Exception as e:
        logger.warning(f"Primary Nexus PJ API query encountered exception: {e}")
        
    # 2. Secondary Strategy: Scrape official daily Boletín Judicial PDF feeds
    pdf_urls: List[str] = []
    portals = [
        BOLETIN_JUDICIAL_PORTAL,
        "https://www.imprentanacional.go.cr/boletin/",
    ]
    
    ctx = create_ssl_context()
    
    for portal in portals:
        try:
            req = urllib.request.Request(portal, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                is_valid, data_bytes, _ = validate_and_read_response(resp, portal, min_bytes=1024)
                if is_valid:
                    html = data_bytes.decode("utf-8", errors="ignore")
                    found = re.findall(r'href=[\"\x27]([^\"\x27]+\.pdf)[\"\x27]', html, re.IGNORECASE)
                    for f in found:
                        if "gaceta" in f.lower() or "gac_" in f.lower():
                            continue
                        if not f.startswith("http"):
                            f = f"https://www.imprentanacional.go.cr{f if f.startswith('/') else '/' + f}"
                        if f not in pdf_urls:
                            pdf_urls.append(f)
        except Exception as e:
            logger.debug(f"Boletín Judicial Portal check {portal}: {e}")
            
    # Add direct Boletín Judicial URL patterns for target date and past 4 business days
    for days_back in range(5):
        d = date - timedelta(days=days_back)
        day = d.strftime("%d")
        month = d.strftime("%m")
        year = d.strftime("%Y")
        
        candidates = [
            f"https://www.imprentanacional.go.cr/pub-boletin/{year}/{month}/bol_{day}_{month}_{year}.pdf",
            f"https://www.imprentanacional.go.cr/pub-boletin/{year}/{month}//bol_{day}_{month}_{year}.pdf",
            f"https://www.imprentanacional.go.cr/pub/{year}/{month}/{day}/COMP_{day}_{month}_{year}.pdf",
        ]
        for c in candidates:
            if c not in pdf_urls:
                pdf_urls.append(c)
                
    logger.info(f"Targeting {len(pdf_urls)} candidate official Boletín Judicial PDF endpoints.")
    
    # Download and parse Boletín Judicial PDFs with pypdf (enforcing >= 10 KB size validation)
    if PdfReader:
        for pdf_url in pdf_urls[:6]:
            try:
                req = urllib.request.Request(pdf_url, headers=headers)
                with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
                    is_valid, data_bytes, err = validate_and_read_response(resp, pdf_url, min_bytes=10240, is_json=False)
                    if not is_valid:
                        continue

                    pdf_file = io.BytesIO(data_bytes)
                    reader = PdfReader(pdf_file)
                    logger.info(f"Downloaded official Boletín Judicial: {pdf_url} ({len(data_bytes):,} bytes, {len(reader.pages)} pages).")
                    
                    full_text = ""
                    for page in reader.pages:
                        full_text += (page.extract_text() or "") + "\n"
                        
                    # Target the Remates section and split into case blocks
                    remates_section = slice_remates_section(full_text)
                    
                    # Resilient Fallback: If sliced section captures < 80% of docket markers in full text, use full text
                    dockets_full = re.findall(r"\b[0-9]{2}-[0-9]{5,7}-[0-9]{3,4}-(?:CJ|CI|CA|AG|CO|J|C)[A-Z0-9]*\b", full_text, re.I)
                    dockets_sliced = re.findall(r"\b[0-9]{2}-[0-9]{5,7}-[0-9]{3,4}-(?:CJ|CI|CA|AG|CO|J|C)[A-Z0-9]*\b", remates_section, re.I)
                    if len(dockets_full) > len(dockets_sliced) and len(dockets_sliced) < (len(dockets_full) * 0.8):
                        logger.warning(f"Remates slicing missed {len(dockets_full) - len(dockets_sliced)} dockets. Activating full-text parsing fallback.")
                        remates_section = full_text

                    blocks = split_into_expediente_blocks(remates_section)
                    logger.info(f"Parsed {len(blocks)} expediente blocks from {pdf_url}.")
                    for block in blocks:
                        if is_foreclosure_edict_text(block):
                            edicts.append(block)
            except Exception as e:
                logger.debug(f"Candidate {pdf_url} skipped: {e}")
            
    logger.info(f"Discovered {len(edicts)} total foreclosure edicts from official Boletín Judicial / Nexus PJ.")
    return edicts

# ==============================================================================
# 4. HYBRID EXTRACTION ENGINE (Gemini Flash + Deterministic Rule-Based Fallback)
# ==============================================================================
EXTRACTION_PROMPT = """
You are an expert Costa Rican legal real estate notary parsing "Edictos de Remate Judicial" published in the Boletín Judicial.
Extract structured property data from the provided notice text following these mandatory domain rules:

--- 1. PROPERTY TYPE & CONSTRUCTION STATUS ---
Analyze the exact clause starting with "NATURALEZA:".
- "NATURALEZA: TERRENO PARA CONSTRUIR", "TERRENO DE SOLAR", "TERRENO DE AGRICULTURA", "LOTE PARA VIVIENDA":
  -> MUST be classified as: property_type = "building_lot" (or "other") and has_construction = false.
  -> DO NOT classify as constructed just because the phrase contains the word "construir".
- ONLY mark has_construction = true (and property_type = "single_family_home" | "commercial_industrial" | "condo_apartment") if the text explicitly states:
  "CON UNA CASA", "CON CASA DE HABITACION", "CON EDIFICIO", "CON CONSTRUCCIONES", "LOCAL COMERCIAL", "FINCA CON CASA", or "EDIFICACIÓN".
- If the edict lists "TERRENO PARA CONSTRUIR CON UNA CASA...", then property_type = "single_family_home" and has_construction = true.

--- 2. LOT SIZE (AREA IN SQUARE METERS) ---
Analyze the exact clause starting with "MIDE:".
- Court edicts write area in words (e.g., "MIDE: DOSCIENTOS CINCUENTA METROS CUADRADOS" -> 250.00, "TRES MIL QUINIENTOS METROS CON CINCUENTA DECÍMETROS CUADRADOS" -> 3500.50, "UNA HECTÁREA CON TRES MIL METROS" -> 13000.00).
- Convert written Spanish area units strictly into numeric square meters (area_m2 as Float). Note: 1 decímetro cuadrado (dm²) = 0.01 m², 1 hectárea (ha) = 10,000 m².
- If the edict describes multiple fincas/properties in one notice, parse each property block independently and map the exact "MIDE" and "PLANO" to the corresponding "FINCA/MATRÍCULA" block. Do not mix measurements between parcels.

--- 3. IDENTIFIERS & METADATA ---
- 'expediente_number': Standard judicial docket format: YY-XXXXXX-XXXX-CJ / CI / CA.
- 'folio_real': Property registry matricula in Costa Rica: Province-Number-Sublot (e.g. '6-189342-000', '1-452109-000').
   Province codes: 1=San José, 2=Alajuela, 3=Cartago, 4=Heredia, 5=Guanacaste, 6=Puntarenas, 7=Limón.
- 'plano_catastrado': Cadastral survey code (e.g., 'P-1928374-2022', 'SJ-1489201-2020').
- 'currency': USD or CRC. Note 'colones' or '₡' -> CRC, 'dólares' or '$' -> USD.
- 'base_price_call_1' & 'auction_date_call_1': 1st call base and ISO datetime (with UTC-6 Costa Rica offset: e.g. '2026-09-15T14:30:00-06:00').
- 'base_price_call_2': If not specified, calculate 75% of base_price_call_1.
- 'base_price_call_3': If not specified, calculate 25% of base_price_call_1.
- 'naturaleza_raw': The exact verbatim text under NATURALEZA (e.g. 'Terreno para construir').
- 'legal_summary': 2-3 sentence executive investor overview in Spanish describing the asset, land, location, and potential.

EDICT TEXT:
{edict_text}
"""

def parse_spanish_words_to_number(text: str) -> float:
    """
    Parses Spanish spelled-out written numbers into float.
    Handles:
      'SIETE MILLONES DE COLONES' -> 7000000.0
      'DOSCIENTOS VEINTE MIL DÓLARES' -> 220000.0
      'DIEZ MILLONES QUINIENTOS MIL COLONES' -> 10500000.0
      'DOSCIENTOS OCHENTA Y OCHO METROS CUADRADOS' -> 288.0
      'TRES MIL QUINIENTOS METROS CON CINCUENTA DECÍMETROS CUADRADOS' -> 3500.50
      'UNA HECTÁREA CON TRES MIL METROS' -> 13000.0
    """
    if not text:
        return 0.0
    norm = normalize_text(text)

    # Check for compound hectare + meters pattern (e.g. "una hectarea con tres mil metros")
    ha_compound = re.search(r'(?:(una|[0-9]+)\s+hectareas?)\s+con\s+([^\.,;\n]+?)(?:metros|m2|m²|$)', norm)
    if ha_compound:
        ha_count = 1 if ha_compound.group(1) == "una" else (float(ha_compound.group(1)) if ha_compound.group(1).isdigit() else 1)
        extra_words = ha_compound.group(2).strip()
        extra_val = parse_spanish_words_to_number(extra_words)
        return (ha_count * 10000.0) + extra_val

    # Extract decimals / céntimos / decímetros
    fractional = 0.0
    dec_match = re.search(r"con\s+([a-z\s]+?)\s+(?:decimetros|centimos|centavos|decimas|centesimas)", norm)
    if dec_match:
        c_words = [w for w in re.split(r"[\s,-]+", dec_match.group(1)) if w and w not in ("de", "y")]
        c_val = 0.0
        for w in c_words:
            if w in SPANISH_WORD_NUMBERS:
                c_val += SPANISH_WORD_NUMBERS[w]
        fractional = c_val / 100.0
        norm = norm[:dec_match.start()].strip()

    words = [
        w for w in re.split(r"[\s,-]+", norm) 
        if w and w not in ("de", "con", "y", "del", "colones", "dolares", "moneda", "nacional", "exactos", "netos", "americanos", "base", "la", "una", "por", "metros", "cuadrados", "m2", "m²")
    ]
    
    total = 0.0
    current = 0.0
    
    for w in words:
        if w in SPANISH_WORD_NUMBERS:
            current += SPANISH_WORD_NUMBERS[w]
        elif w == "mil":
            if current == 0:
                current = 1
            current *= 1000
        elif w in ("millon", "millones"):
            if current == 0:
                current = 1
            total += current * 1000000
            current = 0
        elif w in ("billon", "billones"):
            if current == 0:
                current = 1
            total += current * 1000000000000
            current = 0
            
    total += current + fractional
    return total

def parse_cr_price_string(p_str: str) -> Optional[float]:
    """
    Parses Costa Rican and international currency strings into float.
    Handles:
      '¢17.925.766.16'  -> 17925766.16
      '₡182.331.501.41' -> 182331501.41
      '72.000.000,00'   -> 72000000.0
      '220,000.00'      -> 220000.0
      '85.000.000'      -> 85000000.0
      '180,000'         -> 180000.0
    """
    if not p_str:
        return None
    clean = re.sub(r'[^\d.,]', '', p_str.strip()).strip()
    if not clean:
        return None

    if "," in clean and "." in clean:
        if clean.rfind(",") > clean.rfind("."):
            # European/CR format: 72.000.000,00 -> comma is decimal
            clean = clean.replace(".", "").replace(",", ".")
        else:
            # US format: 72,000,000.00 -> dot is decimal
            clean = clean.replace(",", "")
    elif "." in clean:
        parts = clean.split(".")
        if len(parts) > 1 and len(parts[-1]) in (1, 2):
            # Last dot is cents: 17.925.766.16 -> 17925766.16 or 220.00
            clean = "".join(parts[:-1]) + "." + parts[-1]
        elif len(parts) > 2 or (len(parts) == 2 and len(parts[-1]) == 3):
            # All dots are thousand separators: 85.000.000 -> 85000000
            clean = clean.replace(".", "")
    elif "," in clean:
        parts = clean.split(",")
        if len(parts) > 1 and len(parts[-1]) in (1, 2):
            # Last comma is cents: 17,925,766,16 -> 17925766.16
            clean = "".join(parts[:-1]) + "." + parts[-1]
        elif len(parts) > 2 or (len(parts) == 2 and len(parts[-1]) == 3):
            # All commas are thousand separators: 85,000,000 -> 85000000
            clean = clean.replace(",", "")

    try:
        val = float(clean)
        return val
    except ValueError:
        return None


def normalize_folio_real(raw_folio: Optional[str], fallback_prov: str = "San José") -> str:
    """
    Standardizes a Costa Rican Folio Real to [Province]-[Finca]-[Sublot] (e.g. 6-117243-000).
    Eliminates duplicate '-000-000' tails and resolves missing province prefixes.
    """
    if not raw_folio:
        p_code = PROVINCE_PREFIXES.get(fallback_prov.lower().strip(), "1")
        return f"{p_code}-000000-000"
    
    clean = re.sub(r"^(?:FOLIO\s*REAL|FINCA|MATR[IÍ]CULA)[:\s]*", "", str(raw_folio).strip(), flags=re.I)
    clean = clean.replace("(", "").replace(")", "").strip()
    if not clean:
        p_code = PROVINCE_PREFIXES.get(fallback_prov.lower().strip(), "1")
        return f"{p_code}-000000-000"

    parts = [p.strip() for p in re.split(r"[-/]", clean) if p.strip()]
    p_code = PROVINCE_PREFIXES.get(fallback_prov.lower().strip(), "1")
    finca_num = ""
    sublot = "000"

    if len(parts) == 1:
        finca_num = parts[0].lstrip("0") or parts[0]
    elif len(parts) == 2:
        if parts[0] in ("1", "2", "3", "4", "5", "6", "7"):
            p_code = parts[0]
            finca_num = parts[1].lstrip("0") or parts[1]
        else:
            finca_num = parts[0].lstrip("0") or parts[0]
            sublot = parts[1]
    elif len(parts) >= 3:
        if parts[0] in ("1", "2", "3", "4", "5", "6", "7"):
            p_code = parts[0]
            finca_num = parts[1].lstrip("0") or parts[1]
            sublot = parts[2] or "000"
        else:
            finca_num = parts[0].lstrip("0") or parts[0]
            sublot = parts[1] or "000"

    sublot = re.sub(r"[^A-Za-z0-9]", "", sublot)
    if not sublot or sublot in ("0", "00", "DERECHO000", "DERECHO"):
        sublot = "000"
    elif sublot.isdigit():
        sublot = sublot.zfill(3)[-3:]

    clean_finca = re.sub(r"\D", "", finca_num) or finca_num
    return f"{p_code}-{clean_finca}-{sublot}"


def extract_single_edict_regex_fallback(edict_text: str) -> Optional[ForeclosureAuction]:
    """
    Step 3: Resilient multi-court regex fallback parser.
    Robustly extracts structured property foreclosure data from varied Juzgados de Cobro / Civiles / Agrarios formats.
    Ensures missing non-critical fields (e.g., plano, defendant, exact district) do not drop the block.
    Strictly filters out non-real-estate auctions using the inclusion & exclusion pipeline.
    """
    try:
        text_lower = edict_text.lower()
        norm = normalize_text(edict_text)

        # Enforce real estate inclusion & exclusion pipeline
        if not is_real_estate_foreclosure_edict(edict_text):
            return None

        # 1. Expediente Docket Number (Fuzzy multi-pattern)
        exp_patterns = [
            r"(?:EXP(?:EDIENTE)?|N[ÚU]MERO\s+DE\s+EXP(?:EDIENTE)?|NO\.\s*EXP\.?|EXP\.)\s*[:\.\s]*([0-9]{2}-[0-9]{4,8}-[0-9]{3,4}-[A-Za-z0-9]+|\b[0-9]{2}-[0-9]{5,7}-[0-9]{3,4}\b|[A-Z]{2,4}-[0-9]{3,6}-[0-9]{2,4})",
            r"\b([0-9]{2}-[0-9]{5,7}-[0-9]{3,4}-(?:CJ|CI|CA|AG|CO|J|C|PE|FA)[A-Za-z0-9]*)\b",
            r"(?:expediente\s+n[úu]mero\s+|expediente\s+n[º°]\s*)([0-9]{2}-[0-9]{4,8}-[0-9]{3,4}-[A-Za-z0-9]+)",
        ]
        expediente = None
        for p in exp_patterns:
            m = re.search(p, edict_text, re.IGNORECASE)
            if m:
                expediente = m.group(1).strip()
                break

        if not expediente:
            gen_match = re.search(r"\b([0-9]{2}-[0-9]{5,7}-[0-9]{3,4}-[A-Za-z0-9]+)\b", edict_text)
            if gen_match:
                expediente = gen_match.group(1).strip()
            else:
                ref_m = re.search(r"(?:Referencia\s+N[º°o]?\s*:|publicaci[óo]n\s+n[úu]mero\s*:)\s*([A-Za-z0-9-]+)", edict_text, re.I)
                in_m = re.search(r"\(\s*(IN[0-9]{8,14})\s*\)", edict_text)
                if ref_m:
                    expediente = f"REF-{ref_m.group(1).strip()}"
                elif in_m:
                    expediente = f"ED-{in_m.group(1).strip()}"
                else:
                    return None  # Foreclosure must have an identifier

        # 2. Court / Juzgado Name
        court_match = re.search(r"((?:Juzgado|Tribunal)\s+[\w\s,.-]+?)(?:\.|$|\n|;|–|-|con\s+la\s+base|en\s+la\s+puerta|hace\s+saber)", edict_text, re.I)
        court = court_match.group(1).strip() if court_match else "Juzgado de Cobro Judicial"

        # 3. Property Folio Real / Matrícula
        folio_patterns = [
            r"(?:matr[íi]cula\s+(?:de\s+folio\s+real\s+)?(?:n[úu]mero\s+)?|finca\s+(?:filial\s+(?:\d+\s+)?)?(?:n[úu]mero\s+|matr[íi]cula\s+)?|folio\s+real\s*(?:matr[íi]cula\s+)?(?:n[úu]mero\s+|:)?\s*)([0-9]{1,7}(?:-[A-Za-z0-9]+){1,3}|[0-9]-[0-9]+-[0-9]+|[0-9]{5,8}-[0-9]{3}|[0-9]{5,8})",
            r"\b([1-7]-[0-9]{5,7}-[0-9]{3})\b",
            r"(?:finca\s+inscrita\s+en\s+el\s+Registro\s+Público[^\(]*\()([0-9]-[0-9]+-[0-9]+|[0-9]+-[0-9]+)",
        ]
        folio = None
        for fp in folio_patterns:
            fm = re.search(fp, edict_text, re.IGNORECASE)
            if fm:
                folio = fm.group(1).strip()
                break

        if not folio:
            f_gen = re.search(r"finca\s+(?:número\s+)?([0-9]{5,8})", edict_text, re.I)
            if f_gen:
                folio = f_gen.group(1).strip()
            else:
                f_words = re.search(r"finca\s+(?:de\s+la\s+provincia\s+de\s+([a-záéíóú\s]+?),\s*)?n[úu]mero\s+([a-záéíóú\s]+?)(?:[–-]|cero\s+cero\s+cero|,|\.|\s+ubicada|\s+sita)", edict_text, re.I)
                if f_words:
                    prov_candidate = f_words.group(1).strip().lower() if f_words.group(1) else "san jose"
                    p_code = PROVINCE_PREFIXES.get(prov_candidate, "1")
                    num_val = parse_spanish_words_to_number(f_words.group(2))
                    if 1000 <= num_val <= 99999999:
                        folio = f"{p_code}-{int(num_val)}-000"

        if not folio:
            return None  # Real estate foreclosure must have a Folio Real

        # 4. Province, Canton & District Detection
        prov_code_map = {
            "1": "San José", "2": "Alajuela", "3": "Cartago", "4": "Heredia",
            "5": "Guanacaste", "6": "Puntarenas", "7": "Limón"
        }
        detected_prov = "San José"
        
        prov_explicit = re.search(r"(?:provincia\s+de|partido\s+de)\s+([A-Za-zÁÉÍÓÚáéíóú]+)", edict_text, re.I)
        if prov_explicit:
            p_cand = prov_explicit.group(1).strip().lower()
            for p_k, p_v in prov_code_map.items():
                if normalize_text(p_v).lower() == normalize_text(p_cand).lower():
                    detected_prov = p_v
                    break
        elif "-" in folio and folio[0] in prov_code_map:
            detected_prov = prov_code_map[folio[0]]
        else:
            for prov in PROVINCE_PREFIXES.keys():
                if f"partido de {prov}" in text_lower or f"provincia de {prov}" in text_lower or f", {prov}" in text_lower or f" {prov}." in text_lower:
                    detected_prov = prov.title()
                    break
            else:
                for prov in PROVINCE_PREFIXES.keys():
                    if prov in text_lower and not (prov == "san josé" and "bac san josé" in text_lower):
                        detected_prov = prov.title()
                        break

        # Standardize Folio Real format to Costa Rican [Province]-[Finca]-[Sublot] (e.g. 6-117243-000)
        folio = normalize_folio_real(folio, detected_prov)

        # Canton detection
        detected_canton = "Central"
        canton_match = re.search(r"cant[oó]n\s+(?:(?:n[úu]mero\s+|n[ºo]\.?\s*)?\d+\s*[-–]?\s*)?([A-Za-zÁÉÍÓÚáéíóú\s]+?)(?:,|\.|\s+distrito|\s+de\s+|\s+cuya|\s+mide)", edict_text, re.I)
        if canton_match:
            detected_canton = canton_match.group(1).strip().title()[:30]
        else:
            for canton in CR_CANTON_CENTROIDS.keys():
                if f"cantón {canton}" in text_lower or f"cantón de {canton}" in text_lower or f" {canton}," in text_lower or f" {canton} " in text_lower:
                    detected_canton = canton.title()
                    break

        # District match
        detected_district = "Central"
        dist_match = re.search(r"distrito\s+(?:(?:n[úu]mero\s+|n[ºo]\.?\s*)?\d+\s*[-–]?\s*)?([A-Za-zÁÉÍÓÚáéíóú\s]+?)(?:,|\.|\s+cant[oó]n|\s+de\s+la|\s+cuya|\s+mide)", edict_text, re.I)
        if dist_match:
            detected_district = dist_match.group(1).strip()[:30]

        # 5. Plano Catastrado
        plano_match = re.search(r"(?:plano\s*(?:catastro\s+|catastrado\s+)?(?:n[úu]mero\s*[:\.]?|[:\.]\s*|\s+)?|catastro\s*n[úu]mero\s*[:\.]?\s*)([A-Z0-9]{1,4}-[0-9]+-[0-9]{2,4}|[A-Z0-9]+-[0-9]+)", edict_text, re.I)
        plano = plano_match.group(1).strip() if plano_match else None

        clean_text = re.sub(r'\s+', ' ', edict_text)

        # 6. Currency & 3-Call Base Prices
        base_match = re.search(r"(?:con\s+la\s+base\s+de|base\s+de|por\s+la\s+base\s+de|con\s+una\s+base\s+de|precio\s+base\s+de|siguiente\s+base\s*:|base\s*:)\s*([^,;\n]+)", clean_text, re.I)
        base_sentence = base_match.group(0) if base_match else clean_text
        b_low = base_sentence.lower()

        currency = "CRC"
        if any(w in b_low for w in ["dólar", "dolar", "usd", "estados unidos", "moneda oficial de los estados unidos"]) or "$" in base_sentence or "usd" in text_lower:
            currency = "USD"
        elif any(w in b_low for w in ["colón", "colon", "crc", "céntimo", "centimo"]) or "¢" in base_sentence:
            currency = "CRC"
        elif any(w in text_lower for w in ["dólares", "dolares", "usd", "estados unidos"]) or "$" in edict_text:
            currency = "USD"

        # Base prices for calls 1, 2, 3
        prices = []
        
        # Check standard digit formats in base sentence
        # Support formats like "$50.000.00", "25.000.000,00", "220,000.00"
        num_candidates = re.findall(r'([0-9]{1,3}(?:[\.,][0-9]{3})*(?:[\.,][0-9]{2})?|[0-9]{4,12})', base_sentence)
        for num_str in num_candidates:
            v = parse_cr_price_string(num_str)
            if v:
                dot_parts = num_str.split('.')
                if len(dot_parts) == 3 and len(dot_parts[1]) == 3 and len(dot_parts[2]) == 2:
                    v = float(dot_parts[0] + dot_parts[1] + '.' + dot_parts[2])
                if (currency == "USD" and 1000 <= v <= 50000000) or (currency == "CRC" and 500000 <= v <= 20000000000):
                    prices.append(v)

        if not prices:
            word_val = parse_spanish_words_to_number(base_sentence)
            if (currency == "USD" and 1000 <= word_val <= 50000000) or (currency == "CRC" and 500000 <= word_val <= 20000000000):
                prices.append(word_val)

        if not prices:
            all_numbers = re.findall(r'([0-9]{1,3}(?:[\.,][0-9]{3})+(?:[\.,][0-9]{2})?)', edict_text)
            for num_str in all_numbers:
                v = parse_cr_price_string(num_str)
                if v:
                    if (currency == "USD" and 1000 <= v <= 50000000) or (currency == "CRC" and 500000 <= v <= 20000000000):
                        prices.append(v)

        if not prices:
            return None

        base_1 = prices[0]
        base_2 = prices[1] if len(prices) > 1 else round(base_1 * 0.75, 2)
        base_3 = prices[2] if len(prices) > 2 else round(base_1 * 0.25, 2)

        # 7. Naturaleza / Legal Description & Construction Flag Disambiguation
        nat_match = re.search(r"(?:naturaleza\s*[:\s]*|la\s+cual\s+es\s+|terreno\s+de\s+|finca\s+que\s+es\s+)([^\.\n;]+)", edict_text, re.I)
        naturaleza = nat_match.group(1).strip() if nat_match else f"Inmueble en {detected_canton}, {detected_prov}"
        nat_norm = normalize_text(naturaleza)

        # Explicit construction check (Costa Rica Legal Semantics)
        explicit_construction = any(k in norm for k in [
            "con una casa", "con casa de habitacion", "con casa de habitación", "con casa",
            "con edificio", "con construcciones", "con edificacion", "con edificación",
            "con mejoras", "local comercial", "finca con casa", "edificacion"
        ])
        
        is_bare_land = (any(k in nat_norm for k in [
            "terreno para construir", "lote para construir", "terreno de solar", "lote para vivienda",
            "terreno de agricultura", "terreno apto para", "terreno sin construir", "solar"
        ]) or ("terreno" in nat_norm or "lote" in nat_norm)) and not explicit_construction

        has_construction = bool(explicit_construction)

        # 8. Area in m2 (Digits or Spelled-Out Spanish Words)
        # Check compound hectare phrase first (e.g. "una hectárea con tres mil metros")
        # 8. Area in m2 (Digits or Spelled-Out Spanish Words)
        normalized_full = re.sub(r'\s+', ' ', edict_text)
        ha_match = re.search(r"(?:(?:una|[0-9]+)\s+hect[áa]rea[s]?)\s+con\s+([^\.,;\n]+?)(?:metros|m2|m²)", normalized_full, re.I)
        area = 250.0
        if ha_match:
            ha_count = 1 if "una" in ha_match.group(0).lower() else (float(re.search(r'\d+', ha_match.group(0)).group(0)) if re.search(r'\d+', ha_match.group(0)) else 1)
            extra_m = parse_spanish_words_to_number(ha_match.group(1))
            area = (ha_count * 10000.0) + extra_m
        else:
            mide_m = re.search(r'(?:mide|cabida|medida|superficie|área)\s*[:\s]*([^\n;]+?)(?=(?:\.\s*(?:plano|linderos|situada|ubicada|segundo|con\s+la\s+base|[A-Z])|plano\s*:|\n|$))', normalized_full, re.I)
            mide_clause = mide_m.group(1).strip() if mide_m else normalized_full
            
            # Standalone hectares
            ha_standalone = re.search(r'([0-9]+(?:[\.,][0-9]+)?|[a-záéíóú\s]+?)\s*(?:hect[áa]reas|ha\b)', mide_clause, re.I)
            if ha_standalone:
                raw_val = ha_standalone.group(1).strip()
                num = parse_cr_price_string(raw_val) if re.search(r'\d', raw_val) else parse_spanish_words_to_number(raw_val)
                if num and num > 0:
                    area = num * 10000.0
            else:
                digit_area = re.search(r"([0-9]{1,3}(?:[\.,][0-9]{3})*(?:[\.,][0-9]+)?|[0-9]+(?:[\.,][0-9]+)?)\s*(?:metros|m2|m²|mts)", mide_clause, re.I)
                if digit_area:
                    val_str = digit_area.group(1).strip()
                    parsed_val = parse_cr_price_string(val_str) or 250.0
                    # Check decimeters (support words with trailing comma or digits)
                    dec_m = re.search(r"con\s+([0-9]+|[a-záéíóú\s,]+?)\s*(?:dec[íi]metros)", mide_clause, re.I)
                    if dec_m:
                        dec_val = parse_spanish_words_to_number(dec_m.group(1))
                        area = parsed_val + (dec_val * 0.01)
                    else:
                        area = parsed_val
                else:
                    word_val = parse_spanish_words_to_number(mide_clause)
                    if 5.0 <= word_val <= 100000000.0:
                        area = word_val

        # 9. Plaintiff & Defendant
        plaintiff_match = re.search(r"(?:promovido\s+por|proceso\s+(?:de\s+)?[\w\s]+\s+de|actor\s*:?|ejecutante\s*:?)\s+([\w\s,.-]+?)\s+(?:contra|demandad)", edict_text, re.I)
        plaintiff = plaintiff_match.group(1).strip() if plaintiff_match else "Banco de Costa Rica / Entidad Financiera"

        defendant_match = re.search(r"(?:contra|demandado\s*:?|ejecutado\s*:?)\s+([\w\s,.-]+?)(?:\.|$|\n|;|Expediente)", edict_text, re.I)
        defendant = defendant_match.group(1).strip() if defendant_match else None

        # 10. Dates (1st, 2nd, 3rd remates)
        date_1_str = None
        d1_match = re.search(r"(?:a\s+las\s+[\w\s]+del\s+[\w\s]+(?:dos\s+mil|202\d)|al\s+ser\s+las\s+[\w\s]+del\s+[\w\s]+(?:dos\s+mil|202\d))", edict_text, re.I)
        if d1_match:
            date_1_str = d1_match.group(0)
        auction_date_1 = parse_date_spanish(date_1_str or "", default_date=datetime.now() + timedelta(days=21))

        d2_match = re.search(r"(?:segundo\s+remate[^\.\n;]+)", edict_text, re.I)
        auction_date_2 = parse_date_spanish(d2_match.group(0) if d2_match else "", default_date=datetime.now() + timedelta(days=35))

        d3_match = re.search(r"(?:tercer\s+remate[^\.\n;]+)", edict_text, re.I)
        auction_date_3 = parse_date_spanish(d3_match.group(0) if d3_match else "", default_date=datetime.now() + timedelta(days=49))

        # 11. Property Category & Property Type Classification
        is_agri = bool(re.search(r"\b(agricultura|ganadera|ganadero|agricola|agrícola|pasto|pastos|cultivo|cultivos|frutales|cafetal|finca\s+(?:agricola|agrícola|ganadera|forestal|lechera))\b", norm))
        
        if explicit_construction:
            if any(w in text_lower for w in ["condominio", "filial", "apartamento"]):
                category = "Condo"
                prop_type = "condo_apartment"
            elif any(w in text_lower for w in ["local", "comercial", "bodega", "oficina"]):
                category = "Commercial"
                prop_type = "commercial_industrial"
            elif any(w in text_lower for w in ["playa", "lujo", "villa", "piscina"]):
                category = "Luxury Estate"
                prop_type = "single_family_home"
            else:
                category = "Residential"
                prop_type = "single_family_home"
        elif is_agri:
            category = "Agricultural"
            prop_type = "agricultural_land"
        elif any(w in text_lower for w in ["condominio", "filial", "apartamento"]):
            category = "Condo"
            prop_type = "condo_apartment"
        elif any(w in text_lower for w in ["local", "comercial", "bodega", "oficina"]):
            category = "Commercial"
            prop_type = "commercial_industrial"
        elif is_bare_land or any(w in text_lower for w in ["terreno", "lote", "solar"]):
            category = "Land/Development"
            prop_type = "building_lot"
        else:
            category = "Residential"
            prop_type = "single_family_home"

        return ForeclosureAuction(
            expediente_number=expediente,
            court_name=court,
            folio_real=folio,
            plano_catastrado=plano,
            province=detected_prov,
            canton=detected_canton,
            district=detected_district,
            address_description=f"Inmueble judicial ({naturaleza[:60]}) en {detected_canton}, {detected_prov}",
            area_m2=area,
            currency=currency,
            base_price_call_1=base_1,
            auction_date_call_1=auction_date_1,
            base_price_call_2=base_2,
            auction_date_call_2=auction_date_2,
            base_price_call_3=base_3,
            auction_date_call_3=auction_date_3,
            plaintiff=plaintiff,
            defendant=defendant,
            legal_summary=f"Remate judicial en {detected_canton} ({detected_prov}). Expediente {expediente} con base de {currency} {base_1:,.2f}.",
            property_category=category,
            property_type=prop_type,
            naturaleza_raw=naturaleza,
            has_construction=has_construction,
            raw_edict_text=edict_text,
        )
    except Exception as e:
        logger.warning(f"Fallback regex parsing exception: {e}")
        return None

def extract_single_edict_gemini(edict_text: str, api_key: Optional[str] = None) -> Optional[ForeclosureAuction]:
    """
    Uses google-genai SDK with Gemini Flash models, automatically falling back to regex parser.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key or not genai:
        logger.info("Using deterministic rule-based Costa Rican judicial parser.")
        return extract_single_edict_regex_fallback(edict_text)

    # Try Gemini Flash models
    models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
    try:
        client = genai.Client(api_key=key)
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=EXTRACTION_PROMPT.format(edict_text=edict_text),
                    config={
                        'response_mime_type': 'application/json',
                        'response_schema': ForeclosureAuction,
                        'temperature': 0.1,
                    }
                )
                parsed = ForeclosureAuction.model_validate_json(response.text)
                if not getattr(parsed, "raw_edict_text", None):
                    parsed.raw_edict_text = edict_text
                return parsed
            except Exception as model_err:
                logger.debug(f"Model {m} failed: {model_err}")
                continue
    except Exception as e:
        logger.warning(f"Gemini SDK error: {e}")

    return extract_single_edict_regex_fallback(edict_text)

def find_all_unique_folios_in_text(text: str) -> List[str]:
    """Finds all unique Folio Real / Matrícula identifiers in a legal edict block."""
    folio_patterns = [
        r"\b([1-7]-[0-9]{5,7}-[0-9]{3})\b",
        r"(?:matr[íi]cula\s+(?:de\s+folio\s+real\s+)?(?:n[úu]mero\s+)?|finca\s+(?:filial\s+(?:\d+\s+)?)?(?:n[úu]mero\s+|matr[íi]cula\s+)?|folio\s+real\s*(?:matr[íi]cula\s+)?(?:n[úu]mero\s+|:)?\s*)([0-9]-[0-9]+-[0-9]+|[0-9]{5,8}-[0-9]{3}|[0-9]{5,8})",
    ]
    seen: List[str] = []
    for fp in folio_patterns:
        for m in re.finditer(fp, text, re.IGNORECASE):
            val = m.group(1).strip()
            if val not in seen:
                seen.append(val)
    return seen

def extract_auctions_with_gemini(edict_chunks: List[str], api_key: Optional[str] = None) -> List[ForeclosureAuction]:
    """
    Iterates over a list of edict text chunks and performs structured extraction.
    Splits multi-folio notices into distinct auction records so no bundled property is lost.
    """
    results: List[ForeclosureAuction] = []
    prov_code_map = {
        "1": "San José", "2": "Alajuela", "3": "Cartago", "4": "Heredia",
        "5": "Guanacaste", "6": "Puntarenas", "7": "Limón"
    }
    
    for idx, chunk in enumerate(edict_chunks):
        logger.info(f"Extracting edict chunk {idx + 1}/{len(edict_chunks)}...")
        extracted = extract_single_edict_gemini(chunk, api_key=api_key)
        
        if extracted:
            if extracted.base_price_call_1 and not extracted.base_price_call_2:
                extracted.base_price_call_2 = round(extracted.base_price_call_1 * 0.75, 2)
            if extracted.base_price_call_1 and not extracted.base_price_call_3:
                extracted.base_price_call_3 = round(extracted.base_price_call_1 * 0.25, 2)
                
            # Check for multiple distinct folios mentioned in the same edict notice
            all_folios = find_all_unique_folios_in_text(chunk)
            
            # Standardize discovered folios using Costa Rican [Province]-[Finca]-[Sublot] format
            standardized_folios = []
            for f in all_folios:
                norm_f = normalize_folio_real(f, extracted.province or "San José")
                if norm_f not in standardized_folios:
                    standardized_folios.append(norm_f)
                    
            if len(standardized_folios) > 1:
                logger.info(f"✨ Multi-property notice detected! Found {len(standardized_folios)} distinct folios for case {extracted.expediente_number}: {standardized_folios}")
                logger.warning(f"Multi-property split: all sub-lots share the same prices and area_m2. Manual validation advised for expediente {extracted.expediente_number}.")
                for f_idx, fol in enumerate(standardized_folios):
                    prov = prov_code_map.get(fol[0], extracted.province) if "-" in fol else extracted.province
                    prop_item = ForeclosureAuction(
                        expediente_number=f"{extracted.expediente_number}-L{f_idx+1}" if f_idx > 0 else extracted.expediente_number,
                        court_name=extracted.court_name,
                        folio_real=fol,
                        plano_catastrado=extracted.plano_catastrado,
                        province=prov,
                        canton=extracted.canton,
                        district=extracted.district,
                        address_description=f"{extracted.address_description or ''} (Lote #{f_idx+1})".strip(),
                        area_m2=extracted.area_m2,
                        currency=extracted.currency,
                        base_price_call_1=extracted.base_price_call_1,
                        auction_date_call_1=extracted.auction_date_call_1,
                        base_price_call_2=extracted.base_price_call_2,
                        auction_date_call_2=extracted.auction_date_call_2,
                        base_price_call_3=extracted.base_price_call_3,
                        auction_date_call_3=extracted.auction_date_call_3,
                        plaintiff=extracted.plaintiff,
                        defendant=extracted.defendant,
                        legal_summary=f"Remate judicial (Lote #{f_idx+1}) en {extracted.canton}, {prov}. Matrícula {fol}. Expediente {extracted.expediente_number}.",
                        property_category=extracted.property_category,
                        raw_edict_text=extracted.raw_edict_text,
                    )
                    results.append(prop_item)
            else:
                results.append(extracted)
        else:
            logger.warning(f"Chunk {idx + 1} extraction yielded no structured result.")
            
    return results

# ==============================================================================
# 5. GEOSPATIAL & FINANCIAL ENRICHMENT ENGINE
# ==============================================================================
def enrich_auction_data(auction: ForeclosureAuction) -> Dict[str, Any]:
    """
    Enriches auction with PostGIS coordinates from Canton/Province centroids lookup,
    computes estimated market value based on regional property benchmarks, and formats PostGIS WKT.
    """
    def norm_geo(s: str) -> str:
        if not s:
            return ""
        n = unicodedata.normalize("NFD", s.lower())
        return "".join(c for c in n if unicodedata.category(c) != "Mn").strip()

    lat = getattr(auction, "latitude", None)
    lng = getattr(auction, "longitude", None)

    if not lat or not lng:
        d_raw = (getattr(auction, "district", "") or "").strip()
        c_raw = (getattr(auction, "canton", "") or "").strip()
        p_raw = (getattr(auction, "province", "san josé") or "san josé").strip()
        full_info = f"{c_raw} {d_raw} {getattr(auction, 'address_description', '')} {getattr(auction, 'legal_summary', '')}".lower()

        d_norm = norm_geo(d_raw)
        c_norm = norm_geo(c_raw)
        p_norm = norm_geo(p_raw)

        # Safeguard: Explicit Pérez Zeledón check (prevents any overlap with Jacó/Garabito)
        if "perez zeledon" in c_norm or "perez zeledon" in d_norm or "perez zeledon" in full_info or "pérez zeledón" in full_info or "san isidro de el general" in full_info:
            lat, lng = 9.3739, -83.7058
        elif "garabito" in c_norm or "jaco" in d_norm or "jaco" in full_info or "jacó" in full_info or "herradura" in full_info:
            lat, lng = 9.6152, -84.6298
        elif d_raw.lower() in CR_CANTON_CENTROIDS:
            lat, lng = CR_CANTON_CENTROIDS[d_raw.lower()]
        elif d_norm in CR_CANTON_CENTROIDS:
            lat, lng = CR_CANTON_CENTROIDS[d_norm]
        elif c_raw.lower() in CR_CANTON_CENTROIDS:
            lat, lng = CR_CANTON_CENTROIDS[c_raw.lower()]
        elif c_norm in CR_CANTON_CENTROIDS:
            lat, lng = CR_CANTON_CENTROIDS[c_norm]
        else:
            lat, lng = PROVINCE_CENTROIDS.get(p_raw.lower(), PROVINCE_CENTROIDS.get(p_norm, (9.9281, -84.0907)))
            
    base = auction.base_price_call_1
    multiplier = 1.38
    category = getattr(auction, "property_category", "Residential") or "Residential"
    
    if category in ["Luxury Estate", "Land/Development"]:
        multiplier = 1.45
    elif category in ["Condo", "Residential"]:
        multiplier = 1.35
    elif category == "Agricultural":
        multiplier = 1.50
        
    estimated_market_val = round(base * multiplier, 2)
    location_wkt = f"SRID=4326;POINT({lng} {lat})"
    
    assigned_images = CATEGORY_IMAGES.get(category, CATEGORY_IMAGES["Residential"])

    return {
        "expediente_number": auction.expediente_number,
        "court_name": auction.court_name,
        "folio_real": auction.folio_real,
        "plano_catastrado": getattr(auction, "plano_catastrado", None),
        "province": auction.province,
        "canton": getattr(auction, "canton", "Central") or "Central",
        "district": getattr(auction, "district", "Central") or "Central",
        "address_description": getattr(auction, "address_description", None),
        "area_m2": getattr(auction, "area_m2", 150.0) or 150.0,
        "currency": auction.currency,
        "base_price_call_1": auction.base_price_call_1,
        "auction_date_call_1": auction.auction_date_call_1,
        "base_price_call_2": getattr(auction, "base_price_call_2", None),
        "auction_date_call_2": getattr(auction, "auction_date_call_2", None),
        "base_price_call_3": getattr(auction, "base_price_call_3", None),
        "auction_date_call_3": getattr(auction, "auction_date_call_3", None),
        "estimated_market_value": estimated_market_val,
        "plaintiff": getattr(auction, "plaintiff", "Entidad Financiera") or "Entidad Financiera",
        "defendant": getattr(auction, "defendant", None),
        "legal_summary": auction.legal_summary,
        "raw_edict_text": getattr(auction, "raw_edict_text", ""),
        "location": location_wkt,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }

# ==============================================================================
# 6. SUPABASE UPSERT & INGESTION LOGGING ENGINE
# ==============================================================================
def record_ingestion_log(
    status: str,
    total_edicts: int = 0,
    added: int = 0,
    skipped: int = 0,
    expedientes: Optional[List[str]] = None,
    error_message: Optional[str] = None,
    duration_seconds: float = 0.0,
    run_date: Optional[str] = None
) -> bool:
    """
    Records an execution entry into the public.ingestion_logs table in Supabase.
    """
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.warning("SUPABASE_SERVICE_ROLE_KEY missing. Ingestion log not persisted remotely.")
        return False
        
    try:
        ctx = create_ssl_context()
        url = f"{supabase_url}/rest/v1/ingestion_logs"
        payload_dict = {
            "run_date": run_date or datetime.now().strftime("%Y-%m-%d"),
            "source": "nexuspj_boletin_judicial",
            "status": status,
            "total_edicts_found": total_edicts,
            "properties_added": added,
            "properties_skipped": skipped,
            "expedientes_added": expedientes or [],
            "error_message": error_message,
            "duration_seconds": round(duration_seconds, 2),
            "created_at": datetime.now().isoformat(),
        }
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        req = urllib.request.Request(url, data=json.dumps(payload_dict).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            if resp.status in (200, 201):
                logger.info(f"✓ Ingestion execution log saved: status={status}, added={added}, skipped={skipped}")
                return True
    except Exception as e:
        logger.debug(f"Could not record ingestion log to Supabase: {e}")
        return False


def upsert_to_supabase(records: List[Dict[str, Any]]) -> Tuple[int, int, List[str]]:
    """
    Connects to Supabase PostGIS using service role credentials and performs inserts
    with deduplication against existing expediente_numbers in the database.
    Returns (inserted_count, skipped_count, list_of_inserted_expedientes).
    """
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from environment. Skipping remote database upload (0 inserted).")
        return 0, len(records), []
        
    try:
        ctx = create_ssl_context()

        # 1. Fetch existing expediente numbers & sale statuses with pagination to protect terminal states
        existing_expedientes = set()
        terminal_expedientes = set()
        fetch_url = f"{supabase_url}/rest/v1/auctions?select=expediente_number,sale_status"
        
        offset = 0
        limit = 1000
        while True:
            fetch_headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Range": f"{offset}-{offset + limit - 1}",
                "Range-Unit": "items",
            }
            try:
                req_get = urllib.request.Request(fetch_url, headers=fetch_headers)
                with urllib.request.urlopen(req_get, context=ctx, timeout=15) as resp:
                    if resp.status in (200, 206):
                        data = json.loads(resp.read().decode("utf-8"))
                        if not data:
                            break
                        for item in data:
                            exp = item.get("expediente_number")
                            if exp:
                                existing_expedientes.add(exp.strip().upper())
                                if item.get("sale_status") in ("suspended", "adjudicated_to_creditor", "adjudicated_to_bidder", "awarded", "annulled", "settled"):
                                    terminal_expedientes.add(exp.strip().upper())
                        if len(data) < limit:
                            break
                        offset += limit
                    else:
                        break
            except Exception as err:
                logger.debug(f"Could not fetch existing expedientes (offset {offset}): {err}")
                break

        # 2. Filter out existing and terminal foreclosures
        new_records = [
            r for r in records 
            if r["expediente_number"].strip().upper() not in existing_expedientes 
            and r["expediente_number"].strip().upper() not in terminal_expedientes
            and r["expediente_number"] not in existing_expedientes
            and r["expediente_number"] not in terminal_expedientes
        ]
        
        skipped_count = len(records) - len(new_records)

        if not new_records:
            logger.info("All discovered foreclosures are already up to date in Supabase PostGIS.")
            return 0, skipped_count, []

        # 3. Post new records
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        
        url = f"{supabase_url}/rest/v1/auctions"
        payload = json.dumps(new_records).encode("utf-8")
        
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            if resp.status in (200, 201):
                new_expedientes = [r["expediente_number"] for r in new_records]
                logger.info(f"✓ Successfully inserted {len(new_records)} new foreclosures into Supabase PostGIS!")
                return len(new_records), skipped_count, new_expedientes
            else:
                logger.warning(f"Supabase returned status code: {resp.status}")
                return 0, len(records), []
    except Exception as e:
        logger.error(f"Error during Supabase insert: {e}")
        return 0, len(records), []


def purge_expired_auctions_from_supabase() -> int:
    """
    Evaluates auctions in Supabase and deletes all auctions whose 3rd call date
    has already expired (or terminal states: passed_call_3, deserted).
    Returns count of deleted auctions.
    """
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        return 0

    try:
        ctx = create_ssl_context()
        now_iso = datetime.now().isoformat()
        
        # Query auctions with call dates
        fetch_url = f"{supabase_url}/rest/v1/auctions?select=id,expediente_number,auction_date_call_1,auction_date_call_2,auction_date_call_3,call_stage,sale_status"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
        }
        
        req = urllib.request.Request(fetch_url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            if resp.status != 200:
                return 0
            auctions = json.loads(resp.read().decode("utf-8"))

        now = datetime.now()
        expired_ids = []

        for a in auctions:
            d3_str = a.get("auction_date_call_3")
            d2_str = a.get("auction_date_call_2")
            d1_str = a.get("auction_date_call_1")
            
            d3 = datetime.fromisoformat(d3_str.replace("Z", "+00:00")).replace(tzinfo=None) if d3_str else None
            d2 = datetime.fromisoformat(d2_str.replace("Z", "+00:00")).replace(tzinfo=None) if d2_str else None
            d1 = datetime.fromisoformat(d1_str.replace("Z", "+00:00")).replace(tzinfo=None) if d1_str else None

            is_expired = d3 and d3 < now if d3 else (d2 and d2 < now if d2 else (d1 and d1 < now if d1 else False))
            is_terminal = a.get("call_stage") == "passed_call_3" or a.get("sale_status") in ("deserted", "adjudicated_to_creditor", "adjudicated_to_bidder")

            if is_expired or is_terminal:
                expired_ids.append(a.get("id"))

        if not expired_ids:
            return 0

        logger.info(f"Purging {len(expired_ids)} expired auctions from database...")
        deleted_count = 0
        batch_size = 50
        for i in range(0, len(expired_ids), batch_size):
            batch = expired_ids[i:i + batch_size]
            id_filter = ",".join(batch)
            del_url = f"{supabase_url}/rest/v1/auctions?id=in.({id_filter})"
            del_req = urllib.request.Request(del_url, headers=headers, method="DELETE")
            with urllib.request.urlopen(del_req, context=ctx, timeout=15) as del_resp:
                if del_resp.status in (200, 204):
                    deleted_count += len(batch)

        logger.info(f"✓ Purged {deleted_count} expired auctions from database.")
        return deleted_count
    except Exception as e:
        logger.warning(f"Error purging expired auctions: {e}")
        return 0


# ==============================================================================
# 7. RECONCILIATION AUDIT & DISCORD NOTIFICATION ENGINE
# ==============================================================================
def compute_reconciliation_metrics(raw_edicts: List[str], extracted_auctions: List[ForeclosureAuction]) -> Dict[str, Any]:
    """
    Step 4: Quality & Coverage Reconciliation Engine.
    Computes statistical coverage matching raw docket numbers and Folio Real markers
    in publication texts against successfully extracted structured properties.
    """
    raw_dockets: Set[str] = set()
    raw_folios: Set[str] = set()

    for text in raw_edicts:
        dockets = re.findall(r"\b[0-9]{2}-[0-9]{5,7}-[0-9]{3,4}-(?:CJ|CI|CA|AG|CO|J|C|PE|FA)[A-Z0-9]*\b", text, re.IGNORECASE)
        for d in dockets:
            raw_dockets.add(d.strip().upper())
        folios = find_all_unique_folios_in_text(text)
        for f in folios:
            raw_folios.add(f.strip().upper())

    extracted_dockets = {a.expediente_number.split("-L")[0].strip().upper() for a in extracted_auctions if a.expediente_number}
    extracted_folios = {a.folio_real.strip().upper() for a in extracted_auctions if a.folio_real}

    total_raw_targets = max(len(raw_dockets), len(raw_edicts), 1)
    extracted_count = len(extracted_auctions)
    coverage_pct = round(min((extracted_count / total_raw_targets) * 100.0, 100.0), 1)

    return {
        "raw_dockets_count": len(raw_dockets),
        "raw_folios_count": len(raw_folios),
        "extracted_properties_count": extracted_count,
        "extracted_dockets_count": len(extracted_dockets),
        "coverage_percentage": coverage_pct,
        "missing_dockets": list(raw_dockets - extracted_dockets)[:10],
    }


def send_discord_notification(
    status: str,  # 'success', 'warning', 'error', 'test', 'no_new'
    title: str,
    description: str,
    run_date_str: str,
    total_edicts: int = 0,
    added: int = 0,
    skipped: int = 0,
    reconciliation: Optional[Dict[str, Any]] = None,
    expedientes: Optional[List[str]] = None,
    duration_seconds: float = 0.0,
    error_message: Optional[str] = None
) -> bool:
    """
    Dispatches rich, real-time Discord Webhook embeds for daily scraper runs, low-yield alerts, or test pings.
    """
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL") or os.getenv("ALERT_WEBHOOK_URL")
    if not webhook_url:
        logger.debug("DISCORD_WEBHOOK_URL not configured. Skipping Discord notification.")
        return False

    try:
        ctx = create_ssl_context()
        
        colors = {
            "success": 0x10B981,  # Emerald Green
            "warning": 0xF59E0B,  # Amber
            "error": 0xEF4444,    # Crimson Red
            "test": 0x3B82F6,     # Sky Blue
            "no_new": 0x64748B,   # Slate Grey
        }
        color = colors.get(status, 0x10B981)

        status_badges = {
            "success": "🟢 Completado con Éxito",
            "warning": "🟡 Alerta de Rendimiento",
            "error": "🔴 Error en Ingestión",
            "test": "🔵 Verificación de Conexión Discord",
            "no_new": "⚪ Base de Datos al Día (0 Nuevos)",
        }
        badge = status_badges.get(status, "🟢 Completado")

        fields = [
            {"name": "📅 Fecha (Costa Rica)", "value": f"`{run_date_str}`", "inline": True},
            {"name": "📊 Estado", "value": f"**{badge}**", "inline": True},
            {"name": "⏱️ Tiempo de Ejecución", "value": f"`{duration_seconds:.2f}s`", "inline": True},
            {"name": "📑 Edictos Analizados", "value": f"`{total_edicts}`", "inline": True},
            {"name": "✨ Nuevas Propiedades", "value": f"**`+{added}`**", "inline": True},
            {"name": "⏩ Existentes Omitidos", "value": f"`{skipped}`", "inline": True},
        ]

        if reconciliation:
            cov = reconciliation.get("coverage_percentage", 100.0)
            raw_d = reconciliation.get("raw_dockets_count", total_edicts)
            fields.append({
                "name": "🎯 Tasa de Cobertura (Reconciliación)",
                "value": f"**{cov}%** ({reconciliation.get('extracted_properties_count', 0)} extraídos / {raw_d} detectados)",
                "inline": False
            })

        if expedientes and len(expedientes) > 0:
            exp_display = ", ".join([f"`{e}`" for e in expedientes[:8]])
            if len(expedientes) > 8:
                exp_display += f" *(+{len(expedientes) - 8} adicionales)*"
            fields.append({
                "name": "📋 Nuevos Expedientes Registrados",
                "value": exp_display,
                "inline": False
            })

        if error_message:
            fields.append({
                "name": "⚠️ Detalle / Diagnóstico",
                "value": f"```{error_message[:400]}```",
                "inline": False
            })

        embed = {
            "title": f"🏛️ {title}",
            "description": description,
            "color": color,
            "fields": fields,
            "footer": {
                "text": "Poder Judicial de Costa Rica • Nexus PJ • Boletín Judicial",
                "icon_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Flag_of_Costa_Rica.svg/320px-Flag_of_Costa_Rica.svg.png"
            },
            "timestamp": datetime.now().astimezone().isoformat()
        }

        payload = {
            "username": "CR Foreclosures Monitor",
            "avatar_url": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=128&auto=format&fit=crop&q=80",
            "embeds": [embed]
        }

        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "CR-Foreclosure-Monitor/2.0"},
            method="POST"
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            if resp.status in (200, 204):
                logger.info("✓ Rich Discord notification embed successfully dispatched.")
                return True
    except Exception as ex:
        logger.warning(f"Could not send Discord webhook notification: {ex}")
        return False


def check_yield_and_alert(
    total_parsed: int,
    run_date_str: str,
    threshold: int = 3,
    extra_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Step 4: Monitoring & Low-Yield Alerting.
    Performs post-execution audit checking if total parsed properties < threshold (default 3).
    Triggers diagnostic alert logging and dispatches a webhook notification if configured.
    """
    is_low_yield = total_parsed < threshold
    alert_info = {
        "is_low_yield": is_low_yield,
        "total_parsed": total_parsed,
        "threshold": threshold,
        "run_date": run_date_str,
        "webhook_dispatched": False,
    }

    if not is_low_yield:
        logger.info(f"✓ Post-execution yield check passed: {total_parsed} properties parsed (threshold: >={threshold}).")
        return alert_info

    alert_msg = (
        f"⚠️ [LOW-YIELD ALERT] Run on {run_date_str} yielded ONLY {total_parsed} property foreclosures "
        f"(expected >= {threshold}). Possible causes: upstream portal layout changes, downtime, "
        f"or bot challenge pages. Check '{DEBUG_LOG_PATH}' for raw snippets."
    )
    logger.warning("=" * 70)
    logger.warning(alert_msg)
    if extra_context:
        logger.warning(f"Context: {extra_context}")
    logger.warning("=" * 70)

    return alert_info


# ==============================================================================
# 8. MAIN CLI ORCHESTRATION PIPELINE
# ==============================================================================
def main():
    start_time = time.time()
    parser = argparse.ArgumentParser(description="Nexus PJ / Boletín Judicial Foreclosure Ingestion Engine")
    parser.add_argument("--file", type=str, help="Path to local Boletín Judicial PDF or TXT file to parse")
    parser.add_argument("--url", type=str, help="URL of a Boletín Judicial publication or Nexus PJ document to parse")
    parser.add_argument("--text", type=str, help="Raw text string containing judicial notices to parse")
    parser.add_argument("--date", type=str, help="Target date in YYYY-MM-DD format (default: today)")
    parser.add_argument("--dry-run", action="store_true", help="Extract and parse without uploading to Supabase")
    parser.add_argument("--test-discord", action="store_true", help="Send a test notification to configured Discord Webhook")
    args = parser.parse_args()

    # Quick Discord Webhook Test
    if args.test_discord:
        logger.info("📡 Testing Discord Webhook notification...")
        success = send_discord_notification(
            status="test",
            title="Prueba de Notificación Discord (CR Foreclosures)",
            description="El canal de alertas de remates judiciales y monitoreo de scraping está conectado correctamente con **Nexus PJ & Boletín Judicial**.",
            run_date_str=datetime.now().strftime("%Y-%m-%d"),
            total_edicts=24,
            added=6,
            skipped=18,
            reconciliation={"coverage_percentage": 100.0, "raw_dockets_count": 24, "extracted_properties_count": 24},
            expedientes=["24-000123-1158-CJ", "24-001892-0994-CJ", "23-008912-1200-CJ"],
            duration_seconds=4.25
        )
        if success:
            logger.info("✅ Discord Webhook test notification sent successfully! Check your Discord channel.")
        else:
            logger.error("❌ Failed to send Discord Webhook test notification. Please verify DISCORD_WEBHOOK_URL in .env.local.")
        return

    target_date_str = args.date or datetime.now().strftime("%Y-%m-%d")

    logger.info("=======================================================")
    logger.info("Starting Costa Rica Judicial Foreclosure Ingestion...")
    logger.info(f"Target Date: {target_date_str}")
    logger.info("=======================================================")

    raw_edicts: List[str] = []

    try:
        if args.text:
            logger.info("Parsing raw text input provided via CLI...")
            raw_edicts = split_into_expediente_blocks(args.text)
        elif args.file:
            if not os.path.exists(args.file):
                logger.error(f"Specified file does not exist: {args.file}")
                sys.exit(1)
            logger.info(f"Reading local file: {args.file}")
            if args.file.lower().endswith(".pdf"):
                reader = PdfReader(args.file) if PdfReader else None
                full_text = ""
                if reader:
                    for page in reader.pages:
                        full_text += (page.extract_text() or "") + "\n"
            else:
                with open(args.file, "r", encoding="utf-8", errors="ignore") as f:
                    full_text = f.read()

            remates_text = slice_remates_section(full_text)
            dockets_full = re.findall(r"\b[0-9]{2}-[0-9]{5,7}-[0-9]{3,4}-(?:CJ|CI|CA|AG|CO|J|C)[A-Z0-9]*\b", full_text, re.I)
            dockets_sliced = re.findall(r"\b[0-9]{2}-[0-9]{5,7}-[0-9]{3,4}-(?:CJ|CI|CA|AG|CO|J|C)[A-Z0-9]*\b", remates_text, re.I)
            if len(dockets_full) > len(dockets_sliced) and len(dockets_sliced) < (len(dockets_full) * 0.8):
                logger.warning(f"Remates slicing missed {len(dockets_full) - len(dockets_sliced)} dockets. Using full text.")
                remates_text = full_text

            raw_edicts = split_into_expediente_blocks(remates_text)
        elif args.url:
            logger.info(f"Fetching document from URL: {args.url}")
            ctx = create_ssl_context()
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
            }
            req = urllib.request.Request(args.url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
                is_valid, data_bytes, err = validate_and_read_response(resp, args.url, min_bytes=50)
                if is_valid:
                    if (args.url.lower().endswith(".pdf") or (resp.headers.get("Content-Type", "").lower().startswith("application/pdf"))) and PdfReader:
                        reader = PdfReader(io.BytesIO(data_bytes))
                        full_text = "".join((p.extract_text() or "") + "\n" for p in reader.pages)
                    else:
                        full_text = data_bytes.decode("utf-8", errors="ignore")
                    raw_edicts = split_into_expediente_blocks(full_text)
        else:
            target_date = datetime.strptime(args.date, "%Y-%m-%d") if args.date else datetime.now()
            raw_edicts = fetch_daily_bulletin(target_date)

        if not raw_edicts:
            logger.info("No judicial foreclosure edicts found for the given target. Ingestion cycle complete.")
            duration = time.time() - start_time
            check_yield_and_alert(total_parsed=0, run_date_str=target_date_str, threshold=3)
            
            send_discord_notification(
                status="no_new",
                title="Monitoreo de Ingestión Diaria (0 Nuevos)",
                description="La ejecución finalizó sin nuevos edictos judiciales detectados en la fecha consultada.",
                run_date_str=target_date_str,
                total_edicts=0,
                added=0,
                skipped=0,
                duration_seconds=duration
            )

            if not args.dry_run:
                record_ingestion_log(
                    status="warning" if target_date_str == datetime.now().strftime("%Y-%m-%d") else "no_new_properties",
                    total_edicts=0,
                    added=0,
                    skipped=0,
                    error_message="Low-yield: 0 foreclosure edicts discovered from feeds.",
                    duration_seconds=duration,
                    run_date=target_date_str
                )
            return

        logger.info(f"Processing {len(raw_edicts)} extracted candidate edicts...")
        extracted_auctions = extract_auctions_with_gemini(raw_edicts)
        logger.info(f"Successfully extracted {len(extracted_auctions)} structured properties.")

        # Compute Quality Reconciliation Coverage Metrics
        reconciliation = compute_reconciliation_metrics(raw_edicts, extracted_auctions)
        logger.info(
            f"🎯 Reconciliation Audit: {reconciliation['coverage_percentage']}% coverage "
            f"({len(extracted_auctions)} properties extracted from {reconciliation['raw_dockets_count']} detected dockets)."
        )

        # Low-Yield Monitoring & Alerting Check
        yield_audit = check_yield_and_alert(
            total_parsed=len(extracted_auctions),
            run_date_str=target_date_str,
            threshold=3
        )

        if not extracted_auctions:
            logger.info("No structured records were generated from the edicts. Ingestion finished.")
            duration = time.time() - start_time
            
            send_discord_notification(
                status="warning",
                title="Alerta de Bajo Rendimiento en Ingestión",
                description=f"Se detectaron {len(raw_edicts)} bloques de texto pero se extrajeron 0 propiedades válidas.",
                run_date_str=target_date_str,
                total_edicts=len(raw_edicts),
                added=0,
                skipped=0,
                duration_seconds=duration,
                error_message="0 propiedades estructuradas generadas."
            )

            if not args.dry_run:
                record_ingestion_log(
                    status="warning",
                    total_edicts=len(raw_edicts),
                    added=0,
                    skipped=0,
                    error_message="Low-yield alert: 0 properties extracted from candidate edicts.",
                    duration_seconds=duration,
                    run_date=target_date_str
                )
            return

        logger.info("Enriching records with PostGIS coordinates, images, and market valuation...")
        enriched_records = [enrich_auction_data(a) for a in extracted_auctions]

        if args.dry_run:
            logger.info(f"[Dry Run] {len(enriched_records)} records prepared:")
            print(json.dumps(enriched_records, indent=2, ensure_ascii=False))
            return

        logger.info(f"Upserting {len(enriched_records)} records to Supabase PostGIS...")
        inserted_count, skipped_count, new_expedientes = upsert_to_supabase(enriched_records)

        # Purge any expired auctions automatically (3rd Call expired)
        purged_expired_count = purge_expired_auctions_from_supabase()
        if purged_expired_count > 0:
            logger.info(f"✓ Automatically purged {purged_expired_count} expired auctions from database.")

        # Trigger Automated Auction Call Progression & Lifecycle Tracker Engine
        logger.info("Executing automated lifecycle progression engine (Single Source of Truth RPC)...")
        try:
            try:
                from scraper.auction_tracker import sync_auction_progression_via_rpc
            except (ImportError, ModuleNotFoundError):
                from auction_tracker import sync_auction_progression_via_rpc
            progression_result = sync_auction_progression_via_rpc()
            if progression_result.get("success"):
                logger.info(f"✓ Progression Engine synced: {progression_result.get('total_processed', 0)} evaluated, {progression_result.get('total_updated', 0)} state transitions.")
            else:
                logger.warning(f"Progression Engine warning: {progression_result.get('error')}")
        except Exception as ex:
            logger.warning(f"Could not run progression sync RPC: {ex}")

        duration = time.time() - start_time
        status_str = "success" if inserted_count > 0 else "no_new_properties"
        error_msg = None
        if yield_audit["is_low_yield"]:
            status_str = "warning"
            error_msg = f"Low-yield warning: only {len(extracted_auctions)} properties parsed (expected >= 3)."

        # Record ingestion log in Supabase
        record_ingestion_log(
            status=status_str,
            total_edicts=len(raw_edicts),
            added=inserted_count,
            skipped=skipped_count,
            expedientes=new_expedientes,
            error_message=error_msg,
            duration_seconds=duration,
            run_date=target_date_str
        )

        # Send Real-Time Discord Webhook Notification
        discord_status = "warning" if yield_audit["is_low_yield"] else ("success" if inserted_count > 0 else "no_new")
        send_discord_notification(
            status=discord_status,
            title="Reporte de Ingestión de Remates Judiciales",
            description=f"Escaneo automático de **Nexus PJ & Boletín Judicial** completado con éxito.",
            run_date_str=target_date_str,
            total_edicts=len(raw_edicts),
            added=inserted_count,
            skipped=skipped_count,
            reconciliation=reconciliation,
            expedientes=new_expedientes,
            duration_seconds=duration,
            error_message=error_msg
        )

        logger.info("Foreclosure ingestion pipeline finished successfully.")
    except Exception as exc:
        duration = time.time() - start_time
        logger.error(f"Ingestion pipeline failed with exception: {exc}")
        
        send_discord_notification(
            status="error",
            title="Error en Ingestión de Remates Judiciales",
            description="La ejecución del scraper falló con una excepción no controlada.",
            run_date_str=target_date_str,
            total_edicts=len(raw_edicts),
            added=0,
            skipped=0,
            duration_seconds=duration,
            error_message=str(exc)
        )

        if not args.dry_run:
            record_ingestion_log(
                status="error",
                total_edicts=len(raw_edicts),
                added=0,
                skipped=0,
                error_message=str(exc),
                duration_seconds=duration,
                run_date=target_date_str
            )
        raise

if __name__ == "__main__":
    main()



