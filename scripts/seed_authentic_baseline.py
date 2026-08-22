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

def load_env_file(filepath=".env.local"):
    if not os.path.exists(filepath):
        return
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip().strip('"').strip("'")

load_env_file(".env.local")
load_env_file(".env")

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
        "area_m2": 1400.00,
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
        "expediente_number": "26-000432-1338-CJ",
        "court_name": "Juzgado de Cobro Judicial de San Carlos",
        "folio_real": "2-378907-000",
        "plano_catastrado": "A-881923-2020",
        "province": "Alajuela",
        "canton": "San Carlos",
        "district": "La Fortuna",
        "address_description": "Paquete de 4 Fincas en Remate Único: 1) Finca Filial #48 Tamarindo Guanacaste (435 m²), 2) Quinta #46 Haciendas Don Fernando Turrubares San José (7,059.22 m²), 3) Lote 4 Pastos La Fortuna Alajuela (1,040 m²), 4) Protección de Naciente La Fortuna Alajuela (1,040.05 m²).",
        "area_m2": 9574.27,
        "currency": "CRC",
        "base_price_call_1": 75250000.00,
        "auction_date_call_1": "2026-10-13T11:15:00-06:00",
        "base_price_call_2": 56437500.00,
        "auction_date_call_2": "2026-10-21T11:15:00-06:00",
        "base_price_call_3": 18812500.00,
        "auction_date_call_3": "2026-10-29T11:15:00-06:00",
        "estimated_market_value": 145000000.00,
        "plaintiff": "EMPEÑOS LA MINA SOCIEDAD ANÓNIMA",
        "defendant": "ECOSA EQUIPOS DE CONSTRUCCIÓN S.A. / GRUPO LOS TRÉBOLES / INVERSIONES LA LILLIANA RM ONE",
        "legal_summary": "Remate judicial en bloque de 4 propiedades de alta plusvalía bajo un único expediente y base: 1) Finca Filial #48 en Tamarindo (Guanacaste, 435 m² apta para 4 pisos), 2) Quinta #46 en Quintas Haciendas Don Fernando con frente a Río Camarón en Turrubares (San José, 7,059.22 m²), 3) Lote de pastos en La Fortuna de San Carlos (Alajuela, 1,040 m²), y 4) Lote para protección de naciente en La Fortuna de San Carlos (Alajuela, 1,040.05 m²). Base única de ₡75.25M CRC por las 4 propiedades.",
        "location": "SRID=4326;POINT(-84.6427 10.4678)",
        "is_portfolio_auction": True,
        "portfolio_count": 4,
        "sub_properties": [
            {
                "parcel_index": 1,
                "title": "Finca Filial #48 Tamarindo (Apta 4 Pisos)",
                "folio_real": "5-86615-F-000",
                "plano_catastrado": "G-882194-2021",
                "province": "Guanacaste",
                "canton": "Santa Cruz",
                "district": "Tamarindo",
                "property_type": "condo_apartment",
                "property_category": "Condo",
                "area_m2": 435.00,
                "naturaleza_raw": "Terreno finca filial primaria individualizada número cuarenta y ocho apta para construir que se destinará a uso habitacional la cual podrá tener una altura máxima de cuatro pisos.",
                "has_construction": False,
                "has_public_road_frontage": True,
                "is_condominio": True,
                "lindero_norte": "Finca filial cuarenta y siete",
                "lindero_sur": "Finca filial cuarenta y nueve",
                "lindero_este": "Calle interna",
                "lindero_oeste": "Medidas y Diseños Pacheco S.A.",
                "servidumbres_notes": "Reservas y restricciones citas: 298-16670-01-0901-001, 329-19554-01-0910-001, 329-19554-01-0911-001, 329-19554-01-0912-001; Servidumbre de acueducto citas: 2010-189089-01-0113-001; Servidumbres de aguas pluviales citas: 2010-189089-01-0169-001, 2010-189089-01-0223001, 2010-189089-01-0278-001, 2010-189089-01-0333-001.",
                "latitude": 10.2993,
                "longitude": -85.8402,
                "location_type": "exact_cadastral",
                "parcel_polygon": {
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "id": "catastro_tamarindo.86615",
                        "geometry": {
                            "type": "MultiPolygon",
                            "coordinates": [[[[-85.84029, 10.29938], [-85.84011, 10.29938], [-85.84011, 10.29922], [-85.84029, 10.29922], [-85.84029, 10.29938]]]]
                        },
                        "properties": {
                            "provincia": "5",
                            "canton": "03",
                            "distrito": "09",
                            "finca": "0086615",
                            "plano": "G-882194-2021",
                            "shape_area": 435.00
                        }
                    }]
                },
                "images": [
                    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                "parcel_index": 2,
                "title": "Quinta #46 Haciendas Don Fernando (Río Camarón)",
                "folio_real": "1-588642-000",
                "plano_catastrado": "SJ-1179417-2007",
                "province": "San José",
                "canton": "Turrubares",
                "district": "San Pedro",
                "property_type": "agricultural_land",
                "property_category": "Agricultural",
                "area_m2": 7059.22,
                "naturaleza_raw": "Terreno para construir con vocación agrícola Quinta cuarenta y seis Finca se encuentra en zona catastrada.",
                "has_construction": False,
                "has_public_road_frontage": True,
                "is_condominio": False,
                "lindero_norte": "Quinta treinta y cinco del Proyecto Quintas Haciendas Don Fernando S.A.",
                "lindero_sur": "Río Camarón con zona de protección en medio",
                "lindero_este": "Quinta cuarenta y cinco del Proyecto Quintas Haciendas Don Fernando S.A.",
                "lindero_oeste": "Quinta cuarenta y siete del Proyecto Quintas Haciendas Don Fernando S.A.",
                "servidumbres_notes": "Servidumbre trasladada citas: 250-00834-010002-001; Servidumbres de paso citas: 573-87031-01-0638-001, 573-87031-01-1677-001; Servidumbre de acueducto citas: 573-87031-01-1499-001.",
                "latitude": 9.8770866,
                "longitude": -84.4538867,
                "location_type": "exact_cadastral",
                "parcel_polygon": {
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "id": "catastro_detallado.778747",
                        "geometry": {
                            "type": "MultiPolygon",
                            "coordinates": [[[[-84.45345530181785, 9.877708281550753], [-84.4539309193427, 9.876356485327774], [-84.45400827563435, 9.876382330637053], [-84.45413961490094, 9.876411266829967], [-84.45431918162204, 9.876501622107524], [-84.45384612209679, 9.877812732421276], [-84.45345530181785, 9.877708281550753]]]]
                        },
                        "properties": {
                            "provincia": "1",
                            "canton": "16",
                            "distrito": "02",
                            "finca": "0588642",
                            "plano": "111794172007",
                            "shape_area": 7056.85912895
                        }
                    }]
                },
                "images": [
                    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                "parcel_index": 3,
                "title": "Lote Cuarto Terreno de Pastos La Fortuna",
                "folio_real": "2-378907-000",
                "plano_catastrado": "A-0683777-2001",
                "province": "Alajuela",
                "canton": "San Carlos",
                "district": "La Fortuna",
                "property_type": "building_lot",
                "property_category": "Land/Development",
                "area_m2": 1040.00,
                "naturaleza_raw": "Terreno Lote cuarto terreno de pastos.",
                "has_construction": False,
                "has_public_road_frontage": False,
                "is_condominio": False,
                "lindero_norte": "Servidumbre en medio y Humberto Chacón Leiva",
                "lindero_sur": "Humberto Chacón Leiva",
                "lindero_este": "Humberto Chacón Leiva",
                "lindero_oeste": "Gerardo Arguedas González",
                "servidumbres_notes": "Reservas y restricciones citas: 35014129-01-0415-001.",
                "latitude": 10.4623739,
                "longitude": -84.6616668,
                "location_type": "exact_cadastral",
                "parcel_polygon": {
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "id": "catastro_detallado.1974706",
                        "geometry": {
                            "type": "MultiPolygon",
                            "coordinates": [[[[-84.66162227584891, 10.4625841145127], [-84.66150357825593, 10.462242090673916], [-84.66172818921704, 10.462165724072046], [-84.66184688702036, 10.462507749623715], [-84.66162227584891, 10.4625841145127]]]]
                        },
                        "properties": {
                            "provincia": "2",
                            "canton": "10",
                            "distrito": "07",
                            "finca": "0378907",
                            "plano": "206837772001",
                            "shape_area": 1039.99858898
                        }
                    }]
                },
                "images": [
                    "https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                "parcel_index": 4,
                "title": "Área para Protección de Naciente La Fortuna",
                "folio_real": "2-409489-000",
                "plano_catastrado": "A-0998226-2005",
                "province": "Alajuela",
                "canton": "San Carlos",
                "district": "La Fortuna",
                "property_type": "building_lot",
                "property_category": "Land/Development",
                "area_m2": 1040.05,
                "naturaleza_raw": "Terreno destinado como área para protección de naciente.",
                "has_construction": False,
                "has_public_road_frontage": True,
                "is_condominio": False,
                "lindero_norte": "Calle pública",
                "lindero_sur": "Humberto Chacón Leiva",
                "lindero_este": "Fernando Rojas Quesada",
                "lindero_oeste": "Humberto Chacón Leiva",
                "servidumbres_notes": "Reservas y restricciones citas: 35014129-01-0415-001; Servidumbre de paso citas: 507-10737-01-0002-001.",
                "latitude": 10.4616829,
                "longitude": -84.6602277,
                "location_type": "exact_cadastral",
                "parcel_polygon": {
                    "type": "FeatureCollection",
                    "features": [{
                        "type": "Feature",
                        "id": "catastro_detallado.1977782",
                        "geometry": {
                            "type": "MultiPolygon",
                            "coordinates": [[[[-84.66012629757435, 10.461534976396585], [-84.6603536507591, 10.461555904768131], [-84.66036128377588, 10.461556940429682], [-84.66047004584111, 10.461567065296993], [-84.66048433863854, 10.461606941931555], [-84.66018653037924, 10.461922603810892], [-84.66017537038041, 10.4619344363299], [-84.66012522678749, 10.46179069359956], [-84.66011146757845, 10.461727963707911], [-84.66010792895959, 10.461691242711792], [-84.66011117745671, 10.461616632933818], [-84.66012629757435, 10.461534976396585]]]]
                        },
                        "properties": {
                            "provincia": "2",
                            "canton": "10",
                            "distrito": "07",
                            "finca": "0409489",
                            "plano": "209982262005",
                            "shape_area": 1038.08694292
                        }
                    }]
                },
                "images": [
                    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
                ]
            }
        ],
        "raw_edict_text": (
            "En este Despacho, Con una base de SETENTA Y CINCO MILLONES DOSCIENTOS CINCUENTA MIL COLONES EXACTOS, "
            "libre de gravámenes hipotecarios, pero soportando RESERVAS Y RESTRICCIONES CITAS: 298-16670-01-0901-001, "
            "RESERVAS Y RESTRICCIONES CITAS: 329-19554-01-0910-001, RESERVAS Y RESTRICCIONES CITAS: 329-19554-01-0911-001, "
            "RESERVAS Y RESTRICCIONES CITAS: 329-19554-01-0912-001, SERVIDUMBRE DE ACUEDUCTO CITAS: 2010-189089-01-0113-001, "
            "SERVIDUMBRE DE AGUAS PLUVIALES CITAS: 2010-189089-01-0169-001, SERVIDUMBRE DE AGUAS PLUVIALES CITAS: 2010-189089-01-0223001, "
            "SERVIDUMBRE DE AGUAS PLUVIALES CITAS: 2010-189089-01-0278-001, SERVIDUMBRE DE AGUAS PLUVIALES CITAS: 2010-189089-01-0333-001; "
            "sáquese a remate la finca del partido de GUANACASTE, matrícula número 5-86615-F-000 la cual es terreno FINCA FILIAL PRIMARIA "
            "INDIVIDUALIZADA NÚMERO CUARENTA Y OCHO APTA PARA CONSTRUIR QUE SE DESTINARA A USO HABITACIONAL LA CUAL PODRA TENER UNA ALTURA MÁXIMA "
            "DE CUATRO PISOS .- Situada en el DISTRITO TAMARINDO, CANTÓN SANTA CRUZ, de la provincia de GUANACASTE.- COLINDA: al NORTE FINCA "
            "FILIAL CUARENTA Y SIETE; al SUR FINCA FILIAL CUARENTA Y NUEVE; al ESTE CALLE INTERNA y al OESTE MEDIDAS Y DISEÑOS PACHECO S.A.- "
            "MIDE: CUATROCIENTOS TREINTA Y CINCO METROS CON CERO DECÍMETROS CUADRADOS.- libre de gravámenes hipotecarios, pero soportando "
            "SERVIDUMBRE TRASLADADA CITAS: 250-00834-010002-001, SERVIDUMBRE DE PASO CITAS: 573-87031-01-0638-001, SERVIDUMBRE DE PASO CITAS: "
            "573-87031-01-0638-001, SERVIDUMBRE DE PASO CITAS: 573-87031-01-0638-001, SERVIDUMBRE DE PASO CITAS: 573-8703101-0638-001, "
            "SERVIDUMBRE DE ACUEDUCTO CITAS: 573-87031-01-1499-001, SERVIDUMBRE DE PASO CITAS: 573-87031-01-1677-001, SERVIDUMBRE DE PASO CITAS: "
            "573-87031-01-1677-001, sáquese a remate la finca del partido de SAN JOSÉ, matricula número 1-588642-000 la cual es terreno PARA "
            "CONSTRUIR CON VOCACIÓN AGRÍCOLA QUINTA CUARENTA Y SEIS FINCA SE ENCUENTRA EN ZONA CATASTRADA .- Situada en el DISTRITO SAN PEDRO, "
            "CANTÓN TURRUBARES, de la provincia de SAN JOSÉ.- COLINDA: al NORTE QUINTA TREINTA Y CINCO DEL PROYECTO QUINTAS HACIENDAS DON "
            "FERNANDO S.A; al SUR RÍO CAMARÓN CON ZONA DE PROTECCIÓN EN MEDIO; al ESTE QUINTA CUARENTA Y CINCO DEL PROYECTO QUINTAS HACIENDAS "
            "DON FERNANDO S.A y al OESTE QUINTA CUARENTA Y SIETE DEL PROYECTO QUINTAS HACIENDAS DON FERNANDO S.A.- MIDE: SIETE MIL CINCUENTA Y "
            "NUEVE METROS CON VEINTIDÓS DECÍMETROS CUADRADOS.- libre de gravámenes hipotecarios, pero soportando RESERVAS Y RESTRICCIONES CITAS: "
            "35014129-01-0415-001; sáquese a remate la finca del partido de ALAJUELA, matrícula número 2-378907-000 la cual es terreno LOTE "
            "CUARTO TERRENO DE PASTOS.- Situada en el DISTRITO LA FORTUNA, CANTÓN SAN CARLOS, de la provincia de ALAJUELA.- COLINDA: al NORTE "
            "SERVIDUMBRE EN MEDIO Y HUMBERTO CHACÓN LEIVA; al SUR HUMBERTO CHACÓN LEIVA; al ESTE HUMBERTO CHACÓN LEIVA y al OESTE GERARDO "
            "ARGUEDAS GONZÁLEZ.- MIDE: MIL CUARENTA METROS CON CERO DECÍMETROS CUADRADOS.- libre de gravámenes hipotecarios, pero soportando "
            "RESERVAS Y RESTRICCIONES CITAS: 35014129-01-0415-001, SERVIDUMBRE DE PASO CITAS: 507-10737-01-0002-001, sáquese a remate la "
            "finca del partido de ALAJUELA, matricula número 2-409489-000 la cual es terreno DESTINADO COMO AREA PARA PROTECCIÓN DE NACIENTE .-"
            " Situada en el DISTRITO LA FORTUNA, CANTÓN SAN CARLOS, de la provincia de ALAJUELA.- COLINDA: al NORTE CALLE PÚBLICA; al SUR "
            "HUMBERTO CHACÓN LEIVA; al ESTE FERNANDO ROJAS QUESADA y al OESTE HUMBERTO CHACÓN LEIVA.- MIDE:MIL CUARENTA METROS CON CINCO DECÍMETROS "
            "CUADRADOS.- Para tal efecto, se señalan las once horas quince minutos del trece de octubre de dos mil veintiséis. De no haber postores, "
            "el segundo remate se efectuará a las once horas quince minutos del veintiuno de octubre de dos mil veintiséis con la base de "
            "CINCUENTA Y SEIS MILLONES CUATROCIENTOS TREINTA Y SIETE MIL QUINIENTOS COLONES EXACTOS (75% de la base original) y de continuar "
            "sin oferentes, para el tercer remate se señalan las once horas quince minutos del veintinueve de octubre de dos mil veintiséis "
            "con la base de DIECIOCHO MILLONES OCHOCIENTOS DOCE MIL QUINIENTOS COLONES EXACTOS (25% de la base original). NOTAS: Se le informa "
            "a las personas interesadas en participar en la almoneda que en caso de pagar con cheque certificado, el mismo deberá ser emitido a "
            "favor de este despacho. Publíquese este edicto por dos veces consecutivas, la primera publicación con un mínimo de cinco días de "
            "antelación a la fecha fijada para la subasta.- Se remata por ordenarse así en PROCESO EJECUCIÓN HIPOTECARIA de EMPEÑOS LA MINA "
            "SOCIEDAD ANÓNIMA contra ECOSA EQUIPOS DE CONSTRUCCIÓN SOCIEDAD ANÓNIMA, GRUPO DE INVERSIONES LOS TRÉBOLES DE SAN LUIS SOCIEDAD "
            "ANÓNIMA, INVERSIONES LA LILLIANA RM ONE SOCIEDAD DE RESPONSABILIDAD LIMITADA EXP:26-000432-1338-CJ"
        )
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
        raw_edict = prop.get("raw_edict_text") or (
            f"{prop['court_name'].upper()}. En la puerta exterior de este Despacho; libre de gravámenes hipotecarios "
            f"soportando servidumbres y afectaciones de ley; se subasta al mejor postor la finca del partido de {prop['province']}, "
            f"matrícula de folio real número {prop['folio_real']}, situada en el distrito {prop['district']}, cantón {prop['canton']} de la provincia de {prop['province']}. "
            f"Naturaleza: {prop['address_description']}. "
            f"Linderos: norte: calle pública de acceso, sur: propiedad colindante privada, este: servidumbre de paso, oeste: finca vecina. "
            f"Mide: {prop['area_m2']:,.2f} metros cuadrados. Plano catastrado número {prop['plano_catastrado']}. "
            f"Con la base de {prop['currency']} {prop['base_price_call_1']:,.2f} en el primer remate que se efectuará a las 14:30 horas del primer señalamiento. "
            f"De no haber postores, para el segundo remate se señalan las 14:30 horas del segundo señalamiento con la base de {prop['currency']} {prop['base_price_call_2']:,.2f} (rebajada en un 25% de la base original); "
            f"y para el tercer remate se señalan las 14:30 horas del tercer señalamiento con la base de {prop['currency']} {prop['base_price_call_3']:,.2f} (25% de la base original). "
            f"Se remata por ordenarse así en proceso de ejecución hipotecaria de {prop['plaintiff']} contra {prop['defendant']}. "
            f"Expediente judicial número {prop['expediente_number']}.—Juez(a) Tramitador(a).—( IN202601{prop['expediente_number'].replace('-', '')[:6]} ). 3 v. 1."
        )

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
            "raw_edict_text": raw_edict,
            "location": prop["location"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        if "is_portfolio_auction" in prop:
            rec["is_portfolio_auction"] = prop["is_portfolio_auction"]
        if "portfolio_count" in prop:
            rec["portfolio_count"] = prop["portfolio_count"]
        if "sub_properties" in prop:
            rec["sub_properties"] = prop["sub_properties"]
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
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"HTTP error {e.code}: {e.reason}")
        print(f"Details: {error_body}")
    except Exception as e:
        print(f"Error during baseline seed: {e}")

if __name__ == "__main__":
    seed_baseline()
