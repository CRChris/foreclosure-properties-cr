/**
 * Generates the formal Spanish legal petition to request a court case Consultation PIN
 * (Código de Consulta) from the presiding court under Article 24 of the Constitution
 * and Article 8.1 of the Costa Rican Civil Procedure Code (Principio de Publicidad Procesal).
 */
export function generatePinRequestEmail(params: {
  expediente: string;
  courtName: string;
  recipientEmail?: string;
  fincaNumber?: string;
}) {
  const subject = `Solicitud de Código de Consulta - Expediente N° ${params.expediente}`;
  
  const body = 
`Estimados señores del ${params.courtName},

Por medio de la presente, en mi condición de tercero interesado en el proceso de remate judicial publicado en el Boletín Judicial respecto al expediente número ${params.expediente}${params.fincaNumber ? ` (Finca N° ${params.fincaNumber})` : ''}, y al amparo del Principio de Publicidad Procesal (Artículo 24 de la Constitución Política y Artículo 8.1 del Código Procesal Civil de Costa Rica), solicito respetuosamente se me facilite el CÓDIGO DE CONSULTA (clave de acceso) para el seguimiento del expediente a través de la plataforma Gestión en Línea del Poder Judicial.

Agradezco de antemano el envío de dicha clave a esta misma dirección de correo electrónico para efectos de consulta del expediente y su dictamen pericial de avalúo.

Atentamente,

[Nombre Completo / Razón Social]
[Número de Cédula / Identificación / DIMEX]
[Teléfono de Contacto]

*(Nota: Se adjunta copia de documento de identidad según lo requerido por las normas del Poder Judicial)*`;

  const emailTo = params.recipientEmail || 'gestionenlinea@poder-judicial.go.cr';

  return {
    subject,
    body,
    recipientEmail: emailTo,
    mailtoUrl: `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  };
}
