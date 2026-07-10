// Cliente saliente hacia la API de RECOGIDA-PAQ: el webhook que ellos nos mandan
// solo trae IDs, así que hay que llamarles de vuelta para obtener los datos del
// contacto antes de crear/actualizar el cliente en el CRM.
class RecogidaPaqApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'RecogidaPaqApiError';
    this.status = status;
  }
}

async function fetchPickupRequestDetail(pickupRequestId) {
  const baseUrl = process.env.RECOGIDA_PAQ_API_URL;
  const apiKey = process.env.RECOGIDA_PAQ_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new RecogidaPaqApiError('RECOGIDA_PAQ_API_URL/RECOGIDA_PAQ_API_KEY no configurados');
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/api/pickup-requests/${pickupRequestId}`, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    throw new RecogidaPaqApiError(`No se pudo contactar a RECOGIDA-PAQ: ${err.message}`);
  }

  if (!response.ok) {
    throw new RecogidaPaqApiError(`RECOGIDA-PAQ respondió ${response.status}`, response.status);
  }

  return response.json();
}

module.exports = { fetchPickupRequestDetail, RecogidaPaqApiError };
