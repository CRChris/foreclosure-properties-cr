import { Auction } from './types/auction';

export const MOCK_AUCTIONS: Auction[] = [
  {
    id: 'a8b1c2d3-1111-4000-8000-000000000001',
    expediente_number: '23-001428-1158-CJ',
    court_name: 'Juzgado de Cobro y Menor Cuantía de Garabito',
    folio_real: '6-189342-000',
    plano_catastrado: 'P-1928374-2022',
    province: 'Puntarenas',
    canton: 'Garabito',
    district: 'Jacó',
    address_description: 'Condominio Acqua Residences, Piso 5, Unidad 502, frente a Playa Jacó',
    area_m2: 165.50,
    currency: 'USD',
    property_category: 'Condo',
    
    // Call Pricing (1st: $220,000; 2nd: $165,000; 3rd: $55,000)
    base_price_call_1: 220000,
    auction_date_call_1: '2026-09-15T14:30:00-06:00',
    
    base_price_call_2: 165000,
    auction_date_call_2: '2026-10-06T14:30:00-06:00',
    
    base_price_call_3: 55000,
    auction_date_call_3: '2026-10-27T14:30:00-06:00',
    
    estimated_market_value: 340000,
    estimated_margin_pct: 35.29,
    
    plaintiff: 'Banco Nacional de Costa Rica (BNCR)',
    defendant: 'Inversiones Turísticas del Pacífico Jacó S.A.',
    legal_summary: 'Remate judicial de apartamento de lujo frente al mar en piso 5. 3 habitaciones, 2.5 baños, terraza panorámica con vista al océano pacífico y dos espacios de parqueo bajo techo.',
    raw_edict_text: `En la puerta exterior de este Despacho; libre de gravámenes hipotecarios; a las catorce horas y treinta minutos del quince de setiembre de dos mil veintiséis, y con la base de doscientos veinte mil dólares exactos (USD 220,000.00), en el mejor postor remataré lo siguiente: Finca inscrita en el Registro Público, Partido de Puntarenas, Sección de Propiedad, bajo el Sistema de Folio Real matrícula número ciento ochenta y nueve mil trescientos cuarenta y dos guion cero cero cero. La cual es terreno apto para vivienda (Filial 502). Situada en el Distrito 01 Jacó, Cantón 11 Garabito, de la Provincia de Puntarenas. Mide: Ciento sesenta y cinco metros con cincuenta decímetros cuadrados. Plano: P-1928374-2022. Linderos: Norte, Finca filial 501; Sur, Finca filial 503; Este, Pasillo común de acceso; Oeste, Espacio aéreo sobre zona común. Para el segundo remate se señalan las catorce horas y treinta minutos del seis de octubre de dos mil veintiséis, con la base de ciento sesenta y cinco mil dólares (rebajada en un 25%). Y para el tercer remate se señalan las catorce horas y treinta minutos del veintisiete de octubre de dos mil veintiséis, con la base de cincuenta y cinco mil dólares (25% de la base original). Se remata por ordenarse así en proceso ejecución hipotecaria de BANCO NACIONAL DE COSTA RICA contra INVERSIONES TURÍSTICAS DEL PACÍFICO JACÓ S.A. Expediente: 23-001428-1158-CJ.`,
    
    latitude: 9.6152,
    longitude: -84.6298,
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
    ],
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-10T15:20:00Z'
  },
  {
    id: 'a8b1c2d3-2222-4000-8000-000000000002',
    expediente_number: '24-000512-1012-CJ',
    court_name: 'Juzgado Especializado de Cobro del I Circuito Judicial de San José',
    folio_real: '1-452109-000',
    plano_catastrado: 'SJ-1489201-2020',
    province: 'San José',
    canton: 'Escazú',
    district: 'San Rafael',
    address_description: 'Residencial Los Laureles, 250m Norte de Multiplaza Escazú',
    area_m2: 520.00,
    currency: 'USD',
    property_category: 'Luxury Estate',
    
    base_price_call_1: 410000,
    auction_date_call_1: '2026-09-22T10:00:00-06:00',
    
    base_price_call_2: 307500,
    auction_date_call_2: '2026-10-13T10:00:00-06:00',
    
    base_price_call_3: 102500,
    auction_date_call_3: '2026-11-03T10:00:00-06:00',
    
    estimated_market_value: 620000,
    estimated_margin_pct: 33.87,
    
    plaintiff: 'BAC San José S.A. (BAC Credomatic)',
    defendant: 'Desarrollos Residenciales del Oeste S.A.',
    legal_summary: 'Lujosa residencia contemporánea de 2 plantas en exclusivo sector de Escazú. 4 dormitorios en suite, piscina privada, acabados de mármol y garaje para 4 vehículos.',
    raw_edict_text: `En la puerta exterior de este Juzgado; a las diez horas cero minutos del veintidós de setiembre de dos mil veintiséis, con la base de cuatrocientos diez mil dólares exactos (USD 410,000.00), en el mejor postor remataré: Finca del Partido de San José número cuatrocientos cincuenta y dos mil ciento nueve guion cero cero cero. Terreno con casa de habitación. Situada en Distrito 02 San Rafael, Cantón 02 Escazú, San José. Mide: Quinientos veinte metros cuadrados. Plano SJ-1489201-2020. Linderos: Norte, Calle pública con 18 metros de frente; Sur, Lote 14; Este, Propiedad de Inversiones del Río S.A.; Oeste, Lote 12. Segundo remate el trece de octubre de dos mil veintiséis con la base de $307,500.00. Tercer remate el tres de noviembre de dos mil veintiséis con la base de $102,500.00. Proceso Hipotecario BAC SAN JOSÉ S.A. vs DESARROLLOS RESIDENCIALES DEL OESTE S.A. Expediente: 24-000512-1012-CJ.`,
    
    latitude: 9.9248,
    longitude: -84.1432,
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    ],
    created_at: '2026-08-02T11:30:00Z',
    updated_at: '2026-08-11T09:15:00Z'
  },
  {
    id: 'a8b1c2d3-3333-4000-8000-000000000003',
    expediente_number: '23-008914-0298-CA',
    court_name: 'Juzgado Agrario y Civil del II Circuito Judicial de Alajuela (San Carlos)',
    folio_real: '2-289451-000',
    plano_catastrado: 'A-2104928-2019',
    province: 'Alajuela',
    canton: 'San Carlos',
    district: 'Quesada',
    address_description: 'Sector Ron Ron, 3.5 km Este del cruce hacia Florencia',
    area_m2: 45000.00, // 4.5 Hectáreas
    currency: 'CRC',
    property_category: 'Agricultural',
    
    base_price_call_1: 85000000, // ₡85,000,000 CRC
    auction_date_call_1: '2026-09-18T09:00:00-06:00',
    
    base_price_call_2: 63750000,
    auction_date_call_2: '2026-10-09T09:00:00-06:00',
    
    base_price_call_3: 21250000,
    auction_date_call_3: '2026-10-30T09:00:00-06:00',
    
    estimated_market_value: 145000000,
    estimated_margin_pct: 41.38,
    
    plaintiff: 'Banco de Costa Rica (BCR)',
    defendant: 'Agropecuaria Ganadera del Norte S.A.',
    legal_summary: 'Finca agropecuaria y ganadera de 4.5 hectáreas con pastos mejorados, acceso a naciente de agua viva, corral techado y casa rústica para peón.',
    raw_edict_text: `A las nueve horas del dieciocho de setiembre de dos mil veintiséis, con la base de ochenta y cinco millones de colones exactos (CRC 85.000.000,00), en el mejor postor remataré: Finca inscrita en el Registro de la Propiedad, Partido de Alajuela, matrícula doscientos ochenta y nueve mil cuatrocientos cincuenta y uno guion cero cero cero. Terreno de agricultura y pastos. Situada en Ron Ron, Distrito 01 Quesada, Cantón 10 San Carlos, Alajuela. Mide: Cuarenta y cinco mil metros cuadrados (4 ha 5.000 m2). Plano A-2104928-2019. Linderos: Norte, Quebrada Honda; Sur, Servidumbre de paso agrícola; Este, Finca de Juan Rafael Rojas; Oeste, Camino público. Segundo remate: nueve de octubre de 2026 base ₡63.750.000,00. Tercer remate: treinta de octubre de 2026 base ₡21.250.000,00. Proceso Ejecución Prendaria e Hipotecaria del BANCO DE COSTA RICA contra AGROPECUARIA GANADERA DEL NORTE S.A. Expediente: 23-008914-0298-CA.`,
    
    latitude: 10.3238,
    longitude: -84.4271,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1200&q=80'
    ],
    created_at: '2026-08-03T08:00:00Z',
    updated_at: '2026-08-12T14:10:00Z'
  },
  {
    id: 'a8b1c2d3-4444-4000-8000-000000000004',
    expediente_number: '24-000189-0504-CJ',
    court_name: 'Juzgado Especializado de Cobro de Heredia',
    folio_real: '4-198234-000',
    plano_catastrado: 'H-1837492-2021',
    province: 'Heredia',
    canton: 'Belén',
    district: 'San Antonio',
    address_description: 'Zona Industrial La Ribera de Belén, 400m Oeste de Kimberly Clark',
    area_m2: 1250.00,
    currency: 'USD',
    property_category: 'Industrial',
    
    base_price_call_1: 495000,
    auction_date_call_1: '2026-09-25T11:00:00-06:00',
    
    base_price_call_2: 371250,
    auction_date_call_2: '2026-10-16T11:00:00-06:00',
    
    base_price_call_3: 123750,
    auction_date_call_3: '2026-11-06T11:00:00-06:00',
    
    estimated_market_value: 780000,
    estimated_margin_pct: 36.54,
    
    plaintiff: 'Banco Promerica de Costa Rica S.A.',
    defendant: 'Logística y Distribución Belén S.A.',
    legal_summary: 'Bodega industrial y oficinas comerciales de alto estándar logístico. Área de almacenamiento de doble altura (8m), andén de carga para contenedores y 8 parqueos para flotilla.',
    raw_edict_text: `Al ser las once horas del veinticinco de setiembre de dos mil veintiséis, con la base de cuatrocientos noventa y cinco mil dólares exactos (USD 495,000.00), remataré la finca del Partido de Heredia matrícula número ciento noventa y ocho mil doscientos treinta y cuatro guion cero cero cero. Terreno destinado a industria y bodegaje con edificación comercial. Situado en San Antonio, Cantón 07 Belén, Provincia de Heredia. Mide: Mil doscientos cincuenta metros cuadrados. Plano Catastrado H-1837492-2021. Segundo señalamiento: dieciséis de octubre de 2026, base $371,250.00. Tercer señalamiento: seis de noviembre de 2026, base $123,750.00. Proceso Hipotecario BANCO PROMERICA DE COSTA RICA S.A. vs LOGÍSTICA Y DISTRIBUCIÓN BELÉN S.A. Expediente 24-000189-0504-CJ.`,
    
    latitude: 9.9812,
    longitude: -84.1795,
    images: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80'
    ],
    created_at: '2026-08-05T09:45:00Z',
    updated_at: '2026-08-14T11:00:00Z'
  },
  {
    id: 'a8b1c2d3-5555-4000-8000-000000000005',
    expediente_number: '23-003290-0388-CI',
    court_name: 'Juzgado de Cobro y Tránsito de Santa Cruz',
    folio_real: '5-156782-000',
    plano_catastrado: 'G-1948203-2023',
    province: 'Guanacaste',
    canton: 'Santa Cruz',
    district: 'Tamarindo',
    address_description: 'Playa Langosta / Tamarindo, 300m Sur del Hotel Cala Luna',
    area_m2: 2400.00,
    currency: 'USD',
    property_category: 'Land/Development',
    
    base_price_call_1: 320000,
    auction_date_call_1: '2026-09-30T13:30:00-06:00',
    
    base_price_call_2: 240000,
    auction_date_call_2: '2026-10-21T13:30:00-06:00',
    
    base_price_call_3: 80000,
    auction_date_call_3: '2026-11-11T13:30:00-06:00',
    
    estimated_market_value: 580000,
    estimated_margin_pct: 44.83,
    
    plaintiff: 'Scotiabank de Costa Rica S.A.',
    defendant: 'Guanacaste Coastline Developments LLC',
    legal_summary: 'Lote residencial/turístico de alta plusvalía a pasos de Playa Langosta. Topografía plana, uso de suelo mixto comercial/residencial aprobado, disponibilidad de agua de AyA y electricidad.',
    raw_edict_text: `A las trece horas y treinta minutos del treinta de setiembre de dos mil veintiséis, con la base de trescientos veinte mil dólares exactos (USD 320,000.00), remataré el inmueble del Partido de Guanacaste matrícula número ciento cincuenta y seis mil setecientos ochenta y dos guion cero cero cero. Terreno para construir con vocación turística y comercial. Situada en Tamarindo, Cantón 03 Santa Cruz, Guanacaste. Mide: Dos mil cuatrocientos metros cuadrados. Plano G-1948203-2023. Segundo remate: veintiuno de octubre de 2026, base $240,000.00. Tercer remate: once de noviembre de 2026, base $80,000.00. Proceso Ejecución Hipotecaria SCOTIABANK DE COSTA RICA S.A. vs GUANACASTE COASTLINE DEVELOPMENTS LLC. Expediente 23-003290-0388-CI.`,
    
    latitude: 10.2993,
    longitude: -85.8402,
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80'
    ],
    created_at: '2026-08-06T14:20:00Z',
    updated_at: '2026-08-15T16:30:00Z'
  },
  {
    id: 'a8b1c2d3-6666-4000-8000-000000000006',
    expediente_number: '24-001045-0345-CJ',
    court_name: 'Juzgado de Cobro de Cartago',
    folio_real: '3-145672-000',
    plano_catastrado: 'C-1784920-2018',
    province: 'Cartago',
    canton: 'La Unión',
    district: 'Tres Ríos',
    address_description: 'Condominio Monterán / Villas de Ayarco, 500m Sur de Ciudad del Este',
    area_m2: 285.00,
    currency: 'CRC',
    property_category: 'Residential',
    
    base_price_call_1: 68000000, // ₡68,000,000 CRC (~$130k USD)
    auction_date_call_1: '2026-09-16T15:00:00-06:00',
    
    base_price_call_2: 51000000,
    auction_date_call_2: '2026-10-07T15:00:00-06:00',
    
    base_price_call_3: 17000000,
    auction_date_call_3: '2026-10-28T15:00:00-06:00',
    
    estimated_market_value: 110000000,
    estimated_margin_pct: 38.18,
    
    plaintiff: 'Banco Popular y de Desarrollo Comunal',
    defendant: 'Inversiones Morales & Asociados S.A.',
    legal_summary: 'Casa contemporánea en condominio cerrado con seguridad 24/7. 3 dormitorios, 2 baños y medio, terraza con jardín trasero, cochera para 2 autos y amenidades de casa club con piscina temperada.',
    raw_edict_text: `A las quince horas cero minutos del dieciséis de setiembre de dos mil veintiséis, con la base de sesenta y ocho millones de colones netos (CRC 68.000.000,00), en el mejor postor remataré: Finca inscrita en el Registro Inmobiliario de Cartago número ciento cuarenta y cinco mil seiscientos setenta y dos guion cero cero cero. Terreno con casa de habitación en condominio. Situada en Tres Ríos, Cantón 03 La Unión, Provincia de Cartago. Mide: Doscientos ochenta y cinco metros cuadrados. Plano C-1784920-2018. Segundo remate: siete de octubre de 2026, base ₡51.000.000,00. Tercer remate: veintiocho de octubre de 2026, base ₡17.000.000,00. Proceso Ejecutivo Hipotecario de BANCO POPULAR Y DE DESARROLLO COMUNAL contra INVERSIONES MORALES & ASOCIADOS S.A. Expediente 24-001045-0345-CJ.`,
    
    latitude: 9.9076,
    longitude: -83.9875,
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'
    ],
    created_at: '2026-08-07T11:00:00Z',
    updated_at: '2026-08-16T10:00:00Z'
  },
  {
    id: 'a8b1c2d3-7777-4000-8000-000000000007',
    expediente_number: '24-000843-1158-CJ',
    court_name: 'Juzgado Especializado de Cobro de San José',
    folio_real: '1-512093-000',
    plano_catastrado: 'SJ-2039485-2022',
    province: 'San José',
    canton: 'Santa Ana',
    district: 'Pozos',
    address_description: 'Condominio Bosques de Lindora, 300m Oeste de Terrazas Lindora',
    area_m2: 380.00,
    currency: 'USD',
    property_category: 'Residential',
    
    base_price_call_1: 285000,
    auction_date_call_1: '2026-09-28T09:30:00-06:00',
    
    base_price_call_2: 213750,
    auction_date_call_2: '2026-10-19T09:30:00-06:00',
    
    base_price_call_3: 71250,
    auction_date_call_3: '2026-11-09T09:30:00-06:00',
    
    estimated_market_value: 430000,
    estimated_margin_pct: 33.72,
    
    plaintiff: 'Banco Davivienda (Costa Rica) S.A.',
    defendant: 'Servicios Corporativos Pozos S.A.',
    legal_summary: 'Casa moderna de 2 niveles en prestigioso condominio de Santa Ana. Acabados finos, aire acondicionado central, terraza BBQ y acceso a canchas de tenis y piscina.',
    raw_edict_text: `A las nueve horas y treinta minutos del veintiocho de setiembre de dos mil veintiséis, con la base de doscientos ochenta y cinco mil dólares exactos (USD 285,000.00), remataré la finca del Partido de San José número quinientos doce mil noventa y tres guion cero cero cero. Terreno para construir con casa de habitación. Situada en Pozos, Cantón 09 Santa Ana, San José. Mide: Trescientos ochenta metros cuadrados. Plano SJ-2039485-2022. Segundo remate: diecinueve de octubre de 2026 base $213,750.00. Tercer remate: nueve de noviembre de 2026 base $71,250.00. Proceso BANCO DAVIVIENDA vs SERVICIOS CORPORATIVOS POZOS S.A. Expediente 24-000843-1158-CJ.`,
    
    latitude: 9.9538,
    longitude: -84.2045,
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ],
    created_at: '2026-08-08T09:00:00Z',
    updated_at: '2026-08-16T14:30:00Z'
  },
  {
    id: 'a8b1c2d3-8888-4000-8000-000000000008',
    expediente_number: '23-007120-0675-CJ',
    court_name: 'Juzgado Civil y de Trabajo de Limón',
    folio_real: '7-098231-000',
    plano_catastrado: 'L-1658490-2020',
    province: 'Limón',
    canton: 'Talamanca',
    district: 'Cahuita',
    address_description: 'Playa Negra / Puerto Viejo, 150m Oeste de la entrada principal',
    area_m2: 1800.00,
    currency: 'USD',
    property_category: 'Land/Development',
    
    base_price_call_1: 140000,
    auction_date_call_1: '2026-10-02T10:30:00-06:00',
    
    base_price_call_2: 105000,
    auction_date_call_2: '2026-10-23T10:30:00-06:00',
    
    base_price_call_3: 35000,
    auction_date_call_3: '2026-11-13T10:30:00-06:00',
    
    estimated_market_value: 240000,
    estimated_margin_pct: 41.67,
    
    plaintiff: 'Banco de Costa Rica (BCR)',
    defendant: 'Caribe Eco-Lodge & Villas S.A.',
    legal_summary: 'Propiedad con exuberante vegetación tropical caribeña a 200 metros de Playa Negra, Puerto Viejo. Excelente potencial para eco-lodges, cabinas turísticas o retiro privado.',
    raw_edict_text: `A las diez horas y treinta minutos del dos de octubre de dos mil veintiséis, con la base de ciento cuarenta mil dólares exactos (USD 140,000.00), remataré la finca de Limón matrícula número noventa y ocho mil doscientos treinta y uno guion cero cero cero. Terreno para construir y vegetación. Situada en Cahuita, Cantón 04 Talamanca, Limón. Mide: Mil ochocientos metros cuadrados. Plano L-1658490-2020. Segundo remate: veintitrés de octubre de 2026 base $105,000.00. Tercer remate: trece de noviembre de 2026 base $35,000.00. Proceso BCR vs CARIBE ECO-LODGE & VILLAS S.A. Expediente 23-007120-0675-CJ.`,
    
    latitude: 9.6582,
    longitude: -82.7564,
    images: [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80'
    ],
    created_at: '2026-08-09T13:00:00Z',
    updated_at: '2026-08-17T08:00:00Z'
  }
];
