import unittest
from scraper.main import extract_single_edict_regex_fallback

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

if __name__ == '__main__':
    unittest.main()

