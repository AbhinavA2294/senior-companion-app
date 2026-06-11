-- ============================================================
-- Senior Companion – Seed Data
-- For local development only. Run: supabase db seed
-- ============================================================

-- ── Activity types ───────────────────────────────────────────
INSERT INTO activity_types (name, description, icon_name, sort_order) VALUES
  ('Doctor Appointment Chaperone',
   'Accompany a senior to a medical appointment as a non-medical chaperone. Provide calm, friendly support before and after the visit.',
   'stethoscope', 1),
  ('Walk or Park Visit',
   'A gentle walk, fresh air, and good conversation at a local park or trail.',
   'tree-pine', 2),
  ('Café or Restaurant',
   'Share a meal, coffee, or tea at a café or restaurant of the senior''s choice.',
   'coffee', 3),
  ('Grocery Shopping',
   'Accompany a senior to the grocery store or pharmacy for errands.',
   'shopping-cart', 4),
  ('Religious or Cultural Program',
   'Accompany a senior to a temple, church, mosque, cultural center, or community event.',
   'landmark', 5),
  ('Social Event',
   'Join a senior at a social gathering, senior center event, or community activity.',
   'users', 6),
  ('Conversation and Companionship',
   'A visit dedicated to friendly conversation, storytelling, and meaningful connection.',
   'message-circle', 7),
  ('Reading or Games',
   'Read aloud together, play cards, board games, puzzles, or other leisurely activities.',
   'book-open', 8),
  ('Technology Assistance',
   'Help a senior with video calls, smartphone basics, tablet setup, or email — patiently and without pressure.',
   'smartphone', 9),
  ('Other Non-Medical Activity',
   'Any other companionship or chaperone activity not listed above. Please describe in your booking notes.',
   'heart', 10)
ON CONFLICT (name) DO NOTHING;

-- ── Sample family member profiles (no auth account — dev only) ─
-- These records represent managed/seeded family accounts for local testing.
INSERT INTO profiles (
  id, user_id, role, first_name, last_name, phone,
  city, state, zip_code, is_managed, is_active
) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    NULL, 'family', 'Margaret', 'Johnson', '555-0101',
    'Springfield', 'IL', '62701', FALSE, TRUE
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
    NULL, 'family', 'Robert', 'Chen', '555-0102',
    'Chicago', 'IL', '60601', FALSE, TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ── Sample managed senior profiles ───────────────────────────
-- Managed by the sample family members above.
INSERT INTO profiles (
  id, user_id, role, first_name, last_name, phone,
  street_address, city, state, zip_code,
  date_of_birth, is_managed, managed_by_profile_id, is_active
) VALUES
  (
    'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
    NULL, 'senior', 'Eleanor', 'Johnson', '555-0201',
    '142 Maple Street', 'Springfield', 'IL', '62702',
    '1942-03-15', TRUE,
    'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    TRUE
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
    NULL, 'senior', 'George', 'Nakamura', '555-0202',
    '87 Oak Avenue', 'Chicago', 'IL', '60602',
    '1938-11-22', TRUE,
    'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ── Senior profile detail records ────────────────────────────
INSERT INTO senior_profiles (
  profile_id, preferred_name, preferred_language,
  additional_languages, interests, mobility_notes,
  accessibility_needs, free_text_notes
) VALUES
  (
    'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
    'Ellie', 'English',
    ARRAY['Spanish'],
    ARRAY['Gardening','Reading','Classical music','Walking in parks'],
    'Uses a cane for longer walks. Comfortable walking short distances unaided.',
    'Prefers wide doorways. Has mild hearing loss — please speak clearly.',
    'Enjoys discussing history and classic literature. Morning person, prefers visits before 2pm.'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
    'George', 'English',
    ARRAY['Japanese'],
    ARRAY['Chess','Technology','Japanese cooking','Jazz music'],
    'Uses a walker. Takes 10–15 minutes to get ready before outings.',
    'Color blind (red/green). Wears hearing aids.',
    'Very independent spirit. Enjoys trying new technology. Prefers companions who are patient with questions.'
  )
ON CONFLICT (profile_id) DO NOTHING;

-- ── Family–senior relationships ───────────────────────────────
INSERT INTO family_senior_relationships (
  family_profile_id, senior_profile_id, relationship_label, can_book, can_view_summaries
) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
    'Daughter', TRUE, TRUE
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
    'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
    'Son', TRUE, TRUE
  )
