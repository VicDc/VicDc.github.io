CREATE TABLE richieste (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  attivita TEXT NOT NULL,
  richiesta TEXT NOT NULL,
  -- version of the privacy notice accepted; created_at is the consent date
  consenso_versione TEXT NOT NULL
);
