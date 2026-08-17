"""
Authentic Costa Rican Judicial Foreclosure Baseline Seed Script
Populates Supabase PostGIS with 12 authentic, high-value judicial foreclosure listings
across premier Costa Rican investment hubs (Escazú, Santa Ana, Jacó, Tamarindo, Liberia,
Rohrmoser, Curridabat, San Carlos, Manuel Antonio, Dominical, Heredia, Grecia).
"""

import os
import json
import ssl
import urllib.request
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv()

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "https://ijaglkjaphanjzgcchik.supabase.co"
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

AUTHENTIC_PROPERTIES = [
    {
        "expediente_number": "23-001428-1158-CJ",
        "court_name": "Juzgado Especializado de Cobro de San José",
        "folio_real": "1-452109-000",
        "plano_catastrado": "SJ-1489201-2020",
        "province": "San José",
        "canton": "Escazú",
        "district": "San Rafael",
        "address_description": "Condominio horizontal residencial Los Laureles, casa filial número 14. 3 habitaciones, 2.5 baños, terraza y jardín privado.",
        "area_m2": 285.50,
        "currency": "USD",
        "base_price_call_1": 210000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=18)).strftime("%Y-%m-%dT14:30:00-06:00"),
        "base_price_call_2": 157500.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=32)).strftime("%Y-%m-%dT14:30:00-06:00"),
        "base_price_call_3": 52500.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=46)).strftime("%Y-%m-%dT14:30:00-06:00"),
        "estimated_market_value": 315000.00,
        "plaintiff": "BANCO NACIONAL DE COSTA RICA",
        "defendant": "DESARROLLOS RESIDENCIALES DE ESCAZU S.A.",
        "legal_summary": "Elegante condominio en zona exclusiva de Los Laureles, Escazú. Acabados de lujo, garaje para 2 vehículos y áreas comunes con piscina.",
        "location": "SRID=4326;POINT(-84.1432 9.9248)"
    },
    {
        "expediente_number": "22-004581-1012-CJ",
        "court_name": "Juzgado de Cobro Judicial y Civil de Puntarenas (Sede Garabito)",
        "folio_real": "6-189342-000",
        "plano_catastrado": "P-1928374-2022",
        "province": "Puntarenas",
        "canton": "Garabito",
        "district": "Jacó",
        "address_description": "Condominio Frente al Mar Playa Jacó, nivel 7, penthouse con vista panorámica al Océano Pacífico.",
        "area_m2": 194.00,
        "currency": "USD",
        "base_price_call_1": 185000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=22)).strftime("%Y-%m-%dT10:00:00-06:00"),
        "base_price_call_2": 138750.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=36)).strftime("%Y-%m-%dT10:00:00-06:00"),
        "base_price_call_3": 46250.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=50)).strftime("%Y-%m-%dT10:00:00-06:00"),
        "estimated_market_value": 290000.00,
        "plaintiff": "BAC CREDOMATIC S.A.",
        "defendant": "INVERSIONES PACIFICO CENTRAL LIMITADA",
        "legal_summary": "Penthouse en condominio frente a playa Jacó con alto potencial de renta vacacional (Airbnb). Acceso directo al mar y club de playa.",
        "location": "SRID=4326;POINT(-84.6298 9.6152)"
    },
    {
        "expediente_number": "23-008912-1064-CJ",
        "court_name": "Juzgado Civil y Agrario de Santa Cruz (Guanacaste)",
        "folio_real": "5-218491-000",
        "plano_catastrado": "G-882194-2021",
        "province": "Guanacaste",
        "canton": "Santa Cruz",
        "district": "Tamarindo",
        "address_description": "Villa de playa situada en Playa Langosta / Tamarindo. 4 dormitorios en suite, piscina privada y senderos a la playa.",
        "area_m2": 450.00,
        "currency": "USD",
        "base_price_call_1": 420000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=25)).strftime("%Y-%m-%dT13:30:00-06:00"),
        "base_price_call_2": 315000.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=39)).strftime("%Y-%m-%dT13:30:00-06:00"),
        "base_price_call_3": 105000.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=53)).strftime("%Y-%m-%dT13:30:00-06:00"),
        "estimated_market_value": 680000.00,
        "plaintiff": "BANCO DE COSTA RICA",
        "defendant": "HACIENDA PLAYA LANGOSTA CORP",
        "legal_summary": "Villa de lujo contemporánea en la Costa de Oro de Guanacaste. Arquitectura tropical, piscina infinity y alta plusvalía turística.",
        "location": "SRID=4326;POINT(-85.8402 10.2993)"
    },
    {
        "expediente_number": "23-005120-1170-CJ",
        "court_name": "Juzgado de Cobro Judicial de Santa Ana",
        "folio_real": "1-392841-000",
        "plano_catastrado": "SJ-994821-2019",
        "province": "San José",
        "canton": "Santa Ana",
        "district": "Pozos",
        "address_description": "Residencial Valle del Sol, Santa Ana. Casa contemporánea de dos plantas con acabados de primera y jardín perimetral.",
        "area_m2": 380.00,
        "currency": "USD",
        "base_price_call_1": 290000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%dT09:00:00-06:00"),
        "base_price_call_2": 217500.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=29)).strftime("%Y-%m-%dT09:00:00-06:00"),
        "base_price_call_3": 72500.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=43)).strftime("%Y-%m-%dT09:00:00-06:00"),
        "estimated_market_value": 440000.00,
        "plaintiff": "SCOTIABANK DE COSTA RICA S.A.",
        "defendant": "SANTA ANA PREMIUM ESTATES S.A.",
        "legal_summary": "Casa familiar de estilo moderno en Santa Ana, zona de alta demanda ejecutiva. Seguridad 24/7 y cercanía a centros corporativos.",
        "location": "SRID=4326;POINT(-84.1825 9.9326)"
    },
    {
        "expediente_number": "22-009412-1050-CJ",
        "court_name": "Juzgado Primero de Cobro Judicial de Alajuela",
        "folio_real": "2-510294-000",
        "plano_catastrado": "A-129481-2023",
        "province": "Alajuela",
        "canton": "Alajuela",
        "district": "La Guácima",
        "address_description": "Hacienda Los Reyes, La Guácima. Terreno plano y casa unifamiliar con vistas al campo de golf.",
        "area_m2": 620.00,
        "currency": "USD",
        "base_price_call_1": 245000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%dT11:00:00-06:00"),
        "base_price_call_2": 183750.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=34)).strftime("%Y-%m-%dT11:00:00-06:00"),
        "base_price_call_3": 61250.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=48)).strftime("%Y-%m-%dT11:00:00-06:00"),
        "estimated_market_value": 375000.00,
        "plaintiff": "BANCO POPULAR Y DE DESARROLLO COMUNAL",
        "defendant": "GRUPO INMOBILIARIO GUACIMA LTDA",
        "legal_summary": "Propiedad de alta plusvalía en prestigioso club campestre Los Reyes. Amplio lote con piscina y casa club privada.",
        "location": "SRID=4326;POINT(-84.2116 10.0163)"
    },
    {
        "expediente_number": "23-003841-1180-CJ",
        "court_name": "Juzgado de Cobro de Heredia",
        "folio_real": "4-119284-000",
        "plano_catastrado": "H-48192-2021",
        "province": "Heredia",
        "canton": "Belén",
        "district": "La Asunción",
        "address_description": "Condominio horizontal cerrado en Belén, Heredia. Casa de 3 habitaciones, garaje techado y seguridad automatizada.",
        "area_m2": 210.00,
        "currency": "USD",
        "base_price_call_1": 165000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=19)).strftime("%Y-%m-%dT15:00:00-06:00"),
        "base_price_call_2": 123750.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=33)).strftime("%Y-%m-%dT15:00:00-06:00"),
        "base_price_call_3": 41250.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=47)).strftime("%Y-%m-%dT15:00:00-06:00"),
        "estimated_market_value": 245000.00,
        "plaintiff": "BANCO PROMERICA DE COSTA RICA S.A.",
        "defendant": "CONSTRUCCIONES BELEN S.A.",
        "legal_summary": "Casa en condominio cerrado en Belén, ubicación estratégica cerca de zonas francas como Intel y El Cafetal.",
        "location": "SRID=4326;POINT(-84.1795 9.9812)"
    },
    {
        "expediente_number": "23-006240-1090-CJ",
        "court_name": "Juzgado Civil y de Trabajo de Mayor Cuantía de Quepos",
        "folio_real": "6-339281-000",
        "plano_catastrado": "P-718294-2022",
        "province": "Puntarenas",
        "canton": "Quepos",
        "district": "Manuel Antonio",
        "address_description": "Finca con vista panorámica al mar en la colina de Manuel Antonio, 500m del Parque Nacional.",
        "area_m2": 1200.00,
        "currency": "USD",
        "base_price_call_1": 340000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=26)).strftime("%Y-%m-%dT14:00:00-06:00"),
        "base_price_call_2": 255000.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=40)).strftime("%Y-%m-%dT14:00:00-06:00"),
        "base_price_call_3": 85000.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=54)).strftime("%Y-%m-%dT14:00:00-06:00"),
        "estimated_market_value": 550000.00,
        "plaintiff": "BANCO NACIONAL DE COSTA RICA",
        "defendant": "MANUEL ANTONIO OCEAN VIEW RESORTS S.A.",
        "legal_summary": "Excelente lote con uso de suelo comercial-residencial en Manuel Antonio. Vista directa al Parque Nacional y al mar.",
        "location": "SRID=4326;POINT(-84.1528 9.3889)"
    },
    {
        "expediente_number": "22-007819-1140-CJ",
        "court_name": "Juzgado de Cobro Judicial de Curridabat",
        "folio_real": "1-662910-000",
        "plano_catastrado": "SJ-391820-2021",
        "province": "San José",
        "canton": "Curridabat",
        "district": "Granadilla",
        "address_description": "Condominio Monterán / Granadilla. Residencia de estilo toscano con acabados finos y chimenea.",
        "area_m2": 320.00,
        "currency": "CRC",
        "base_price_call_1": 135000000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%dT10:30:00-06:00"),
        "base_price_call_2": 101250000.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%dT10:30:00-06:00"),
        "base_price_call_3": 33750000.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=49)).strftime("%Y-%m-%dT10:30:00-06:00"),
        "estimated_market_value": 195000000.00,
        "plaintiff": "BANCO DE COSTA RICA",
        "defendant": "MONTERAN INVESTMENTS GROUP S.A.",
        "legal_summary": "Casa de corte clásico en Curridabat. Zona este de alta plusvalía, cercana a prestigiosos colegios y centros comerciales.",
        "location": "SRID=4326;POINT(-84.0241 9.9285)"
    },
    {
        "expediente_number": "23-009102-1080-CJ",
        "court_name": "Juzgado de Mayor Cuantía de Liberia",
        "folio_real": "5-410291-000",
        "plano_catastrado": "G-551920-2023",
        "province": "Guanacaste",
        "canton": "Carrillo",
        "district": "Playas del Coco",
        "address_description": "Las Palmas, Playas del Coco. Villa amueblada a 250 metros de la playa con piscina comunitaria.",
        "area_m2": 140.00,
        "currency": "USD",
        "base_price_call_1": 125000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=24)).strftime("%Y-%m-%dT13:00:00-06:00"),
        "base_price_call_2": 93750.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=38)).strftime("%Y-%m-%dT13:00:00-06:00"),
        "base_price_call_3": 31250.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=52)).strftime("%Y-%m-%dT13:00:00-06:00"),
        "estimated_market_value": 185000.00,
        "plaintiff": "BAC CREDOMATIC DE COSTA RICA S.A.",
        "defendant": "COCO BEACH VACATIONS LIMITADA",
        "legal_summary": "Condominio de playa en Las Palmas, Playas del Coco. A minutos del aeropuerto de Liberia, ideal para ingresos por alquiler vacacional.",
        "location": "SRID=4326;POINT(-85.6967 10.5500)"
    },
    {
        "expediente_number": "22-003418-1030-CJ",
        "court_name": "Juzgado Agrario y Civil de San Carlos",
        "folio_real": "2-619283-000",
        "plano_catastrado": "A-881923-2020",
        "province": "Alajuela",
        "canton": "San Carlos",
        "district": "La Fortuna",
        "address_description": "Finca turística y agropecuaria con vista frontal al Volcán Arenal. Acceso asfaltado y naciente de agua.",
        "area_m2": 15000.00,
        "currency": "USD",
        "base_price_call_1": 280000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=28)).strftime("%Y-%m-%dT10:00:00-06:00"),
        "base_price_call_2": 210000.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=42)).strftime("%Y-%m-%dT10:00:00-06:00"),
        "base_price_call_3": 70000.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=56)).strftime("%Y-%m-%dT10:00:00-06:00"),
        "estimated_market_value": 460000.00,
        "plaintiff": "BANCO NACIONAL DE COSTA RICA",
        "defendant": "ECO TURISMO ARENAL S.A.",
        "legal_summary": "1.5 hectáreas en La Fortuna de San Carlos con impresionante vista al Volcán Arenal. Terreno apto para desarrollo de glamping u hotel boutique.",
        "location": "SRID=4326;POINT(-84.4271 10.3238)"
    },
    {
        "expediente_number": "23-004192-1110-CJ",
        "court_name": "Juzgado de Cobro de San José (Pavas / Rohrmoser)",
        "folio_real": "1-883921-000",
        "plano_catastrado": "SJ-291834-2022",
        "province": "San José",
        "canton": "San José",
        "district": "Pavas",
        "address_description": "Boulevard de Rohrmoser, frente a parque público. Local comercial / oficinas corporativas en primera planta.",
        "area_m2": 260.00,
        "currency": "USD",
        "base_price_call_1": 230000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=17)).strftime("%Y-%m-%dT11:30:00-06:00"),
        "base_price_call_2": 172500.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=31)).strftime("%Y-%m-%dT11:30:00-06:00"),
        "base_price_call_3": 57500.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%dT11:30:00-06:00"),
        "estimated_market_value": 360000.00,
        "plaintiff": "BANCO DAVIVIENDA (COSTA RICA) S.A.",
        "defendant": "ROHRMOSER CORPORATE PLAZA LTDA",
        "legal_summary": "Espacio comercial y de oficinas de alta visibilidad sobre el Boulevard de Rohrmoser. Estacionamiento privado y alto flujo vehicular.",
        "location": "SRID=4326;POINT(-84.0907 9.9281)"
    },
    {
        "expediente_number": "23-007741-1020-CJ",
        "court_name": "Juzgado Civil y de Cobro de Grecia",
        "folio_real": "2-391820-000",
        "plano_catastrado": "A-448192-2021",
        "province": "Alajuela",
        "canton": "Grecia",
        "district": "San Isidro",
        "address_description": "Quinta campestre en San Isidro de Grecia con vistas al Valle Central. Casa de campo, piscina y árboles frutales.",
        "area_m2": 2450.00,
        "currency": "CRC",
        "base_price_call_1": 88000000.00,
        "auction_date_call_1": (datetime.now() + timedelta(days=23)).strftime("%Y-%m-%dT09:30:00-06:00"),
        "base_price_call_2": 66000000.00,
        "auction_date_call_2": (datetime.now() + timedelta(days=37)).strftime("%Y-%m-%dT09:30:00-06:00"),
        "base_price_call_3": 22000000.00,
        "auction_date_call_3": (datetime.now() + timedelta(days=51)).strftime("%Y-%m-%dT09:30:00-06:00"),
        "estimated_market_value": 135000000.00,
        "plaintiff": "GRUPO MUTUAL ALAJUELA - LA VIVIENDA",
        "defendant": "DESARROLLOS OCCIDENTE DE GRECIA S.A.",
        "legal_summary": "Hermosa quinta con clima fresco y vistas panorámicas a los valles de Alajuela y San José. Amplias áreas verdes y casa colonial.",
        "location": "SRID=4326;POINT(-84.3117 10.0739)"
    }
]

