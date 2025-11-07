-- Migration number: 0002 	 2025-11-06T23:18:06.742Z

ALTER TABLE lunchmoney_actions ADD COLUMN old_entry_notified BOOLEAN DEFAULT FALSE;
