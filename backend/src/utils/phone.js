// Normaliza teléfonos a solo dígitos para comparar duplicados y matchear
// webhooks entrantes contra clientes existentes ("8888-1234" y "88881234"
// deben coincidir).
//
// Números de EE.UU./Canadá con código de país (+1) llegan como 11 dígitos
// empezando en "1" (p. ej. ZyraVoice manda "+17733406410"), pero se capturan
// y guardan sin código de país como 10 dígitos ("7733406410"). Sin recortar
// ese "1", el mismo número nunca matchea entre el que llega vía webhook/import
// y el que ya está en la base — se recorta aquí, en el único lugar donde se
// normaliza, para que todos los llamadores (creación de cliente, dedupe de
// duplicados, webhooks de ZyraVoice/RECOGIDA-PAQ/leads) queden consistentes.
function normalizePhone(p) {
  const digits = String(p ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

function normalizePhoneOrNull(p) {
  const n = normalizePhone(p);
  return n || null;
}

module.exports = { normalizePhone, normalizePhoneOrNull };
