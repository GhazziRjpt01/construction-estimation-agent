-- PLACEHOLDER DATA. Verify every number against real supplier prices, a cost database or a contractor before trusting any estimate.
-- Reloading this file does not replace rows that already exist. Clear the catalog tables before running it again, or the old fixed duct length and wall studs stay in place.
--
-- Every price, rate, quantity, and labor hour below is a rough placeholder.
-- Dimensional units are stored as m, m2, m3, or L. The app converts those to
-- ft, sqft, yd3, and gal for an imperial region.
-- quantity_per_unit is the factor the estimator multiplies. The waste column
-- is stored for reference and is not applied again.
-- Labor is a separate row (material_id null). Its hours are quantity_per_unit
-- with unit hr. labor_hours_per_unit repeats that same placeholder.
-- Trade keys are the codes the estimator looks up. The notes name the trade.

insert into regions (
  id,
  country,
  currency,
  unit_system,
  tax_label,
  default_sales_tax,
  default_labor_burden,
  default_overhead_profit,
  default_contingency
) values (
  'US-default',
  'US',
  'USD',
  'imperial',
  'Sales tax',
  0.06,
  0.30,
  0.15,
  0.07
)
on conflict do nothing;

insert into location_factors (
  region_code,
  name,
  material_factor,
  labor_factor,
  is_placeholder,
  notes
) values (
  'US-default',
  'US default',
  1.0,
  1.0,
  true,
  'PLACEHOLDER location factor. Verify before use.'
)
on conflict do nothing;

insert into materials (id, code, name, unit, category, csi_division) values
  ('stud-2x6', 'stud-2x6', '2x6 stud', 'ea', 'framing', '06'),
  ('stud-2x4', 'stud-2x4', '2x4 stud', 'ea', 'framing', '06'),
  ('osb-sheet', 'osb-sheet', 'OSB sheet', 'sheet', 'sheathing', '06'),
  ('house-wrap', 'house-wrap', 'House wrap', 'm2', 'moisture', '07'),
  ('insulation-batt', 'insulation-batt', 'Insulation batt', 'batt', 'insulation', '07'),
  ('drywall-sheet', 'drywall-sheet', 'Drywall sheet', 'sheet', 'finishes', '09'),
  ('siding', 'siding', 'Siding', 'm2', 'cladding', '07'),
  ('roof-truss', 'roof-truss', 'Roof truss', 'ea', 'framing', '06'),
  ('shingle-square', 'shingle-square', 'Shingle square', 'm2', 'roofing', '07'),
  ('concrete-yd3', 'concrete-yd3', 'Concrete', 'm3', 'concrete', '03'),
  ('rebar-no4', 'rebar-no4', 'Rebar', 'm', 'concrete', '03'),
  ('vapor-barrier', 'vapor-barrier', 'Vapor barrier', 'm2', 'moisture', '07'),
  ('anchor-bolts', 'anchor-bolts', 'Anchor bolts', 'ea', 'concrete', '03'),
  ('joint-compound', 'joint-compound', 'Joint compound', 'L', 'finishes', '09'),
  ('interior-paint', 'interior-paint', 'Paint gallon', 'L', 'finishes', '09'),
  ('flooring', 'flooring', 'Flooring', 'm2', 'finishes', '09'),
  ('pex-pipe', 'pex-pipe', 'PEX pipe', 'm', 'plumbing', '22'),
  ('pvc-drain', 'pvc-drain', 'PVC drain pipe', 'm', 'plumbing', '22'),
  ('electrical-wire', 'electrical-wire', 'Electrical wire', 'm', 'electrical', '26'),
  ('electrical-device', 'electrical-device', 'Outlet and switch', 'ea', 'electrical', '26'),
  ('breaker-panel', 'breaker-panel', 'Breaker panel', 'ea', 'electrical', '26'),
  ('heat-pump', 'heat-pump', 'Heat pump unit', 'ea', 'hvac', '23'),
  ('ductwork', 'ductwork', 'Ductwork', 'm', 'hvac', '23'),
  ('plate-2x6', 'plate-2x6', '2x6 plate', 'm', 'framing', '06'),
  ('plate-2x4', 'plate-2x4', '2x4 plate', 'm', 'framing', '06'),
  ('header-2x6', 'header-2x6', '2x6 header', 'ea', 'framing', '06'),
  ('stair-run', 'stair-run', 'Stair run', 'ea', 'framing', '06'),
  ('window-unit', 'window-unit', 'Window unit', 'ea', 'openings', '08'),
  ('exterior-door', 'exterior-door', 'Exterior door', 'ea', 'openings', '08'),
  ('interior-door', 'interior-door', 'Interior door', 'ea', 'openings', '08'),
  ('water-heater', 'water-heater', 'Water heater', 'ea', 'plumbing', '22'),
  ('plumbing-valve', 'plumbing-valve', 'Valve and fitting', 'ea', 'plumbing', '22'),
  ('electrical-box', 'electrical-box', 'Electrical box', 'ea', 'electrical', '26'),
  ('light-fixture', 'light-fixture', 'Light fixture', 'ea', 'electrical', '26'),
  ('excavation', 'excavation', 'Excavation', 'm3', 'earthwork', '31'),
  ('grading', 'grading', 'Grading', 'm2', 'earthwork', '31')
