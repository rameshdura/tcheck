-- Run this in your Supabase SQL Editor to generate demo data!

insert into public.scans (qr_data, status) values 
  ('https://example.com/ticket_12345', 'approved'),
  ('User ID: 98765 - John Doe', 'pending'),
  ('Product Serial: XJ-9000', 'rejected'),
  ('https://example.com/ticket_99999', 'approved'),
  ('Employee Badge: #4421', 'pending');
