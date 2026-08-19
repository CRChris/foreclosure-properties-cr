import unittest
from scraper.main import (
    extract_single_edict_regex_fallback,
    segment_document_blocks,
    html_to_clean_text,
    is_real_estate_foreclosure_edict
)

class TestTarcolesEdict(unittest.TestCase):
    def test_tarcoles_edict_extraction(self):
        edict_text = (
            "2 v. 2.\n"
            "Ante esta notaría: Rodolfo Espinoza Zamora, con oficina \n"
            "abierta en San José, avenida primera, calles 25 y 27 N° \n"
            "2552, 2 casas contiguo al Restaurante Limoncello, de paso \n"
            "en Heredia, San Pablo, Residencial Rincón verde 2, casa \n"
            "6- A. En la puerta exterior, se subasta al mejor postor libre\n"
            "de gravámenes soportando gravámenes o afectaciones: si\n"
            "hay: reservas y restricciones citas 311-16547-01-0990-001,\n"
            "servidumbre de paso citas 536-14235-01-0002-001. La finca\n"
            "matrícula 42537-F-000, naturaleza: lote condominal 3, terreno\n"
            "apto para construir que se destinará a uso habitacional y que\n"
            "tendrá una altura máxima de 3 pisos, situada en el distrito\n"
            "2-Tarcoles, cantón 11-Garabito de la provincia de Puntarenas.\n"
            "Linderos: norte: calle del condominio, sur: zona verde N° 1,\n"
            "este: lote condominal 4, oeste: lote condominal 1 en medio\n"
            "servidumbre N° 1. Mide: 1687 metros con noventa y seis,\n"
            "decímetros cuadrados. Plano: P-0948699-2004. Con la base de\n"
            "$50.000.00, moneda oficial de los Estados Unidos de América\n"
            "para tal efecto se señala las 12 medio día del 11 de agosto del\n"
            "2026. De no haber postores, el segundo remate se efectuará\n"
            "a las 12 medio día del 19 de agosto del 2026, con la base de\n"
            "$37.500.00. De no haber postores, el tercer remate se efectuará \n"
            "a las 12 medio día del 27 de agosto del 2026, con la base de\n"
            "$12.500.00. Nota se les informa a las personas interesadas\n"
            "en participar en la almoneda podrán hacerlo entregando al\n"
            "fiduciario Aroma de Lirio S. A., cédula jurídica: 3-101-654019,\n"
            "un cheque certificado, comprobante de transferencia bancaria\n"
            "a favor del fiduciario por un monto equivalente al 50 % de la\n"
            "base fijada para el primer remate. Para participar en el segundo\n"
            "o tercer remate deberán hacerlo entregando al fiduciario un\n"
            "cheque certificado comprobante de transferencia bancaria por\n"
            "un monto equivalente al 100 % de la base fijada. Se subasta así\n"
            "en cumplimiento del contrato del fideicomiso llamado: contrato\n"
            "de crédito y constitución de fideicomiso: Nativa Mapa Tres S.A.\n"
            "-Rodolfo Andrés Abarca Blanco-Aroma de Lirio S.A- Un Roodo\n"
            "Despertar Mundial S. A. 2025.—10 de julio del 2026.—Rodolfo\n"
            "Espinoza Zamora, Notario.—( IN202601106505 )."
        )
        result = extract_single_edict_regex_fallback(edict_text)
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result.area_m2, 1687.96, places=2)
        self.assertEqual(result.plano_catastrado, 'P-0948699-2004')
        self.assertEqual(result.canton, 'Garabito')
        self.assertEqual(result.district, 'Tarcoles')
        self.assertEqual(result.province, 'Puntarenas')
        self.assertFalse(result.has_construction)
        self.assertEqual(result.currency, 'USD')
        self.assertEqual(result.base_price_call_1, 50000.0)
        self.assertEqual(result.base_price_call_2, 37500.0)
        self.assertEqual(result.base_price_call_3, 12500.0)
        self.assertEqual(result.raw_edict_text, edict_text)

    def test_single_edict_never_cut_off_by_internal_clauses(self):
        """Ensures notices with internal PRIMER REMATE, SEGUNDO REMATE, EXPEDIENTE, and Referencia are NEVER cut off."""
        full_notice = (
            "JUZGADO ESPECIALIZADO DE COBRO DE SAN JOSÉ. En la puerta exterior de este Despacho; "
            "libre de gravámenes hipotecarios soportando servidumbres; se subasta al mejor postor la finca "
            "del partido de San José, matrícula de folio real número 1-452109-000, situada en el distrito San Rafael, "
            "cantón Escazú de la provincia de San José. Naturaleza: Terreno y casa de habitación en condominio horizontal "
            "residencial Los Laureles, casa filial número 14. Linderos: norte: calle interna, sur: zona verde, "
            "este: filial 15, oeste: filial 13. Mide: 285.50 metros cuadrados. Plano: SJ-1489201-2020.\n"
            "PRIMER REMATE: A las catorce horas y treinta minutos del quince de setiembre de dos mil veintiséis con la base de USD $210,000.00.\n"
            "SEGUNDO REMATE: A las catorce horas y treinta minutos del veintinueve de setiembre con la base de USD $157,500.00.\n"
            "TERCER REMATE: A las catorce horas y treinta minutos del trece de octubre con la base de USD $52,500.00.\n"
            "Ejecución hipotecaria de BANCO NACIONAL DE COSTA RICA contra DESARROLLOS RESIDENCIALES DE ESCAZU S.A.\n"
            "Expediente número 23-001428-1158-CJ.\n"
            "Referencia N°: 2026185164, publicación número: 2 de 2.—( IN202601142811 ). 3 v. 1."
        )
        blocks = segment_document_blocks(full_notice)
        self.assertEqual(len(blocks), 1, "Single edict must not be split into multiple fragmented pieces")
        self.assertTrue(blocks[0].startswith("JUZGADO ESPECIALIZADO DE COBRO"))
        self.assertTrue(blocks[0].endswith("( IN202601142811 ). 3 v. 1."))
        self.assertTrue(is_real_estate_foreclosure_edict(blocks[0]))

    def test_multi_notice_document_segmentation(self):
        """Ensures multi-notice publications cleanly split between notices preserving complete text for each."""
        notice_1 = (
            "JUZGADO DE COBRO DE ALAJUELA. A las 10:00 horas del 15 de setiembre de 2026, en este Despacho, "
            "se remata la finca 2-123456-000, terreno para construir en San José de Alajuela, mide 500 m2. "
            "Base ¢10.000.000. Expediente 22-001234-1020-CJ.—( IN2026019991 )."
        )
        notice_2 = (
            "2 v. 2. Ante esta notaría: Rodolfo Espinoza Zamora, con oficina en San José... "
            "se subasta la finca 6-42537-000, lote condominal 3 en Garabito de Puntarenas. "
            "Mide 1687.96 m2. Base $50,000. Expediente ED-IN202601106505.—( IN202601106505 )."
        )
        combined_doc = f"{notice_1}\n\n{notice_2}"
        blocks = segment_document_blocks(combined_doc)
        self.assertEqual(len(blocks), 2)
        self.assertEqual(blocks[0], notice_1)
        self.assertEqual(blocks[1], notice_2)

    def test_html_cleaning_and_entity_decoding(self):
        """Ensures HTML tags and entities like &#xa0; and &aacute; are unescaped and formatted cleanly."""
        raw_html = "<p>JUZGADO CIVIL&#xa0;DE&#xa0;SAN JOS&Eacute;.<br/>Se remata la finca 1-123456-000.</p>"
        cleaned = html_to_clean_text(raw_html)
        self.assertIn("JUZGADO CIVIL DE SAN JOSÉ.", cleaned)
        self.assertIn("Se remata la finca 1-123456-000.", cleaned)
        self.assertNotIn("<p>", cleaned)
        self.assertNotIn("&#xa0;", cleaned)

if __name__ == '__main__':
    unittest.main()


