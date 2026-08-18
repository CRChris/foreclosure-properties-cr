"""
Seed Initial Costa Rica Foreclosure Dataset to Live Supabase Database
"""

import os
import json
import urllib.request
import urllib.error

try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(".env.local")
except ImportError:
    pass

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

SEED_AUCTIONS = [
    {
        "expediente_number": "23-001428-1158-CJ",
        "court_name": "Juzgado Especializado de Cobro de Garabito",
        "folio_real": "6-189342-000",
        "plano_catastrado": "P-1928374-2022",
        "province": "Puntarenas",
        "canton": "Garabito",
        "district": "Jacó",
        "address_description": "Condominio Acqua Residences, Filial 502, frente a Playa Jacó",
        "area_m2": 165.50,
        "currency": "USD",
        "base_price_call_1": 220000.00,
        "auction_date_call_1": "2026-09-15T14:30:00-06:00",
        "base_price_call_2": 165000.00,
        "auction_date_call_2": "2026-10-06T14:30:00-06:00",
        "base_price_call_3": 55000.00,
        "auction_date_call_3": "2026-10-27T14:30:00-06:00",
        "estimated_market_value": 315000.00,
        "plaintiff": "Banco Nacional de Costa Rica (BNCR)",
        "defendant": "Inversiones Turísticas del Pacífico Jacó S.A.",
        "legal_summary": "Remate judicial de apartamento de lujo frente al mar en piso 5 en Condominio Acqua Residences, Jacó. Cuenta con 2 habitaciones, 2 baños, acabados en granito y terraza con vista directa al atardecer.",
        "raw_edict_text": "JUZGADO DE COBRO Y MENOR CUANTÍA DE GARABITO. A las catorce horas y treinta minutos del quince de setiembre de dos mil veintiséis, en la puerta exterior de este Despacho...",
        "location": "SRID=4326;POINT(-84.6298 9.6152)"
    },
    {
        "expediente_number": "22-009841-1012-CA",
        "court_name": "Juzgado Primero Civil de San José",
        "folio_real": "1-452109-000",
        "plano_catastrado": "SJ-1489201-2020",
        "province": "San José",
        "canton": "Escazú",
        "district": "San Rafael",
        "address_description": "Condominio Vista Real, Casa 14, Guachipelín Norte",
        "area_m2": 280.00,
        "currency": "USD",
        "base_price_call_1": 340000.00,
        "auction_date_call_1": "2026-09-22T10:00:00-06:00",
        "base_price_call_2": 255000.00,
        "auction_date_call_2": "2026-10-13T10:00:00-06:00",
        "base_price_call_3": 85000.00,
        "auction_date_call_3": "2026-11-03T10:00:00-06:00",
        "estimated_market_value": 460000.00,
        "plaintiff": "BAC San José Credomatic",
        "defendant": "Desarrollos Urbanos del Valle Central S.A.",
        "legal_summary": "Casa contemporánea de dos plantas en condominio de alta plusvalía en Guachipelín de Escazú. 3 habitaciones con baño en suite, jardín privado, parqueo bajo techo para 2 vehículos.",
        "raw_edict_text": "JUZGADO PRIMERO CIVIL DE SAN JOSÉ. A las diez horas cero minutos del veintidós de setiembre de dos mil veintiséis...",
        "location": "SRID=4326;POINT(-84.1528 9.9389)"
    },
    {
        "expediente_number": "23-004512-0504-CJ",
        "court_name": "Juzgado de Cobro de Alajuela",
        "folio_real": "2-389104-000",
        "plano_catastrado": "A-3091823-2021",
        "province": "Alajuela",
        "canton": "Alajuela",
        "district": "La Guácima",
        "address_description": "Residencial Los Reyes, Lote 45B",
        "area_m2": 1250.00,
        "currency": "CRC",
        "base_price_call_1": 95000000.00,
        "auction_date_call_1": "2026-09-18T09:30:00-06:00",
        "base_price_call_2": 71250000.00,
        "auction_date_call_2": "2026-10-09T09:30:00-06:00",
        "base_price_call_3": 23750000.00,
        "auction_date_call_3": "2026-10-30T09:30:00-06:00",
        "estimated_market_value": 140000000.00,
        "plaintiff": "Banco Popular y de Desarrollo Comunal",
        "defendant": "Construcciones & Paisajismo Occidental Limitada",
        "legal_summary": "Amplio terreno plano residencial dentro del prestigioso complejo Los Reyes en La Guácima. Acceso a campo de golf, club campestre y seguridad 24/7.",
        "raw_edict_text": "JUZGADO DE COBRO DE ALAJUELA. A las nueve horas y treinta minutos del dieciocho de setiembre...",
        "location": "SRID=4326;POINT(-84.2889 9.9722)"
    },
    {
        "expediente_number": "24-000318-1204-CJ",
        "court_name": "Juzgado de Cobro de Heredia",
        "folio_real": "4-192837-000",
        "plano_catastrado": "H-2819302-2023",
        "province": "Heredia",
        "canton": "Belén",
        "district": "La Asunción",
        "address_description": "Oficentro El Cedro, Módulo Comercial 102",
        "area_m2": 320.00,
        "currency": "USD",
        "base_price_call_1": 410000.00,
        "auction_date_call_1": "2026-09-29T11:00:00-06:00",
        "base_price_call_2": 30750000.00,
        "auction_date_call_2": "2026-10-20T11:00:00-06:00",
        "base_price_call_3": 102500.00,
        "auction_date_call_3": "2026-11-10T11:00:00-06:00",
        "estimated_market_value": 530000.00,
        "plaintiff": "Scotiabank de Costa Rica S.A.",
        "defendant": "Corporación Logística Global C.R. S.A.",
        "legal_summary": "Local comercial y corporativo en primer nivel de centro empresarial con alto flujo en Belén de Heredia. Ideal para sucursal bancaria o consultorio médico.",
        "raw_edict_text": "JUZGADO DE COBRO DE HEREDIA. A las once horas cero minutos del veintinueve de setiembre...",
        "location": "SRID=4326;POINT(-84.1795 9.9812)"
    },
    {
        "expediente_number": "23-007129-0891-CA",
        "court_name": "Juzgado Civil y Agrario de Santa Cruz",
        "folio_real": "5-301928-000",
        "plano_catastrado": "G-1902834-2018",
        "province": "Guanacaste",
        "canton": "Santa Cruz",
        "district": "Tamarindo",
        "address_description": "Playa Langosta, 150m Sur del Hotel Cala Luna",
        "area_m2": 850.00,
        "currency": "USD",
        "base_price_call_1": 480000.00,
        "auction_date_call_1": "2026-10-02T13:00:00-06:00",
        "base_price_call_2": 360000.00,
        "auction_date_call_2": "2026-10-23T13:00:00-06:00",
        "base_price_call_3": 120000.00,
        "auction_date_call_3": "2026-11-13T13:00:00-06:00",
        "estimated_market_value": 680000.00,
        "plaintiff": "Banco Promerica de Costa Rica",
        "defendant": "Inmobiliaria Costarricense del Sol S.A.",
        "legal_summary": "Propiedad premium para desarrollo de villas de alquiler vacacional a solo 2 minutos a pie de la playa en Playa Langosta/Tamarindo.",
        "raw_edict_text": "JUZGADO CIVIL Y AGRARIO DE SANTA CRUZ. A las trece horas cero minutos del dos de octubre...",
        "location": "SRID=4326;POINT(-85.8456 10.2889)"
    }
]

def seed():
    print(f"Connecting to Supabase at: {SUPABASE_URL}...")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    url = f"{SUPABASE_URL}/rest/v1/auctions"
    data = json.dumps(SEED_AUCTIONS).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            print(f"✓ Successfully seeded {len(SEED_AUCTIONS)} properties into live Supabase database! (Status: {resp.status})")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"Supabase API Response ({e.code}): {body}")
    except Exception as e:
        print(f"Error seeding Supabase: {e}")

if __name__ == "__main__":
    seed()
