-- Renormaliza teléfonos ya guardados con código de país de EE.UU./Canadá
-- (+1) para que queden en el mismo formato de 10 dígitos que usa el resto
-- de la base — el código de la app ya normaliza así (ver
-- backend/src/utils/phone.js), pero valores escritos antes de ese cambio
-- pueden haber quedado con 11 dígitos empezando en "1".
UPDATE "clients"
SET "phoneNormalized" = substring("phoneNormalized" from 2)
WHERE "phoneNormalized" ~ '^1[0-9]{10}$';

UPDATE "clients"
SET "phoneAltNormalized" = substring("phoneAltNormalized" from 2)
WHERE "phoneAltNormalized" ~ '^1[0-9]{10}$';
