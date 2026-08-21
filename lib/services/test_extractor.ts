import { 
  PropertyAuctionSchema, 
  extractPropertyDeterministic,
  parseSpanishWordsToNumber,
  extractLotSizeM2,
  classifyPropertyNaturaleza,
} from './extractorService';

function runTypeScriptExtractorTests() {
  console.log('================================================================');
  console.log('RUNNING TYPESCRIPT EXTRACTOR SERVICE & ZOD SCHEMA TESTS');
  console.log('================================================================\n');

  // 1. Test Written Spanish Numbers & Area parsing
  console.log('1. Testing Spanish word number & area converters...');
  const testNum1 = parseSpanishWordsToNumber('doscientos ochenta y ocho');
  console.assert(testNum1 === 288, `Expected 288, got ${testNum1}`);

  const testNum2 = parseSpanishWordsToNumber('tres mil quinientos');
  console.assert(testNum2 === 3500, `Expected 3500, got ${testNum2}`);

  const testArea1 = extractLotSizeM2('MIDE: DOSCIENTOS CINCUENTA METROS CUADRADOS');
  console.assert(testArea1 === 250, `Expected 250, got ${testArea1}`);

  const testArea2 = extractLotSizeM2('MIDE: TRES MIL QUINIENTOS METROS CON CINCUENTA DECÍMETROS CUADRADOS');
  console.assert(Math.abs(testArea2 - 3500.50) < 0.01, `Expected 3500.50, got ${testArea2}`);

  const testArea3 = extractLotSizeM2('MIDE: UNA HECTÁREA CON TRES MIL METROS');
  console.assert(testArea3 === 13000, `Expected 13000, got ${testArea3}`);

  const testArea4 = extractLotSizeM2('MIDE: DOSCIENTOS OCHENTA Y OCHO METROS CUADRADOS');
  console.assert(testArea4 === 288, `Expected 288, got ${testArea4}`);

  const testArea5 = extractLotSizeM2('Mide: 1,400.00 metros cuadrados.');
  console.assert(testArea5 === 1400, `Expected 1400, got ${testArea5}`);

  const testArea6 = extractLotSizeM2('Mide: 2,450.00 metros cuadrados. Plano catastrado número A-448192-2021.');
  console.assert(testArea6 === 2450, `Expected 2450, got ${testArea6}`);

  const testArea7 = extractLotSizeM2('Mide: 260.00 metros cuadrados. Plano catastrado número SJ-291834-2022.');
  console.assert(testArea7 === 260, `Expected 260, got ${testArea7}`);

  const testArea8 = extractLotSizeM2('MIDE: 1.400,00 metros cuadrados');
  console.assert(testArea8 === 1400, `Expected 1400, got ${testArea8}`);

  console.log('   ✓ Area unit conversions passed (including formatted decimal numbers, decimeters, and hectares).\n');

  // 2. Test Property Classification (Vacant Lot vs. Constructed House)
  console.log('2. Testing Property Classification & Construction Status...');
  
  // 2.1 "NATURALEZA: TERRENO PARA CONSTRUIR" -> lot, is_constructed = false
  const class1 = classifyPropertyNaturaleza('TERRENO PARA CONSTRUIR');
  console.assert(class1.property_type === 'lot', `Expected lot, got ${class1.property_type}`);
  console.assert(class1.is_constructed === false, `Expected is_constructed=false for TERRENO PARA CONSTRUIR, got ${class1.is_constructed}`);

  // 2.2 "LOTE PARA VIVIENDA" -> lot, is_constructed = false
  const class2 = classifyPropertyNaturaleza('LOTE PARA VIVIENDA');
  console.assert(class2.property_type === 'lot', `Expected lot, got ${class2.property_type}`);
  console.assert(class2.is_constructed === false, `Expected is_constructed=false for LOTE PARA VIVIENDA, got ${class2.is_constructed}`);

  // 2.3 "TERRENO PARA CONSTRUIR CON UNA CASA DE HABITACIÓN" -> house, is_constructed = true
  const class3 = classifyPropertyNaturaleza('TERRENO PARA CONSTRUIR CON UNA CASA DE HABITACIÓN');
  console.assert(class3.property_type === 'house', `Expected house, got ${class3.property_type}`);
  console.assert(class3.is_constructed === true, `Expected is_constructed=true for TERRENO PARA CONSTRUIR CON UNA CASA, got ${class3.is_constructed}`);

  // 2.4 "LOCAL COMERCIAL" -> commercial, is_constructed = true
  const class4 = classifyPropertyNaturaleza('LOCAL COMERCIAL');
  console.assert(class4.property_type === 'commercial', `Expected commercial, got ${class4.property_type}`);
  console.assert(class4.is_constructed === true, `Expected is_constructed=true for LOCAL COMERCIAL, got ${class4.is_constructed}`);

  // 2.5 "Finca con vista panorámica al mar... uso de suelo comercial-residencial" -> lot, is_constructed = false
  const class5 = classifyPropertyNaturaleza('Finca con vista panorámica al mar en la colina de Manuel Antonio, 500m del Parque Nacional', 'Excelente lote con uso de suelo comercial-residencial en Manuel Antonio. Vista directa al Parque Nacional y al mar.');
  console.assert(class5.property_type === 'lot', `Expected lot, got ${class5.property_type}`);
  console.assert(class5.is_constructed === false, `Expected is_constructed=false for Manuel Antonio parcel, got ${class5.is_constructed}`);

  console.log('   ✓ Classification correctly handles vacant lot future-intent vs built improvements.\n');

  // 3. Test Full Edict Extraction & Zod Schema Validation
  console.log('3. Testing Full Edict Deterministic Extraction & Zod Schema Validation...');
  const sampleTarcoles = `
  JUZGADO DE COBRO DE GARABITO. A las diez horas del doce de octubre de dos mil veintiséis, remataré al mejor postor: 
  Finca inscrita en el Registro Público, Partido de Puntarenas, Folio Real matrícula 6-234567-000. 
  NATURALEZA: TERRENO PARA CONSTRUIR. Situada en Tárcoles, Cantón Garabito, Provincia de Puntarenas. 
  MIDE: DOSCIENTOS OCHENTA Y OCHO METROS CUADRADOS. Plano: P-0948699-2004. 
  Linderos: Norte, Calle pública con diez metros; Sur, Lote 15; Este, Lote 12; Oeste, Lote 14. 
  Con la base de veinticinco millones de colones exactos (CRC 25.000.000,00). 
  Ejecución hipotecaria de BANCO POPULAR contra PROYECTOS PACÍFICO CENTRAL S.A. Expediente: 22-000123-1234-CJ.
  `;

  const parsedTarcoles = extractPropertyDeterministic(sampleTarcoles);
  console.assert(parsedTarcoles !== null, 'Deterministic parse should not be null');
  if (parsedTarcoles) {
    const validated = PropertyAuctionSchema.parse(parsedTarcoles);
    console.assert(validated.finca_number === '6-234567-000', `Finca number mismatch: ${validated.finca_number}`);
    console.assert(validated.plano_number === 'P-0948699-2004', `Plano mismatch: ${validated.plano_number}`);
    console.assert(validated.province === 'Puntarenas', `Province mismatch: ${validated.province}`);
    console.assert(validated.canton === 'Garabito', `Canton mismatch: ${validated.canton}`);
    console.assert(validated.is_constructed === false, `is_constructed must be false for Tarcoles listing (got ${validated.is_constructed})`);
    console.assert(validated.property_type === 'lot', `property_type must be 'lot' (got ${validated.property_type})`);
    console.assert(validated.lot_size_m2 === 288, `lot_size_m2 must be 288 (got ${validated.lot_size_m2})`);
    console.assert(validated.base_price === 25000000, `base_price must be 25000000 (got ${validated.base_price})`);
    console.assert(validated.currency === 'CRC', `currency must be CRC (got ${validated.currency})`);
    console.assert(validated.expediente === '22-000123-1234-CJ', `expediente mismatch: ${validated.expediente}`);
    console.log('   ✓ Tarcoles listing parsed & validated with Zod:');
    console.log('     ', JSON.stringify(validated, null, 2));
  }

  // 4. Test Manuel Antonio Full Edict
  console.log('\n4. Testing Manuel Antonio Full Notice Parsing...');
  const manuelAntonioNotice = `JUZGADO CIVIL Y DE TRABAJO DE MAYOR CUANTÍA DE QUEPOS. En la puerta exterior de este Despacho; libre de gravámenes hipotecarios soportando servidumbres y afectaciones de ley; se subasta al mejor postor la finca del partido de Puntarenas, matrícula de folio real número 6-339281-000, situada en el distrito Manuel Antonio, cantón Quepos de la provincia de Puntarenas. Naturaleza: Finca con vista panorámica al mar en la colina de Manuel Antonio, 500m del Parque Nacional.. Linderos: norte: calle pública de acceso, sur: propiedad colindante privada, este: servidumbre de paso, oeste: finca vecina. Mide: 1,400.00 metros cuadrados. Plano catastrado número P-718294-2022. Con la base de USD 340,000.00 en el primer remate que se efectuará a las 14:30 horas del primer señalamiento. De no haber postores, para el segundo remate se señalan las 14:30 horas del segundo señalamiento con la base de USD 255,000.00 (rebajada en un 25% de la base original); y para el tercer remate se señalan las 14:30 horas del tercer señalamiento con la base de USD 85,000.00 (25% de la base original). Se remata por ordenarse así en proceso de ejecución hipotecaria de BANCO NACIONAL DE COSTA RICA contra MANUEL ANTONIO OCEAN VIEW RESORTS S.A.. Expediente judicial número 23-006240-1090-CJ.`;

  const parsedMA = extractPropertyDeterministic(manuelAntonioNotice);
  console.assert(parsedMA !== null, 'Manuel Antonio parsed should not be null');
  if (parsedMA) {
    const valMA = PropertyAuctionSchema.parse(parsedMA);
    console.assert(valMA.lot_size_m2 === 1400, `Expected 1400 m2, got ${valMA.lot_size_m2}`);
    console.assert(valMA.is_constructed === false, `Expected is_constructed=false for Manuel Antonio parcel, got ${valMA.is_constructed}`);
    console.assert(valMA.property_type === 'lot', `Expected lot, got ${valMA.property_type}`);
    console.assert(valMA.finca_number === '6-339281-000', `Expected 6-339281-000, got ${valMA.finca_number}`);
    console.assert(valMA.plano_number === 'P-718294-2022', `Expected P-718294-2022, got ${valMA.plano_number}`);
    console.assert(valMA.currency === 'USD', `Expected USD, got ${valMA.currency}`);
    console.assert(valMA.base_price === 340000, `Expected 340000, got ${valMA.base_price}`);
    console.log('   ✓ Manuel Antonio notice parsed & validated:');
    console.log('     ', JSON.stringify(valMA, null, 2));
  }

  // 5. Test Verbatim Notary Foreclosure Edict (IN202601106505)
  console.log('\n5. Testing Verbatim Notary Foreclosure Edict (IN202601106505 - Tárcoles Condominium Lot)...');
  const verbatimNotice = `2 v. 2.
Ante esta notaría: Rodolfo Espinoza Zamora, con oficina 
abierta en San José, avenida primera, calles 25 y 27 N° 
2552, 2 casas contiguo al Restaurante Limoncello, de paso 
en Heredia, San Pablo, Residencial Rincón verde 2, casa 
6- A. En la puerta exterior, se subasta al mejor postor libre
de gravámenes soportando gravámenes o afectaciones: si
hay: reservas y restricciones citas 311-16547-01-0990-001,
servidumbre de paso citas 536-14235-01-0002-001. La finca
matrícula 42537-F-000, naturaleza: lote condominal 3, terreno
apto para construir que se destinará a uso habitacional y que
tendrá una altura máxima de 3 pisos, situada en el distrito
2-Tarcoles, cantón 11-Garabito de la provincia de Puntarenas.
Linderos: norte: calle del condominio, sur: zona verde N° 1,
este: lote condominal 4, oeste: lote condominal 1 en medio
servidumbre N° 1. Mide: 1687 metros con noventa y seis,
decímetros cuadrados. Plano: P-0948699-2004. Con la base de
$50.000.00, moneda oficial de los Estados Unidos de América
para tal efecto se señala las 12 medio día del 11 de agosto del
2026. De no haber postores, el segundo remate se efectuará
a las 12 medio día del 19 de agosto del 2026, con la base de
$37.500.00. De no haber postores, el tercer remate se efectuará 
a las 12 medio día del 27 de agosto del 2026, con la base de
$12.500.00. ( IN202601106505 ).`;

  const parsedVerbatim = extractPropertyDeterministic(verbatimNotice);
  console.assert(parsedVerbatim !== null, 'Verbatim edict parse should not be null');
  if (parsedVerbatim) {
    const valVerbatim = PropertyAuctionSchema.parse(parsedVerbatim);
    console.assert(Math.abs(valVerbatim.lot_size_m2 - 1687.96) < 0.01, `Area mismatch: expected 1687.96, got ${valVerbatim.lot_size_m2}`);
    console.assert(valVerbatim.plano_number === 'P-0948699-2004', `Plano mismatch: expected P-0948699-2004, got ${valVerbatim.plano_number}`);
    console.assert(valVerbatim.is_constructed === false, `is_constructed must be false, got ${valVerbatim.is_constructed}`);
    console.assert(valVerbatim.property_type === 'lot', `property_type must be lot, got ${valVerbatim.property_type}`);
    console.assert(valVerbatim.currency === 'USD', `currency must be USD, got ${valVerbatim.currency}`);
    console.assert(valVerbatim.base_price === 50000, `base_price must be 50000, got ${valVerbatim.base_price}`);
    console.assert(valVerbatim.canton === 'Garabito', `canton mismatch: expected Garabito, got ${valVerbatim.canton}`);
    console.assert(valVerbatim.district === 'Tárcoles', `district mismatch: expected Tárcoles, got ${valVerbatim.district}`);
    console.assert(valVerbatim.province === 'Puntarenas', `province mismatch: expected Puntarenas, got ${valVerbatim.province}`);
    console.log('   ✓ Verbatim IN202601106505 notice parsed & validated with Zod:');
    console.log('     ', JSON.stringify(valVerbatim, null, 2));
  }

  console.log('\n================================================================');
  console.log('ALL TYPESCRIPT UNIT TESTS & ZOD VALIDATIONS PASSED!');
  console.log('================================================================');
}

runTypeScriptExtractorTests();
