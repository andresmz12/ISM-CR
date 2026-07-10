-- Borrado solicitado explícitamente: se eliminan TODOS los contactos existentes
-- para arrancar de cero con el flujo "primero la empresa, luego sus contactos".
-- Las tablas hijas (interactions, attachments, client_assignments, audit_logs)
-- tienen ON DELETE CASCADE, y deals queda con clientId = NULL (SET NULL), así
-- que un solo DELETE deja la base consistente.
DELETE FROM "clients";
