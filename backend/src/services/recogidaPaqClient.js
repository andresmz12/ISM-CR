// Cliente saliente hacia la API de RECOGIDA-PAQ: el webhook que ellos nos mandan
// solo trae IDs, así que hay que llamarles de vuelta para obtener los datos del
// contacto antes de crear/actualizar el cliente en el CRM.
class RecogidaPaqApiError extends Error {
  constructor(message, status, url, responseBody) {
    super(message);
    this.name = 'RecogidaPaqApiError';
    this.status = status;
    this.url = url;
    this.responseBody = responseBody;
  }
}

async function fetchPickupRequestDetail(pickupRequestId) {
  const baseUrl = process.env.RECOGIDA_PAQ_API_URL;
  const apiKey = process.env.RECOGIDA_PAQ_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new RecogidaPaqApiError('RECOGIDA_PAQ_API_URL/RECOGIDA_PAQ_API_KEY no configurados');
  }

  const url = `${baseUrl}/api/pickup-requests/${pickupRequestId}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    throw new RecogidaPaqApiError(`No se pudo contactar a RECOGIDA-PAQ: ${err.message}`, undefined, url);
  }

  if (!response.ok) {
    // El body del error de RECOGIDA-PAQ se trunca antes de propagarse a los logs:
    // puede incluir la propia API key ecoada en mensajes tipo "API key inválida: xxx".
    const responseBody = await response.text().catch(() => undefined);
    const truncatedBody = responseBody ? responseBody.slice(0, 200) : undefined;
    throw new RecogidaPaqApiError(`RECOGIDA-PAQ respondió ${response.status}`, response.status, url, truncatedBody);
  }

  return response.json();
}

module.exports = { fetchPickupRequestDetail, RecogidaPaqApiError };
