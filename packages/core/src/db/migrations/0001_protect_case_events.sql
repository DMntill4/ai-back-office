-- Función para bloquear cualquier modificación o borrado en la bitácora inmutable
CREATE OR REPLACE FUNCTION prevent_case_events_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'La tabla case_events es inmutable: no se permite actualizar (UPDATE) ni eliminar (DELETE) eventos registrados.';
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_prevent_case_events_update ON case_events;

--> statement-breakpoint
CREATE TRIGGER trg_prevent_case_events_update
BEFORE UPDATE ON case_events
FOR EACH ROW
EXECUTE FUNCTION prevent_case_events_modification();

--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_prevent_case_events_delete ON case_events;

--> statement-breakpoint
CREATE TRIGGER trg_prevent_case_events_delete
BEFORE DELETE ON case_events
FOR EACH ROW
EXECUTE FUNCTION prevent_case_events_modification();