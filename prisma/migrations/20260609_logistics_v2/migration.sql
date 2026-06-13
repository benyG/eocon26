ALTER TABLE logistics_tasks ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'todo';
ALTER TABLE logistics_tasks ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'medium';
ALTER TABLE logistics_tasks ADD COLUMN phase VARCHAR(20) NOT NULL DEFAULT 'J-30';
ALTER TABLE logistics_tasks ADD COLUMN notes TEXT;
UPDATE logistics_tasks SET status = 'done' WHERE done = 1;
