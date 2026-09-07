-- Required by the automatic custody/archived-request workflow.
ALTER TYPE estado_solicitud ADD VALUE IF NOT EXISTS 'Almacenado';
