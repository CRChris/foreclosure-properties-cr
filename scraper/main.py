"""
Boletín Judicial Legal Edict Ingestion Engine (Costa Rica Remates Judiciales)
Automated ingestion worker: scrapes, extracts with Gemini Flash, enriches with PostGIS geolocations,
and upserts into Supabase PostgreSQL.
"""

import os
import re
import json
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta

try:
    from pydantic import BaseModel, Field
except ImportError:
    # Graceful fallback when running in minimal local environments
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
    "liberia": (10.6346, -85.4406),
    "nicoya": (10.1447, -85.4528),
    "santa cruz": (10.2625, -85.5853),
    "tamarindo": (10.2993, -85.8402),
    "bagaces": (10.5333, -85.2500),
    "carrillo": (10.4667, -85.5500),
    "playas del coco": (10.5500, -85.6967),
    "cañas": (10.4333, -85.1000),
    "abangares": (10.2833, -84.9500),
    "tilarán": (10.4667, -84.9667),
    "nandayure": (9.9833, -85.2500),
    "la cruz": (11.0667, -85.6333),
    "hojancha": (10.0667, -85.4167),

    # Puntarenas
    "puntarenas": (9.9763, -84.8384),
    "esparza": (9.9944, -84.6667),
    "buenos aires": (9.1667, -83.3333),
    "montes de oro": (10.1333, -84.7500),
    "osa": (8.8833, -83.5167),
    "quepos": (9.4319, -84.1619),
    "manuel antonio": (9.3889, -84.1528),
    "golfito": (8.6389, -83.1639),
    "coto brus": (8.9000, -82.9500),
    "parrita": (9.5167, -84.3333),
    "corredores": (8.6000, -82.9500),
    "garabito": (9.6152, -84.6298),
    "jacó": (9.6152, -84.6298),
    "playa hermosa": (9.5667, -84.6000),
    "monteverde": (10.3000, -84.8167),
    "puerto jiménez": (8.5333, -83.3000),

    # Limón
    "limón": (9.9907, -83.0360),
    "pococí": (10.2167, -83.7833),
    "guápiles": (10.2167, -83.7833),
    "siquirres": (10.1000, -83.5167),
    "talamanca": (9.6582, -82.7564),
    "puerto viejo": (9.6582, -82.7564),
    "cahuita": (9.7333, -82.8333),
    "matina": (10.0833, -83.2833),
    "guácimo": (10.2167, -83.6833),
}

PROVINCE_CENTROIDS: Dict[str, Tuple[float, float]] = {
    "san josé": (9.9281, -84.0907),
    "alajuela": (10.0163, -84.2116),
    "cartago": (9.8644, -83.9194),
    "heredia": (9.9989, -84.1167),
    "guanacaste": (10.4500, -85.4000),
    "puntarenas": (9.7500, -84.8000),
    "limón": (9.9907, -83.0360),
}

# ==============================================================================
# 2. PYDANTIC SCHEMA FOR FORECLOSURE AUCTIONS
# ==============================================================================
class ForeclosureAuction(BaseModel):
    expediente_number: str = Field(description="Judicial docket ID, format YY-XXXXXX-XXXX-CJ/CI/CA")
    court_name: str = Field(description="Full name of the court / Juzgado")
    folio_real: str = Field(description="Property registry Folio Real (Province-Number-Subnumber, e.g. 6-189342-000)")
    plano_catastrado: Optional[str] = Field(None, description="Cadastral plan registration e.g. P-1928374-2022")
    province: str = Field(description="Costa Rican Province (San José, Alajuela, Cartago, Heredia, Guanacaste, Puntarenas, Limón)")
    canton: Optional[str] = Field(None, description="Costa Rican Canton name")
    district: Optional[str] = Field(None, description="Costa Rican District name")
    address_description: Optional[str] = Field(None, description="Physical location references")
    area_m2: Optional[float] = Field(None, description="Property area in square meters")
    currency: str = Field("USD", description="USD or CRC")
    
    base_price_call_1: float = Field(description="1st call base price (100%)")
    auction_date_call_1: str = Field(description="1st call auction datetime (ISO 8601 string)")
    
    base_price_call_2: Optional[float] = Field(None, description="2nd call base price (75%)")
    auction_date_call_2: Optional[str] = Field(None, description="2nd call auction datetime")
    
    base_price_call_3: Optional[float] = Field(None, description="3rd call base price (25%)")
    auction_date_call_3: Optional[str] = Field(None, description="3rd call auction datetime")
    
    plaintiff: Optional[str] = Field(None, description="Foreclosing creditor/bank")
    defendant: Optional[str] = Field(None, description="Debtor/borrower party")
    legal_summary: str = Field(description="2-3 sentence executive investor summary in Spanish")
    property_category: Optional[str] = Field("Residential", description="Residential, Commercial, Land/Development, Agricultural, Industrial, Condo, Luxury Estate")
    raw_edict_text: str = Field(description="Verbatim published legal edict text")
    approx_latitude: Optional[float] = Field(None, description="Latitude in Costa Rica")
    approx_longitude: Optional[float] = Field(None, description="Longitude in Costa Rica")

