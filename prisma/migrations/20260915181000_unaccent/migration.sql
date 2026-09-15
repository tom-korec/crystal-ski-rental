-- Staff search customers by name without typing accents: "novak" finds "Novák" (FR-61, FR-65).
CREATE EXTENSION IF NOT EXISTS unaccent;
