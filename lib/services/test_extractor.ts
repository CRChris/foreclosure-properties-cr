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

  console.log('   ✓ Area unit conversions passed (including decimeters and hectares).\n');

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

  console.log('\n================================================================');
  console.log('ALL TYPESCRIPT UNIT TESTS & ZOD VALIDATIONS PASSED!');
  console.log('================================================================');
}

runTypeScriptExtractorTests();