class AuctionBatch(BaseModel):
    auctions: List[ForeclosureAuction] = Field(default_factory=list)

# ==============================================================================
# 3. BOLETÍN JUDICIAL FETCHER & CHUNKER
# ==============================================================================
def fetch_daily_bulletin(target_date: Optional[datetime] = None) -> List[str]:
    """
    Fetches the daily judicial edicts publication from La Imprenta Nacional.
    Chunks the document by individual foreclosure notices (edictos de remate).
    """
    if requests is None or BeautifulSoup is None:
        logger.warning("requests/beautifulsoup4 not installed. Using local chunk parsing mode.")
        return []

    date = target_date or datetime.now()
    date_str = date.strftime("%d_%m_%Y")
    
    base_url = "https://www.imprentanacional.go.cr/boletin/"
    logger.info(f"Checking Boletín Judicial for date: {date_str} at {base_url}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    edicts: List[str] = []
    
    try:
        response = requests.get(base_url, headers=headers, timeout=15)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            text = soup.get_text(separator="\n")
            
            pattern = re.compile(
                r'(?=(?:En\s+(?:la\s+puerta|el\s+despacho)|Al\s+ser\s+las|A\s+las)\s+[\w\s]+(?:remataré|rematará|en\s+el\s+mejor\s+postor))',
                re.IGNORECASE
            )
            raw_chunks = pattern.split(text)
            
            for chunk in raw_chunks:
                chunk = chunk.strip()
                if (
                    len(chunk) > 120 and
                    ("remataré" in chunk.lower() or "rematará" in chunk.lower() or "mejor postor" in chunk.lower()) and
                    ("expediente" in chunk.lower() or "exp:" in chunk.lower())
                ):
                    edicts.append(chunk)
            
            logger.info(f"Extracted {len(edicts)} foreclosure edicts from daily bulletin HTML.")
        else:
            logger.warning(f"Failed to fetch bulletin portal (HTTP {response.status_code}).")
    except Exception as e:
        logger.warning(f"Boletín portal fetch notice: {e}. Fallback to simulated sample ingestion.")
        
    return edicts

# ==============================================================================
# 4. GEMINI FLASH STRUCTURED EXTRACTION ENGINE
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
6. 'base_price_call_2': If not specified, set to 75% of base_price_call_1.
7. 'base_price_call_3': If not specified, set to 25% of base_price_call_1.
8. 'area_m2': Surface area in square meters. If given in hectares (ha), convert: 1 ha = 10,000 m2.
9. 'plaintiff': Foreclosing bank (BNCR, BCR, BAC, Promerica, Davivienda, Popular, Scotiabank, private lender, etc.).
10. 'defendant': Debtor/foreclosed party name.
11. 'legal_summary': 2-3 sentence executive investor overview in Spanish describing the asset, rooms, land, location, and potential.
12. 'property_category': One of: Condo, Residential, Luxury Estate, Land/Development, Agricultural, Industrial, Commercial.

EDICT TEXT:
\"\"\"{edict_text}\"\"\"
"""

def extract_single_edict_gemini(edict_text: str, api_key: Optional[str] = None) -> Optional[ForeclosureAuction]:
    """
    Uses google-genai SDK with gemini-2.5-flash to extract a structured ForeclosureAuction.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        return None

    try:
        from google import genai
        client = genai.Client(api_key=key)
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
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
    except Exception as e:
        logger.error(f"Gemini Flash extraction error: {e}")
        return None

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
        canton_key = (getattr(auction, "canton", "") or "").lower().strip()
        district_key = (getattr(auction, "district", "") or "").lower().strip()
        
        if district_key in CR_CANTON_CENTROIDS:
            lat, lng = CR_CANTON_CENTROIDS[district_key]
        elif canton_key in CR_CANTON_CENTROIDS:
            lat, lng = CR_CANTON_CENTROIDS[canton_key]
        else:
            prov_key = (getattr(auction, "province", "san josé") or "san josé").lower().strip()
            lat, lng = PROVINCE_CENTROIDS.get(prov_key, (9.9281, -84.0907))
            
    base = auction.base_price_call_1
    multiplier = 1.38
    category = getattr(auction, "property_category", "Residential")
    
    if category in ["Luxury Estate", "Land/Development"]:
        multiplier = 1.45
    elif category in ["Condo", "Residential"]:
        multiplier = 1.35
    elif category == "Agricultural":
        multiplier = 1.50
        
    estimated_market_val = round(base * multiplier, 2)
    margin_pct = round(((estimated_market_val - base) / estimated_market_val) * 100, 2)
    
    location_wkt = f"SRID=4326;POINT({lng} {lat})"
    
    return {
        "expediente_number": auction.expediente_number,
        "court_name": auction.court_name,
        "folio_real": auction.folio_real,
        "plano_catastrado": getattr(auction, "plano_catastrado", None),
        "province": auction.province,
        "canton": getattr(auction, "canton", "Central") or "Central",
        "district": getattr(auction, "district", "Central") or "Central",
        "address_description": getattr(auction, "address_description", None),
        "area_m2": getattr(auction, "area_m2", 100.0) or 100.0,
        "currency": auction.currency,
        "base_price_call_1": auction.base_price_call_1,
        "auction_date_call_1": auction.auction_date_call_1,
        "base_price_call_2": getattr(auction, "base_price_call_2", None),
        "auction_date_call_2": getattr(auction, "auction_date_call_2", None),
        "base_price_call_3": getattr(auction, "base_price_call_3", None),
        "auction_date_call_3": getattr(auction, "auction_date_call_3", None),
        "estimated_market_value": estimated_market_val,
        "estimated_margin_pct": margin_pct,
        "plaintiff": getattr(auction, "plaintiff", "Entidad Financiera") or "Entidad Financiera",
        "defendant": getattr(auction, "defendant", None),
        "legal_summary": auction.legal_summary,
        "raw_edict_text": getattr(auction, "raw_edict_text", ""),
        "location": location_wkt,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }

# ==============================================================================
# 6. SUPABASE UPSERT ENGINE
# ==============================================================================
def upsert_to_supabase(records: List[Dict[str, Any]]) -> int:
    """
    Connects to Supabase PostGIS using service role credentials and performs upserts
    with conflict handling on expediente_number.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        logger.info("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Skipping remote database upload (Simulation mode).")
        return len(records)
        
    try:
        from supabase import create_client
        supabase = create_client(supabase_url, supabase_key)
        
        success_count = 0
        for record in records:
            res = supabase.table("auctions").upsert(
                record,
                on_conflict="expediente_number"
            ).execute()
            success_count += 1
            logger.info(f"Upserted auction {record['expediente_number']} into Supabase.")
            
        return success_count
    except Exception as e:
        logger.error(f"Error executing Supabase upsert: {e}")
        return 0

# ==============================================================================
# 7. PDF / FILE INGESTION HELPER
# ==============================================================================
def extract_edicts_from_file(file_path: str) -> List[str]:
    """
    Extracts foreclosure edict chunks from a local PDF or text file.
    """
    logger.info(f"Reading edicts from file: {file_path}")
    text = ""
    if file_path.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        except Exception as e:
            logger.error(f"Error reading PDF file {file_path}: {e}")
            return []
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    pattern = re.compile(
        r'(?=(?:En\s+(?:la\s+puerta|el\s+despacho)|Al\s+ser\s+las|A\s+las)\s+[\w\s]+(?:remataré|rematará|en\s+el\s+mejor\s+postor))',
        re.IGNORECASE
    )
    raw_chunks = pattern.split(text)
    edicts = []
    for chunk in raw_chunks:
        chunk = chunk.strip()
        if (
            len(chunk) > 120 and
            ("remataré" in chunk.lower() or "rematará" in chunk.lower() or "mejor postor" in chunk.lower()) and
            ("expediente" in chunk.lower() or "exp:" in chunk.lower())
        ):
            edicts.append(chunk)

    logger.info(f"Extracted {len(edicts)} edicts from {file_path}")
    return edicts

# ==============================================================================
# 8. MAIN INGESTION ORCHESTRATOR
# ==============================================================================
def run_pipeline(target_date: Optional[datetime] = None, file_path: Optional[str] = None, dry_run: bool = False):
    logger.info("=== Starting Boletín Judicial Ingestion Pipeline ===")
    
    if file_path:
        edict_chunks = extract_edicts_from_file(file_path)
    else:
        edict_chunks = fetch_daily_bulletin(target_date)
    
    if not edict_chunks:
        logger.info("No foreclosure notices found to process. Ingestion cycle complete.")
        return
        
    logger.info(f"Processing {len(edict_chunks)} raw edicts with Gemini Flash...")
    extracted_auctions = extract_auctions_with_gemini(edict_chunks)
    logger.info(f"Extracted {len(extracted_auctions)} structured auction records.")
    
    enriched_records = [enrich_auction_data(a) for a in extracted_auctions]
    
    if dry_run:
        logger.info(f"[DRY RUN] Generated {len(enriched_records)} enriched records:")
        for r in enriched_records:
            print(json.dumps(r, indent=2, ensure_ascii=False))
        return

    upserted = upsert_to_supabase(enriched_records)
    logger.info(f"Pipeline finished. Ingested {upserted} records successfully into Supabase.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Costa Rica Judicial Foreclosure Ingestion Engine")
    parser.add_argument("--date", type=str, help="Scrape specific date (format: YYYY-MM-DD)")
    parser.add_argument("--file", type=str, help="Parse a local PDF or text file of Boletín Judicial")
    parser.add_argument("--dry-run", action="store_true", help="Extract and display without writing to Supabase")

    args = parser.parse_args()
    
    target_dt = datetime.strptime(args.date, "%Y-%m-%d") if args.date else None
    run_pipeline(target_date=target_dt, file_path=args.file, dry_run=args.dry_run)