on conflict do nothing;

insert into material_prices (material_id, region_code, unit_cost, is_placeholder, notes) values
  ('stud-2x6', 'US-default', 9, true, 'PLACEHOLDER'),
  ('stud-2x4', 'US-default', 5, true, 'PLACEHOLDER'),
  ('osb-sheet', 'US-default', 25, true, 'PLACEHOLDER'),
  ('house-wrap', 'US-default', 2.15, true, 'PLACEHOLDER per m2'),
  ('insulation-batt', 'US-default', 2, true, 'PLACEHOLDER'),
  ('drywall-sheet', 'US-default', 15, true, 'PLACEHOLDER'),
  ('siding', 'US-default', 43, true, 'PLACEHOLDER per m2'),
  ('roof-truss', 'US-default', 150, true, 'PLACEHOLDER'),
  ('shingle-square', 'US-default', 16, true, 'PLACEHOLDER per m2'),
  ('concrete-yd3', 'US-default', 196, true, 'PLACEHOLDER per m3'),
  ('rebar-no4', 'US-default', 5, true, 'PLACEHOLDER per m'),
  ('vapor-barrier', 'US-default', 1.50, true, 'PLACEHOLDER per m2'),
  ('anchor-bolts', 'US-default', 2, true, 'PLACEHOLDER'),
  ('joint-compound', 'US-default', 3, true, 'PLACEHOLDER per L'),
  ('interior-paint', 'US-default', 11, true, 'PLACEHOLDER per L'),
  ('flooring', 'US-default', 40, true, 'PLACEHOLDER per m2'),
  ('pex-pipe', 'US-default', 3, true, 'PLACEHOLDER per m'),
  ('pvc-drain', 'US-default', 4, true, 'PLACEHOLDER per m'),
  ('electrical-wire', 'US-default', 2, true, 'PLACEHOLDER per m'),
  ('electrical-device', 'US-default', 25, true, 'PLACEHOLDER'),
  ('breaker-panel', 'US-default', 250, true, 'PLACEHOLDER'),
  ('heat-pump', 'US-default', 8000, true, 'PLACEHOLDER'),
  ('ductwork', 'US-default', 25, true, 'PLACEHOLDER per m'),
  ('plate-2x6', 'US-default', 3, true, 'PLACEHOLDER per m'),
  ('plate-2x4', 'US-default', 2, true, 'PLACEHOLDER per m'),
  ('header-2x6', 'US-default', 18, true, 'PLACEHOLDER'),
  ('stair-run', 'US-default', 800, true, 'PLACEHOLDER'),
  ('window-unit', 'US-default', 350, true, 'PLACEHOLDER'),
  ('exterior-door', 'US-default', 450, true, 'PLACEHOLDER'),
  ('interior-door', 'US-default', 180, true, 'PLACEHOLDER'),
  ('water-heater', 'US-default', 900, true, 'PLACEHOLDER'),
  ('plumbing-valve', 'US-default', 12, true, 'PLACEHOLDER'),
  ('electrical-box', 'US-default', 4, true, 'PLACEHOLDER'),
  ('light-fixture', 'US-default', 45, true, 'PLACEHOLDER'),
  ('excavation', 'US-default', 45, true, 'PLACEHOLDER per m3'),
  ('grading', 'US-default', 8, true, 'PLACEHOLDER per m2')
