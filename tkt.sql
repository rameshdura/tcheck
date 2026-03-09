CREATE TABLE tkt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr text UNIQUE NOT NULL,
  name text,
  typeid text,
  type smallint CHECK (type BETWEEN 1 AND 9),
  created timestamp with time zone,
  userId text,
  transactionId text,
  valid smallint CHECK (valid IN (0, 1)),
  vendor smallint CHECK (vendor IN (1, 2))
);
CREATE INDEX idx_tkt_qr ON tkt(qr);
CREATE INDEX idx_tkt_vendor ON tkt(vendor);
CREATE INDEX idx_tkt_valid ON tkt(valid);