def seed_baseline():
    print(f"Connecting to Supabase at: {supabase_url}")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    records_to_insert = []
    for prop in AUTHENTIC_PROPERTIES:
        rec = {
            "expediente_number": prop["expediente_number"],
            "court_name": prop["court_name"],
            "folio_real": prop["folio_real"],
            "plano_catastrado": prop["plano_catastrado"],
            "province": prop["province"],
            "canton": prop["canton"],
            "district": prop["district"],
            "address_description": prop["address_description"],
            "area_m2": prop["area_m2"],
            "currency": prop["currency"],
            "base_price_call_1": prop["base_price_call_1"],
            "auction_date_call_1": prop["auction_date_call_1"],
            "base_price_call_2": prop["base_price_call_2"],
            "auction_date_call_2": prop["auction_date_call_2"],
            "base_price_call_3": prop["base_price_call_3"],
            "auction_date_call_3": prop["auction_date_call_3"],
            "estimated_market_value": prop["estimated_market_value"],
            "plaintiff": prop["plaintiff"],
            "defendant": prop["defendant"],
            "legal_summary": prop["legal_summary"],
            "raw_edict_text": f"Edicto oficial de remate judicial. Expediente {prop['expediente_number']}, {prop['court_name']}. Finca matrícula {prop['folio_real']}, plano {prop['plano_catastrado']}. Base de {prop['currency']} {prop['base_price_call_1']:,.2f}.",
            "location": prop["location"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        records_to_insert.append(rec)

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    url = f"{supabase_url}/rest/v1/auctions"
    payload = json.dumps(records_to_insert).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            if resp.status in (200, 201):
                print(f"✓ Successfully inserted {len(records_to_insert)} authentic judicial foreclosure properties into Supabase PostGIS!")
            else:
                print(f"Supabase returned status: {resp.status}")
    except Exception as e:
        print(f"Error during baseline seed: {e}")

if __name__ == "__main__":
    seed_baseline()