on conflict do nothing;

insert into labor_rates (trade, region_code, hourly_rate, is_placeholder, notes) values
  ('concrete', 'US-default', 70, true, 'PLACEHOLDER — concrete finisher'),
  ('framer', 'US-default', 75, true, 'PLACEHOLDER — carpenter'),
  ('mason', 'US-default', 80, true, 'PLACEHOLDER — mason'),
  ('roofer', 'US-default', 70, true, 'PLACEHOLDER — roofer'),
  ('sider', 'US-default', 65, true, 'PLACEHOLDER — siding installer. Required by the exterior-wall assembly.'),
  ('drywall', 'US-default', 60, true, 'PLACEHOLDER — drywall installer'),
  ('painter', 'US-default', 55, true, 'PLACEHOLDER — painter'),
  ('plumber', 'US-default', 95, true, 'PLACEHOLDER — plumber'),
  ('electrician', 'US-default', 95, true, 'PLACEHOLDER — electrician'),
  ('hvac', 'US-default', 90, true, 'PLACEHOLDER — HVAC technician'),
  ('operator', 'US-default', 85, true, 'PLACEHOLDER — equipment operator'),
  ('openings', 'US-default', 70, true, 'PLACEHOLDER — finish carpenter')
on conflict do nothing;

insert into assemblies (id, code, name, description, output_unit, csi_division) values
  (
    'slab-foundation',
    'slab-foundation',
    'Slab foundation',
    'Slab on grade per square metre of footprint.',
    'm2',
    '03'
  ),
  (
    'exterior-wall',
    'exterior-wall',
    'Exterior wall 2x6',
    'OSB, house wrap, insulation, drywall, and siding per square metre of wall. Studs, plates, and headers are separate assemblies.',
    'm2',
    '06'
  ),
  (
    'roof',
    'roof',
    'Roof system',
    'Trusses, sheathing, and shingles per square metre of roof.',
    'm2',
    '07'
  ),
  (
    'interior-finishes',
    'interior-finishes',
    'Interior finishes',
    'Drywall, joint compound, paint, and flooring per square metre of floor. Partition studs are a separate assembly.',
    'm2',
    '09'
  ),
  (
    'plumbing-fixture',
    'plumbing-fixture',
    'Plumbing',
    'PEX supply, PVC drain, and valves per fixture. The water heater is a separate assembly.',
    'fixture',
    '22'
  ),
  (
    'electrical-point',
    'electrical-point',
    'Electrical',
    'Wire, one box, and one outlet or switch per point. The breaker panel and light fixtures are separate assemblies.',
    'point',
    '26'
  ),
  (
    'hvac-heat-pump',
    'hvac-heat-pump',
    'HVAC heat pump',
    'One heat pump per house. Ductwork is a separate assembly priced from floor area.',
    'system',
    '23'
  ),
  (
    'site-excavation',
    'site-excavation',
    'Site excavation',
    'Excavation and grading per square metre of footprint.',
    'm2',
    '31'
  ),
  (
    'exterior-studs',
    'exterior-studs',
    'Exterior studs',
    'One 2x6 stud. Quantity comes from spacing, corners, and openings.',
    'ea',
    '06'
  ),
  (
    'wall-plates',
    'wall-plates',
    'Exterior plates',
    '2x6 plate stock per metre. Quantity is three runs of wall length.',
    'm',
    '06'
  ),
  (
    'opening-headers',
    'opening-headers',
    'Opening header',
    'One header per window or exterior door.',
    'ea',
    '06'
  ),
  (
    'interior-partitions',
    'interior-partitions',
    'Interior partition',
    '2x4 studs and plates per metre of partition.',
    'm',
    '06'
  ),
  (
    'stairs',
    'stairs',
    'Stairs',
    'One straight stair run. Quantity is stories minus 1.',
    'ea',
    '06'
  ),
  (
    'window',
    'window',
    'Window',
    'One window unit. Count comes from floor area.',
    'ea',
    '08'
  ),
  (
    'exterior-door',
    'exterior-door',
    'Exterior door',
    'One exterior door.',
    'ea',
    '08'
  ),
  (
    'interior-door',
    'interior-door',
    'Interior door',
    'One interior door. Count comes from bedrooms and bathrooms.',
    'ea',
    '08'
  ),
  (
    'water-heater',
    'water-heater',
    'Water heater',
    'One water heater per house.',
    'ea',
    '22'
  ),
  (
    'hvac-ductwork',
    'hvac-ductwork',
    'HVAC ductwork',
    'Ductwork per square metre of floor. Not a fixed length.',
    'm2',
    '23'
  ),
  (
    'light-fixture',
    'light-fixture',
    'Light fixture',
    'One light fixture. Count comes from floor area.',
    'ea',
    '26'
  ),
  (
    'breaker-panel',
    'breaker-panel',
    'Breaker panel',
    'One breaker panel per house.',
    'ea',
    '26'
  )
