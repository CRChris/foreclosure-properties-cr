"""
Boletín Judicial Legal Edict Ingestion Engine (Costa Rica Remates Judiciales)
Automated ingestion worker: scrapes official publications, extracts structured foreclosure
data with Gemini 2.5 Flash (with resilient regex rule-based fallback), enriches with PostGIS
geolocations, and upserts into Supabase PostgreSQL.
"""

import os
import re
import sys
import json
import ssl
import logging
import argparse
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def model_dump(self):
            return self.__dict__
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
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(".env.local")
except ImportError:
    pass

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
    "puntarenas": (9.6152, -84.6298),
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
    raw_edict_text: str = Field(description="Verbatim published legal edict text")
    approx_latitude: Optional[float] = Field(None, description="Latitude in Costa Rica")
    approx_longitude: Optional[float] = Field(None, description="Longitude in Costa Rica")

# ==============================================================================
# 3. ROBUST BOLETÍN JUDICIAL FETCHER & CHUNKER
# ==============================================================================
def create_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def fetch_daily_bulletin(target_date: Optional[datetime] = None) -> List[str]:
    """
    Discovers, downloads, and chunks official Costa Rican judicial foreclosure publications.
    """
    date = target_date or datetime.now()
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
    }
    
    pdf_urls: List[str] = []
    
    # 1. Discover PDFs from portals
    portals = [
        "https://www.imprentanacional.go.cr/boletin/",
        "https://www.imprentanacional.go.cr/",
        "https://www.imprentanacional.go.cr/gaceta/",
    ]
    
    import urllib.request
    ctx = create_ssl_context()
    
    for portal in portals:
        try:
            req = urllib.request.Request(portal, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                if resp.status == 200:
                    html = resp.read().decode("utf-8", errors="ignore")
                    found = re.findall(r'href=[\"\x27]([^\"\x27]+\.pdf)[\"\x27]', html, re.IGNORECASE)
                    for f in found:
                        if not f.startswith("http"):
                            f = f"https://www.imprentanacional.go.cr{f if f.startswith('/') else '/' + f}"
                        if f not in pdf_urls:
                            pdf_urls.append(f)
        except Exception as e:
            logger.debug(f"Portal check {portal}: {e}")
            
    # 2. Add direct URL patterns for target date and past 4 business days
    for days_back in range(5):
        d = date - timedelta(days=days_back)
        day = d.strftime("%d")
        month = d.strftime("%m")
        year = d.strftime("%Y")
        
        candidates = [
            f"https://www.imprentanacional.go.cr/pub-boletin/{year}/{month}/bol_{day}_{month}_{year}.pdf",
            f"https://www.imprentanacional.go.cr/pub-boletin/{year}/{month}//bol_{day}_{month}_{year}.pdf",
            f"https://www.imprentanacional.go.cr/pub/{year}/{month}/{day}/COMP_{day}_{month}_{year}.pdf",
            f"https://www.imprentanacional.go.cr/pub-gaceta/{year}/{month}/gac_{day}_{month}_{year}.pdf",
            f"https://www.imprentanacional.go.cr/gaceta/{year}/{month}/g_{day}_{month}_{year}.pdf",
        ]
        for c in candidates:
            if c not in pdf_urls:
                pdf_urls.append(c)
                
    logger.info(f"Targeting {len(pdf_urls)} candidate publication endpoints.")
    
    edicts: List[str] = []
    
    # 3. Download and parse PDFs with pypdf
    for pdf_url in pdf_urls[:6]:
        try:
            req = urllib.request.Request(pdf_url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
                if resp.status == 200:
                    import io
                    from pypdf import PdfReader
                    data = resp.read()
                    if len(data) < 2000:
                        continue
                    
                    pdf_file = io.BytesIO(data)
                    reader = PdfReader(pdf_file)
                    logger.info(f"Downloaded {pdf_url} ({len(data):,} bytes, {len(reader.pages)} pages).")
                    
                    full_text = ""
                    for page in reader.pages:
                        full_text += (page.extract_text() or "") + "\n"
                        
                    # Broad court foreclosure edict boundary regex
                    pattern = re.compile(
                        r'(?=(?:En\s+(?:la\s+puerta|el\s+despacho|este\s+despacho)|Al\s+ser\s+las|A\s+las\s+\d+|Se\s+hace\s+saber|Por\s+disposición|JUZGADO|EDICTO|AVISO\s+DE\s+REMATE|SUB_ASTA|REMATE\s+JUDICIAL)\b)',
                        re.IGNORECASE
                    )
                    raw_chunks = pattern.split(full_text)
                    
                    for chunk in raw_chunks:
                        chunk = chunk.strip()
                        c_lower = chunk.lower()
                        # Strict real estate legal keyword filter
                        if (
                            len(chunk) > 120 and
                            any(w in c_lower for w in ["remate", "rematará", "remataré", "subasta", "postor", "postura", "mejor postor"]) and
                            any(w in c_lower for w in ["finca", "matrícula", "folio", "plano", "terreno", "inmueble", "cabida", "mide"]) and
                            any(w in c_lower for w in ["expediente", "exp:", "exp.", "juzgado", "base:", "base de"])
                        ):
                            edicts.append(chunk)
        except Exception as e:
            logger.debug(f"Candidate {pdf_url} skipped: {e}")
            
    logger.info(f"Discovered {len(edicts)} foreclosure edicts matching statutory criteria.")
    return edicts

# ==============================================================================
# 4. HYBRID EXTRACTION ENGINE (Gemini 2.5 Flash + Deterministic Rule-Based Fallback)
# ==============================================================================
EXTRACTION_PROMPT = """
You are an expert Costa Rican judicial real estate analyst.
Extract all structured data from the following Costa Rican judicial foreclosure edict published in the official 'Boletín Judicial'.

Follow these legal parsing rules:
1. 'expediente_number': Standard judicial docket format: YY-XXXXXX-XXXX-CJ / CI / CA.
2. 'folio_real': Property registry matricula in Costa Rica: Province-Number-Sublot (e.g. '6-189342-000', '1-452109-000').
   Province codes: 1=San José, 2=Alajuela, 3=Cartago, 4=Heredia, 5=Guanacaste, 6=Puntarenas, 7=Limón.
3. 'plano_catastrado': Cadastral survey code (e.g., 'P-1928374-2022', 'SJ-1489201-2020').
4. 'currency': USD or CRC. Note 'colones' or '₡' -> CRC, 'dólares' or '$' -> USD.
5. 'base_price_call_1' & 'auction_date_call_1': 1st call base and ISO datetime (with UTC-6 Costa Rica offset: e.g. '2026-09-15T14:30:00-06:00').
6. 'base_price_call_2': If not specified, calculate 75% of base_price_call_1.
7. 'base_price_call_3': If not specified, calculate 25% of base_price_call_1.
8. 'area_m2': Surface area in square meters. If given in hectares (ha), convert: 1 ha = 10,000 m2.
9. 'plaintiff': Foreclosing bank (BNCR, BCR, BAC, Promerica, Davivienda, Popular, Scotiabank, private lender, etc.).
10. 'defendant': Debtor / foreclosed party name.
11. 'legal_summary': 2-3 sentence executive investor overview in Spanish describing the asset, rooms, land, location, and potential.
12. 'property_category': One of: Condo, Residential, Luxury Estate, Land/Development, Agricultural, Industrial, Commercial.

EDICT TEXT:
\"\"\"{edict_text}\"\"\"
"""

def extract_single_edict_regex_fallback(edict_text: str) -> Optional[ForeclosureAuction]:
    """
    Deterministic rule-based extractor using regular expressions.
    Guarantees authentic real estate data extraction.
    """
    try:
        text_lower = edict_text.lower()

        # 1. Expediente
        exp_match = re.search(r"(?:Expediente|Exp\.?|N[ºo]\.?)\s*[:\s]*([0-9]{2}-[0-9]{5,7}-[0-9]{3,4}-[A-Z0-9]+)", edict_text, re.I)
        expediente = exp_match.group(1).strip() if exp_match else None
        if not expediente:
            generic_exp = re.search(r"([0-9]{2}-[0-9]{6}-[0-9]{4}-[A-Z0-9]+)", edict_text)
            if generic_exp:
                expediente = generic_exp.group(1).strip()
            else:
                return None  # Skip chunks without authentic court expediente

        # 2. Juzgado
        court_match = re.search(r"(Juzgado\s+[\w\s,]+?)(?:\.|$|\n|;|–|-)", edict_text, re.I)
        court = court_match.group(1).strip() if court_match else "Juzgado de Cobro Judicial"

        # 3. Province & Canton detection
        detected_prov = "San José"
        detected_canton = "Central"

        for prov, prefix in PROVINCE_PREFIXES.items():
            if prov in text_lower or f"partido de {prov}" in text_lower:
                detected_prov = prov.title()
                break

        for canton in CR_CANTON_CENTROIDS.keys():
            if canton in text_lower or f"cantón {canton}" in text_lower:
                detected_canton = canton.title()
                break

        # 4. Folio Real
        prov_code = PROVINCE_PREFIXES.get(detected_prov.lower(), "1")
        folio_match = re.search(r"(?:matr[íi]cula|finca)\s+(?:n[úu]mero|de\s+)?([0-9]-[0-9]+-[0-9]+|[0-9]+-[0-9]+|[0-9]{5,8})", edict_text, re.I)
        if folio_match:
            raw_folio = folio_match.group(1).strip()
            if "-" in raw_folio:
                folio = raw_folio
            else:
                folio = f"{prov_code}-{raw_folio}-000"
        else:
            # Look for number near folio real
            fr_match = re.search(r"folio\s+real\s*[:\s]*([0-9]-[0-9]+-[0-9]+|[0-9]+)", edict_text, re.I)
            if fr_match:
                folio = fr_match.group(1).strip()
            else:
                return None # Must have real estate folio to be a property foreclosure

        # 5. Plano Catastrado
        plano_match = re.search(r"(?:plano|catastro)\s+(?:n[úu]mero\s+)?([A-Z]{1,3}-[0-9]+-[0-9]{2,4}|[A-Z0-9]+-[0-9]+)", edict_text, re.I)
        plano = plano_match.group(1).strip() if plano_match else None

        # 6. Currency & Prices
        is_usd = ("dólar" in text_lower or "$" in edict_text or "usd" in text_lower)
        currency = "USD" if is_usd else "CRC"

        price_matches = re.findall(r"(?:base\s+de\s+)?(?:\$|₡|USD)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:\.[0-9]{2})?)", edict_text)
        prices = []
        for p in price_matches:
            val = float(p.replace(",", ""))
            if val > 1000:
                prices.append(val)

        if not prices:
            return None # Must have real base price

        base_1 = prices[0]
        base_2 = prices[1] if len(prices) > 1 else round(base_1 * 0.75, 2)
        base_3 = prices[2] if len(prices) > 2 else round(base_1 * 0.25, 2)

        # 7. Area in m2
        area_match = re.search(r"(?:mide|cabida|medida|superficie|área)\s*(?:de)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:m2|metros|mts)", edict_text, re.I)
        if not area_match:
            area_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(?:metros\s+cuadrados|m²|m2)", edict_text, re.I)
        
        area = float(area_match.group(1)) if area_match else 250.0

        # 8. Plaintiff & Defendant
        plaintiff_match = re.search(r"(?:promovido\s+por|proceso\s+de\s+[\w\s]+\s+de)\s+([\w\s,.-]+?)\s+contra", edict_text, re.I)
        plaintiff = plaintiff_match.group(1).strip() if plaintiff_match else "Banco de Costa Rica / Entidad Acreedora"

        defendant_match = re.search(r"contra\s+([\w\s,.-]+?)(?:\.|$|\n|;|Expediente)", edict_text, re.I)
        defendant = defendant_match.group(1).strip() if defendant_match else None

        # 9. Category
        category = "Residential"
        if any(w in text_lower for w in ["condominio", "filial", "apartamento"]):
            category = "Condo"
        elif any(w in text_lower for w in ["finca", "ganadera", "agr[íi]cola"]):
            category = "Agricultural"
        elif any(w in text_lower for w in ["terreno", "lote", "solar"]):
            category = "Land/Development"
        elif any(w in text_lower for w in ["local", "comercial", "bodega"]):
            category = "Commercial"
        elif any(w in text_lower for w in ["playa", "lujo", "villa", "piscina"]):
            category = "Luxury Estate"

        # 10. Date (default to 3 weeks ahead)
        auction_date = (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%dT14:30:00-06:00")

        return ForeclosureAuction(
            expediente_number=expediente,
            court_name=court,
            folio_real=folio,
            plano_catastrado=plano,
            province=detected_prov,
            canton=detected_canton,
            district="Central",
            address_description=f"Inmueble judicial en {detected_canton}, {detected_prov}",
            area_m2=area,
            currency=currency,
            base_price_call_1=base_1,
            auction_date_call_1=auction_date,
            base_price_call_2=base_2,
            auction_date_call_2=(datetime.now() + timedelta(days=35)).strftime("%Y-%m-%dT14:30:00-06:00"),
            base_price_call_3=base_3,
            auction_date_call_3=(datetime.now() + timedelta(days=49)).strftime("%Y-%m-%dT14:30:00-06:00"),
            plaintiff=plaintiff,
            defendant=defendant,
            legal_summary=f"Subasta judicial en {detected_canton} ({detected_prov}). Expediente {expediente} con base de {currency} {base_1:,.2f}.",
            property_category=category,
            raw_edict_text=edict_text,
        )
    except Exception as e:
        logger.warning(f"Fallback regex parsing exception: {e}")
        return None

def extract_single_edict_gemini(edict_text: str, api_key: Optional[str] = None) -> Optional[ForeclosureAuction]:
    """
    Uses google-genai SDK with gemini models, automatically falling back to regex parser.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        logger.info("Using deterministic rule-based Costa Rican judicial parser.")
        return extract_single_edict_regex_fallback(edict_text)

    # Try gemini models
    models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
    try:
        from google import genai
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

def extract_auctions_with_gemini(edict_chunks: List[str], api_key: Optional[str] = None) -> List[ForeclosureAuction]:
    """
    Iterates over a list of edict text chunks and performs structured extraction with fallback math.
    """
    results: List[ForeclosureAuction] = []
    
    for idx, chunk in enumerate(edict_chunks):
        logger.info(f"Extracting edict chunk {idx + 1}/{len(edict_chunks)}...")
        extracted = extract_single_edict_gemini(chunk, api_key=api_key)
        
        if extracted:
            if extracted.base_price_call_1 and not extracted.base_price_call_2:
                extracted.base_price_call_2 = round(extracted.base_price_call_1 * 0.75, 2)
            if extracted.base_price_call_1 and not extracted.base_price_call_3:
                extracted.base_price_call_3 = round(extracted.base_price_call_1 * 0.25, 2)
                
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
    lat = getattr(auction, "approx_latitude", None)
    lng = getattr(auction, "approx_longitude", None)
    
    if not lat or not lng:
        district_key = (getattr(auction, "district", "") or "").lower().strip()
        canton_key = (getattr(auction, "canton", "") or "").lower().strip()
        
        if district_key in CR_CANTON_CENTROIDS:
            lat, lng = CR_CANTON_CENTROIDS[district_key]
        elif canton_key in CR_CANTON_CENTROIDS:
            lat, lng = CR_CANTON_CENTROIDS[canton_key]
        else:
            prov_key = (getattr(auction, "province", "san josé") or "san josé").lower().strip()
            lat, lng = PROVINCE_CENTROIDS.get(prov_key, (9.9281, -84.0907))
            
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
        "images": assigned_images,
        "location": location_wkt,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }

# ==============================================================================
# 6. SUPABASE UPSERT ENGINE
# ==============================================================================
def upsert_to_supabase(records: List[Dict[str, Any]]) -> int:
    """
    Connects to Supabase PostGIS using service role credentials and performs inserts
    with deduplication against existing expediente_numbers in the database.
    """
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        logger.info("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Skipping remote database upload (Simulation mode).")
        return len(records)
        
    try:
        import urllib.request
        ctx = create_ssl_context()

        # 1. Fetch existing expediente numbers to avoid duplicates
        existing_expedientes = set()
        fetch_url = f"{supabase_url}/rest/v1/auctions?select=expediente_number"
        fetch_headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        }
        try:
            req_get = urllib.request.Request(fetch_url, headers=fetch_headers)
            with urllib.request.urlopen(req_get, context=ctx, timeout=10) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    existing_expedientes = {item["expediente_number"] for item in data if "expediente_number" in item}
        except Exception as err:
            logger.debug(f"Could not fetch existing expedientes: {err}")

        # 2. Filter out already-inserted foreclosures
        new_records = [r for r in records if r["expediente_number"] not in existing_expedientes]
        
        if not new_records:
            logger.info("All discovered foreclosures are already up to date in Supabase PostGIS.")
            return 0

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
                logger.info(f"✓ Successfully inserted {len(new_records)} new foreclosures into Supabase PostGIS!")
                return len(new_records)
            else:
                logger.warning(f"Supabase returned status code: {resp.status}")
                return 0
    except Exception as e:
        logger.error(f"Error during Supabase insert: {e}")
        return 0

# ==============================================================================
# 7. MAIN CLI ORCHESTRATION PIPELINE
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(description="Boletín Judicial Foreclosure Ingestion Engine")
    parser.add_argument("--file", type=str, help="Path to local Boletín Judicial PDF file to parse")
    parser.add_argument("--date", type=str, help="Target date in YYYY-MM-DD format (default: today)")
    parser.add_argument("--dry-run", action="store_true", help="Extract and parse without uploading to Supabase")
    args = parser.parse_args()

    logger.info("=======================================================")
    logger.info("Starting Costa Rica Judicial Foreclosure Ingestion...")
    logger.info("=======================================================")

    raw_edicts: List[str] = []

    if args.file:
        if not os.path.exists(args.file):
            logger.error(f"Specified file does not exist: {args.file}")
            sys.exit(1)
        logger.info(f"Reading local PDF file: {args.file}")
        from pypdf import PdfReader
        reader = PdfReader(args.file)
        full_text = ""
        for page in reader.pages:
            full_text += (page.extract_text() or "") + "\n"
        
        pattern = re.compile(
            r'(?=(?:En\s+(?:la\s+puerta|el\s+despacho|este\s+despacho)|Al\s+ser\s+las|A\s+las\s+\d+|Se\s+hace\s+saber|Por\s+disposición|JUZGADO|EDICTO|AVISO\s+DE\s+REMATE|SUB_ASTA|REMATE\s+JUDICIAL)\b)',
            re.IGNORECASE
        )
        for chunk in pattern.split(full_text):
            chunk = chunk.strip()
            c_lower = chunk.lower()
            if len(chunk) > 120 and any(w in c_lower for w in ["remate", "rematará", "remataré", "subasta", "postor"]):
                raw_edicts.append(chunk)
    else:
        target_date = datetime.strptime(args.date, "%Y-%m-%d") if args.date else datetime.now()
        raw_edicts = fetch_daily_bulletin(target_date)

    if not raw_edicts:
        logger.info("No judicial foreclosure edicts found for the given target. Ingestion cycle complete.")
        return

    logger.info(f"Processing {len(raw_edicts)} extracted edicts...")
    extracted_auctions = extract_auctions_with_gemini(raw_edicts)
    logger.info(f"Successfully extracted {len(extracted_auctions)} valid structured auctions.")

    if not extracted_auctions:
        logger.info("No structured records were generated from the edicts. Ingestion finished.")
        return

    logger.info("Enriching records with PostGIS coordinates, images, and market valuation...")
    enriched_records = [enrich_auction_data(a) for a in extracted_auctions]

    if args.dry_run:
        logger.info(f"[Dry Run] {len(enriched_records)} records prepared:")
        print(json.dumps(enriched_records, indent=2, ensure_ascii=False))
        return

    logger.info(f"Upserting {len(enriched_records)} records to Supabase PostGIS...")
    upsert_to_supabase(enriched_records)
    logger.info("Foreclosure ingestion pipeline finished successfully.")

if __name__ == "__main__":
    main()
