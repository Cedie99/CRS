-- Additional sales support price lists (Price List 3, 4, ...) as a JSON string array
ALTER TABLE cis_submissions ADD COLUMN IF NOT EXISTS sales_support_extra_price_lists jsonb;