on conflict do nothing;

insert into assembly_items (
  assembly_id,
  material_id,
  quantity_per_unit,
  unit,
  waste,
  labor_hours_per_unit,
  notes
) values
  ('slab-foundation', 'concrete-yd3', 0.1234, 'm3', 0.05, 0, 'PLACEHOLDER'),
  ('slab-foundation', 'rebar-no4', 4.9213, 'm', 0.05, 0, 'PLACEHOLDER'),
  ('slab-foundation', 'vapor-barrier', 1.10, 'm2', 0.05, 0, 'PLACEHOLDER'),
  ('slab-foundation', 'anchor-bolts', 0.40, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('exterior-wall', 'osb-sheet', 0.4306, 'sheet', 0.05, 0, 'PLACEHOLDER'),
  ('exterior-wall', 'house-wrap', 1.15, 'm2', 0.05, 0, 'PLACEHOLDER'),
  ('exterior-wall', 'insulation-batt', 1.6146, 'batt', 0.05, 0, 'PLACEHOLDER'),
  ('exterior-wall', 'drywall-sheet', 0.4306, 'sheet', 0.05, 0, 'PLACEHOLDER'),
  ('exterior-wall', 'siding', 1.15, 'm2', 0.05, 0, 'PLACEHOLDER'),
  ('roof', 'roof-truss', 0.2153, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('roof', 'osb-sheet', 0.4306, 'sheet', 0.05, 0, 'PLACEHOLDER'),
  ('roof', 'shingle-square', 1.20, 'm2', 0.05, 0, 'PLACEHOLDER'),
  ('interior-finishes', 'drywall-sheet', 0.8611, 'sheet', 0.05, 0, 'PLACEHOLDER'),
  ('interior-finishes', 'joint-compound', 0.20, 'L', 0.05, 0, 'PLACEHOLDER'),
  ('interior-finishes', 'interior-paint', 0.8149, 'L', 0.05, 0, 'PLACEHOLDER'),
  ('interior-finishes', 'flooring', 1.10, 'm2', 0.05, 0, 'PLACEHOLDER'),
  ('plumbing-fixture', 'pex-pipe', 8, 'm', 0.05, 0, 'PLACEHOLDER'),
  ('plumbing-fixture', 'pvc-drain', 4, 'm', 0.05, 0, 'PLACEHOLDER'),
  ('plumbing-fixture', 'plumbing-valve', 4, 'ea', 0.05, 0, 'PLACEHOLDER. Four valves and fittings per fixture.'),
  ('electrical-point', 'electrical-wire', 6, 'm', 0.05, 0, 'PLACEHOLDER'),
  ('electrical-point', 'electrical-device', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('electrical-point', 'electrical-box', 1, 'ea', 0.05, 0, 'PLACEHOLDER. One box per point.'),
  ('hvac-heat-pump', 'heat-pump', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('hvac-ductwork', 'ductwork', 0.45, 'm', 0.05, 0, 'PLACEHOLDER. Metres of duct per m2 of floor.'),
  ('site-excavation', 'excavation', 0.30, 'm3', 0.05, 0, 'PLACEHOLDER. 300 mm cut per m2 of footprint.'),
  ('site-excavation', 'grading', 1, 'm2', 0.05, 0, 'PLACEHOLDER'),
  ('exterior-studs', 'stud-2x6', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('wall-plates', 'plate-2x6', 1, 'm', 0.05, 0, 'PLACEHOLDER'),
  ('opening-headers', 'header-2x6', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('interior-partitions', 'stud-2x4', 2.6, 'ea', 0.05, 0, 'PLACEHOLDER. 16 in OC plus end studs.'),
  ('interior-partitions', 'plate-2x4', 3, 'm', 0.05, 0, 'PLACEHOLDER. Three plate runs.'),
  ('stairs', 'stair-run', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('window', 'window-unit', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('exterior-door', 'exterior-door', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('interior-door', 'interior-door', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('water-heater', 'water-heater', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('light-fixture', 'light-fixture', 1, 'ea', 0.05, 0, 'PLACEHOLDER'),
  ('breaker-panel', 'breaker-panel', 1, 'ea', 0.05, 0, 'PLACEHOLDER')
on conflict do nothing;

insert into assembly_items (
  assembly_id,
  trade,
  quantity_per_unit,
  unit,
  waste,
  labor_hours_per_unit,
  notes
) values
  ('slab-foundation', 'concrete', 0.5382, 'hr', 0, 0.5382, 'PLACEHOLDER — concrete finisher'),
  ('exterior-wall', 'framer', 0.15, 'hr', 0, 0.15, 'PLACEHOLDER — carpenter hanging sheathing'),
  ('exterior-wall', 'sider', 0.5382, 'hr', 0, 0.5382, 'PLACEHOLDER — siding installer'),
  ('exterior-wall', 'drywall', 0.4306, 'hr', 0, 0.4306, 'PLACEHOLDER — drywall installer'),
  ('roof', 'framer', 0.4306, 'hr', 0, 0.4306, 'PLACEHOLDER — carpenter'),
  ('roof', 'roofer', 0.6458, 'hr', 0, 0.6458, 'PLACEHOLDER — roofer'),
  ('interior-finishes', 'drywall', 0.6458, 'hr', 0, 0.6458, 'PLACEHOLDER — drywall installer'),
  ('interior-finishes', 'painter', 0.2153, 'hr', 0, 0.2153, 'PLACEHOLDER — painter'),
  ('plumbing-fixture', 'plumber', 4.6, 'hr', 0, 4.6, 'PLACEHOLDER — plumber including valves'),
  ('electrical-point', 'electrician', 1.25, 'hr', 0, 1.25, 'PLACEHOLDER — electrician including the box'),
  ('hvac-heat-pump', 'hvac', 8, 'hr', 0, 8, 'PLACEHOLDER — HVAC technician setting the unit'),
  ('hvac-ductwork', 'hvac', 0.12, 'hr', 0, 0.12, 'PLACEHOLDER — HVAC technician per m2 of floor'),
  ('site-excavation', 'operator', 0.10, 'hr', 0, 0.10, 'PLACEHOLDER — equipment operator per m2'),
  ('exterior-studs', 'framer', 0.22, 'hr', 0, 0.22, 'PLACEHOLDER — carpenter per stud'),
  ('wall-plates', 'framer', 0.04, 'hr', 0, 0.04, 'PLACEHOLDER — carpenter per metre of plate'),
  ('opening-headers', 'framer', 0.75, 'hr', 0, 0.75, 'PLACEHOLDER — carpenter per header'),
  ('interior-partitions', 'framer', 0.35, 'hr', 0, 0.35, 'PLACEHOLDER — carpenter per metre of partition'),
  ('stairs', 'framer', 16, 'hr', 0, 16, 'PLACEHOLDER — carpenter per stair run'),
  ('window', 'openings', 1.25, 'hr', 0, 1.25, 'PLACEHOLDER — finish carpenter per window'),
  ('exterior-door', 'openings', 2.5, 'hr', 0, 2.5, 'PLACEHOLDER — finish carpenter per exterior door'),
  ('interior-door', 'openings', 1.25, 'hr', 0, 1.25, 'PLACEHOLDER — finish carpenter per interior door'),
  ('water-heater', 'plumber', 8, 'hr', 0, 8, 'PLACEHOLDER — plumber'),
  ('light-fixture', 'electrician', 0.75, 'hr', 0, 0.75, 'PLACEHOLDER — electrician'),
  ('breaker-panel', 'electrician', 6, 'hr', 0, 6, 'PLACEHOLDER — electrician')
on conflict do nothing;
