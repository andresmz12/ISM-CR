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
    // best-effort: el body del error de RECOGIDA-PAQ ayuda a diagnosticar (ej. "API key inválida").
    const responseBody = await response.text().catch(() => undefined);
    throw new RecogidaPaqApiError(`RECOGIDA-PAQ respondió ${response.status}`, response.status, url, responseBody);
  }

  const rawBody = await response.text();
  // Log temporal de diagnóstico: nunca se ha confirmado el shape real de esta
  // respuesta contra un webhook real de RECOGIDA-PAQ — este log es lo que
  // permite capturarlo. Quitar una vez confirmado.
  console.log(`[pickup-requests] GET exitoso — url=${url}, pickupRequestId=${pickupRequestId}, body=${rawBody}`);

  return JSON.parse(rawBody);
}

module.exports = { fetchPickupRequestDetail, RecogidaPaqApiError };