ON CONFLICT (family_profile_id, senior_profile_id) DO NOTHING;

-- ── Emergency contacts ────────────────────────────────────────
INSERT INTO emergency_contacts (
  id, senior_profile_id, name, relationship, phone, email, is_primary
) VALUES
  (
    'dddddddd-0000-0000-0000-000000000001'::uuid,
    'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
    'Margaret Johnson', 'Daughter', '555-0101', 'margaret.johnson@example.com', TRUE
  ),
  (
    'dddddddd-0000-0000-0000-000000000002'::uuid,
    'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
    'Robert Chen', 'Son', '555-0102', 'robert.chen@example.com', TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ── Sample bookings ───────────────────────────────────────────
-- Requires at least one activity_type row (seeded above).
DO $$
DECLARE
  v_walk_id UUID;
  v_doctor_id UUID;
  v_cafe_id UUID;
BEGIN
  SELECT id INTO v_walk_id    FROM activity_types WHERE name = 'Walk or Park Visit'            LIMIT 1;
  SELECT id INTO v_doctor_id  FROM activity_types WHERE name = 'Doctor Appointment Chaperone'  LIMIT 1;
  SELECT id INTO v_cafe_id    FROM activity_types WHERE name = 'Café or Restaurant'             LIMIT 1;

  -- Upcoming booking (requested status)
  INSERT INTO bookings (
    id, senior_profile_id, booked_by_profile_id, activity_type_id,
    status, scheduled_date, scheduled_start_time, duration_hours,
    location_description, destination_address, special_notes,
    disclaimer_acknowledged
  ) VALUES (
    'cccccccc-0000-0000-0000-000000000001'::uuid,
    'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
    'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    v_walk_id,
    'requested',
    CURRENT_DATE + INTERVAL '3 days',
    '10:00',
    2,
    '142 Maple Street, Springfield, IL 62702',
    'Lincoln Park, Springfield, IL',
    'Ellie enjoys the rose garden area.',
    TRUE
  ) ON CONFLICT (id) DO NOTHING;

  -- Completed booking
  INSERT INTO bookings (
    id, senior_profile_id, booked_by_profile_id, activity_type_id,
    status, scheduled_date, scheduled_start_time, duration_hours,
    location_description, special_notes, disclaimer_acknowledged
  ) VALUES (
    'cccccccc-0000-0000-0000-000000000002'::uuid,
    'bbbbbbbb-0000-0000-0000-000000000001'::uuid,
    'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    v_doctor_id,
    'completed',
    CURRENT_DATE - INTERVAL '7 days',
    '09:00',
    3,
    '142 Maple Street, Springfield, IL 62702',
    'Annual checkup at Springfield Family Medicine.',
    TRUE
  ) ON CONFLICT (id) DO NOTHING;

  -- Cancelled booking
  INSERT INTO bookings (
    id, senior_profile_id, booked_by_profile_id, activity_type_id,
    status, scheduled_date, scheduled_start_time, duration_hours,
    location_description, disclaimer_acknowledged
  ) VALUES (
    'cccccccc-0000-0000-0000-000000000003'::uuid,
    'bbbbbbbb-0000-0000-0000-000000000002'::uuid,
    'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
    v_cafe_id,
    'cancelled',
    CURRENT_DATE - INTERVAL '2 days',
    '14:00',
    2,
    '87 Oak Avenue, Chicago, IL 60602',
    TRUE
  ) ON CONFLICT (id) DO NOTHING;
END $$;

-- ── Dev note ──────────────────────────────────────────────────
-- The seed records above use NULL user_id (managed profiles) for
-- local development only. Real users are created through the UI.
-- Do NOT store real credentials in seed files.
