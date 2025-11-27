-- ============================================================================
-- PrayerMap Test Data Seed
-- 25 Test Users + 25 Creative Prayers in Metro Detroit
-- ============================================================================

-- Metro Detroit area coordinates roughly:
-- Detroit city center: 42.3314, -83.0458
-- Spread across: Royal Oak, Dearborn, Ann Arbor, Ferndale, Grosse Pointe, etc.

-- ============================================================================
-- 1. CREATE 25 TEST USERS IN AUTH.USERS
-- ============================================================================

-- Note: In Supabase, we need to use the service role to insert into auth.users
-- These will be test accounts with simple passwords

DO $$
DECLARE
  user_ids UUID[] := ARRAY[
    'a1111111-1111-1111-1111-111111111111'::UUID,
    'a2222222-2222-2222-2222-222222222222'::UUID,
    'a3333333-3333-3333-3333-333333333333'::UUID,
    'a4444444-4444-4444-4444-444444444444'::UUID,
    'a5555555-5555-5555-5555-555555555555'::UUID,
    'a6666666-6666-6666-6666-666666666666'::UUID,
    'a7777777-7777-7777-7777-777777777777'::UUID,
    'a8888888-8888-8888-8888-888888888888'::UUID,
    'a9999999-9999-9999-9999-999999999999'::UUID,
    'b1111111-1111-1111-1111-111111111111'::UUID,
    'b2222222-2222-2222-2222-222222222222'::UUID,
    'b3333333-3333-3333-3333-333333333333'::UUID,
    'b4444444-4444-4444-4444-444444444444'::UUID,
    'b5555555-5555-5555-5555-555555555555'::UUID,
    'b6666666-6666-6666-6666-666666666666'::UUID,
    'b7777777-7777-7777-7777-777777777777'::UUID,
    'b8888888-8888-8888-8888-888888888888'::UUID,
    'b9999999-9999-9999-9999-999999999999'::UUID,
    'c1111111-1111-1111-1111-111111111111'::UUID,
    'c2222222-2222-2222-2222-222222222222'::UUID,
    'c3333333-3333-3333-3333-333333333333'::UUID,
    'c4444444-4444-4444-4444-444444444444'::UUID,
    'c5555555-5555-5555-5555-555555555555'::UUID,
    'c6666666-6666-6666-6666-666666666666'::UUID,
    'c7777777-7777-7777-7777-777777777777'::UUID
  ];

  emails TEXT[] := ARRAY[
    'sarah.detroit@test.prayermap.net',
    'marcus.ferndale@test.prayermap.net',
    'jennifer.annarbor@test.prayermap.net',
    'david.royaloak@test.prayermap.net',
    'maria.dearborn@test.prayermap.net',
    'james.grossepointe@test.prayermap.net',
    'ashley.plymouth@test.prayermap.net',
    'michael.troy@test.prayermap.net',
    'lisa.birmingham@test.prayermap.net',
    'chris.pontiac@test.prayermap.net',
    'emily.canton@test.prayermap.net',
    'daniel.livonia@test.prayermap.net',
    'rachel.southfield@test.prayermap.net',
    'kevin.warren@test.prayermap.net',
    'amanda.sterling@test.prayermap.net',
    'brian.novi@test.prayermap.net',
    'stephanie.westland@test.prayermap.net',
    'tyler.taylor@test.prayermap.net',
    'nicole.ypsilanti@test.prayermap.net',
    'joshua.inkster@test.prayermap.net',
    'megan.redford@test.prayermap.net',
    'andrew.hamtramck@test.prayermap.net',
    'lauren.highland@test.prayermap.net',
    'ryan.farmington@test.prayermap.net',
    'jessica.rochester@test.prayermap.net'
  ];

  names TEXT[] := ARRAY[
    'Sarah', 'Marcus', 'Jennifer', 'David', 'Maria',
    'James', 'Ashley', 'Michael', 'Lisa', 'Chris',
    'Emily', 'Daniel', 'Rachel', 'Kevin', 'Amanda',
    'Brian', 'Stephanie', 'Tyler', 'Nicole', 'Joshua',
    'Megan', 'Andrew', 'Lauren', 'Ryan', 'Jessica'
  ];

  i INTEGER;
BEGIN
  FOR i IN 1..25 LOOP
    -- Insert into auth.users (requires service role)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      user_ids[i],
      '00000000-0000-0000-0000-000000000000',
      emails[i],
      crypt('TestPassword123!', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('display_name', names[i]),
      NOW() - (random() * interval '30 days'),
      NOW(),
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert identity for email auth
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      user_ids[i],
      user_ids[i],
      jsonb_build_object('sub', user_ids[i]::text, 'email', emails[i]),
      'email',
      user_ids[i]::text,
      NOW(),
      NOW() - (random() * interval '30 days'),
      NOW()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- 2. CREATE 25 THOUGHTFUL PRAYERS ACROSS METRO DETROIT
-- ============================================================================

-- Prayer 1: Downtown Detroit - Single parent struggling
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'p1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'I''m a single mom working two jobs to keep the lights on. My kids ask why I''m never home. I feel like I''m failing them even though I''m trying my hardest. Please pray that I find a better opportunity so I can be present for my babies.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.0458, 42.3314), 4326)::geography,
  'Sarah',
  false,
  NOW() - interval '2 days',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 2: Ferndale - Addiction recovery
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'p2222222-2222-2222-2222-222222222222',
  'a2222222-2222-2222-2222-222222222222',
  'Today marks 90 days clean. The cravings are still there, whispering lies in the quiet moments. I''ve lost so many friends to this disease. Please pray for my strength to continue this journey and for everyone else fighting the same battle.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.1347, 42.4606), 4326)::geography,
  'Marcus',
  false,
  NOW() - interval '1 day',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 3: Ann Arbor - Student facing uncertainty
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'p3333333-3333-3333-3333-333333333333',
  'a3333333-3333-3333-3333-333333333333',
  'I graduate in May with $80k in student loans and no job prospects in my field. Everyone told me to follow my passion, but now I''m terrified. Please pray for clarity about my next steps and peace despite the uncertainty.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.7430, 42.2808), 4326)::geography,
  'Jennifer',
  false,
  NOW() - interval '3 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 4: Royal Oak - Marriage restoration
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'p4444444-4444-4444-4444-444444444444',
  'a4444444-4444-4444-4444-444444444444',
  'My wife and I have been sleeping in separate rooms for three months. We used to be best friends. Somewhere along the way, we became strangers living under the same roof. I still love her deeply. Please pray that we find our way back to each other.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.1447, 42.4895), 4326)::geography,
  NULL,
  true,
  NOW() - interval '5 days',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 5: Dearborn - Immigrant family
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'p5555555-5555-5555-5555-555555555555',
  'a5555555-5555-5555-5555-555555555555',
  'My parents left everything behind in Lebanon to give us a better life. Now my father can''t find work because of his accent, and my mother cries every night missing her sisters. Please pray for doors to open and for my family to find belonging here.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.1763, 42.3223), 4326)::geography,
  'Maria',
  false,
  NOW() - interval '1 day 4 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 6: Grosse Pointe - Grieving parent
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'p6666666-6666-6666-6666-666666666666',
  'a6666666-6666-6666-6666-666666666666',
  'We lost our son to a drunk driver six months ago. He was 17. His room is exactly how he left it. I can''t bring myself to change anything. Some days I forget he''s gone for a split second, and then the grief hits all over again. I just need strength to keep breathing.',
  'text',
  ST_SetSRID(ST_MakePoint(-82.9063, 42.3862), 4326)::geography,
  'James',
  false,
  NOW() - interval '12 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 7: Plymouth - Small business owner
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'p7777777-7777-7777-7777-777777777777',
  'a7777777-7777-7777-7777-777777777777',
  'I put my life savings into opening a bakery last year. Some weeks I can barely make rent. I stay up until 2am baking, then open at 5am. I''m exhausted but this is my dream. Please pray for more customers and the endurance to keep going.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.4702, 42.3714), 4326)::geography,
  'Ashley',
  false,
  NOW() - interval '4 days',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 8: Troy - Cancer diagnosis
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'p8888888-8888-8888-8888-888888888888',
  'a8888888-8888-8888-8888-888888888888',
  'The doctor said the word no one wants to hear. Stage 3. I start chemo next week. I''m trying to be strong for my kids, but at night when they''re asleep, the fear is overwhelming. Please pray for healing and for me to be there to see my children grow up.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.1499, 42.6064), 4326)::geography,
  'Michael',
  false,
  NOW() - interval '6 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 9: Birmingham - Mental health
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'p9999999-9999-9999-9999-999999999999',
  'a9999999-9999-9999-9999-999999999999',
  'From the outside, my life looks perfect. Big house, nice car, successful career. But inside I''m drowning in anxiety and depression. I wear a mask every day. I finally made an appointment with a therapist. Please pray I have the courage to actually go.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.2113, 42.5467), 4326)::geography,
  NULL,
  true,
  NOW() - interval '8 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 10: Pontiac - Unemployment
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pa111111-1111-1111-1111-111111111111',
  'b1111111-1111-1111-1111-111111111111',
  'The plant closed and 300 of us lost our jobs. I''ve worked there for 22 years. It''s all I know. At 54, no one wants to hire me. My unemployment runs out next month. Please pray that someone gives me a chance.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.2910, 42.6389), 4326)::geography,
  'Chris',
  false,
  NOW() - interval '2 days 3 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 11: Canton - Fertility struggles
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pa222222-2222-2222-2222-222222222222',
  'b2222222-2222-2222-2222-222222222222',
  'Three years of trying. Four rounds of IVF. Countless tears. Everyone asks when we''re having kids like it''s so simple. My heart breaks a little more each month. Please pray for a miracle or for peace to accept whatever path God has for us.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.4816, 42.3087), 4326)::geography,
  'Emily',
  false,
  NOW() - interval '1 day 8 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 12: Livonia - Elderly parent care
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pa333333-3333-3333-3333-333333333333',
  'b3333333-3333-3333-3333-333333333333',
  'My dad has Alzheimer''s. Yesterday he didn''t recognize me. The man who taught me to ride a bike, who walked me down the aisle, looked at me like a stranger. I''m losing him piece by piece. Please pray for patience and for precious moments of clarity.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.3527, 42.3684), 4326)::geography,
  'Daniel',
  false,
  NOW() - interval '16 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 13: Southfield - Workplace injustice
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pa444444-4444-4444-4444-444444444444',
  'b4444444-4444-4444-4444-444444444444',
  'I reported harassment at work and now I''m the one being pushed out. They''re making my life miserable hoping I''ll quit. I did the right thing but I''m being punished for it. Please pray for justice and for the strength to not give up.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.2219, 42.4734), 4326)::geography,
  'Rachel',
  false,
  NOW() - interval '3 days',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 14: Warren - Prodigal child
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pa555555-5555-5555-5555-555555555555',
  'b5555555-5555-5555-5555-555555555555',
  'My son is living on the streets by choice. He chose drugs over his family. I haven''t heard from him in 8 months. I don''t even know if he''s alive. Every time my phone rings, I hope and fear it''s news about him. Please pray he finds his way home.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.0302, 42.4901), 4326)::geography,
  'Kevin',
  false,
  NOW() - interval '4 days 6 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 15: Sterling Heights - New baby struggles
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pa666666-6666-6666-6666-666666666666',
  'b6666666-6666-6666-6666-666666666666',
  'My baby won''t stop crying. I haven''t slept more than 2 hours at a time in 6 weeks. I love her so much but I''m having dark thoughts I''m ashamed of. I think I have postpartum depression. Please pray I get the help I need.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.0302, 42.5803), 4326)::geography,
  NULL,
  true,
  NOW() - interval '10 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 16: Novi - Teen struggling with identity
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pa777777-7777-7777-7777-777777777777',
  'b7777777-7777-7777-7777-777777777777',
  'I''m 16 and I don''t know who I am anymore. Everyone at school seems so sure of themselves. I feel like I''m wearing a costume every day, pretending to be someone I''m not. Please pray that I find my true self and people who accept me for it.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.4755, 42.4806), 4326)::geography,
  NULL,
  true,
  NOW() - interval '5 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 17: Westland - Divorce aftermath
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pa888888-8888-8888-8888-888888888888',
  'b8888888-8888-8888-8888-888888888888',
  'The divorce was final last week. 15 years, gone. I keep reaching for her side of the bed. The silence in this house is deafening. I know it was the right decision, but right and painless aren''t the same thing. Pray I learn to be whole on my own.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.4000, 42.3242), 4326)::geography,
  'Stephanie',
  false,
  NOW() - interval '2 days 12 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 18: Taylor - Housing insecurity
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pa999999-9999-9999-9999-999999999999',
  'b9999999-9999-9999-9999-999999999999',
  'We got the eviction notice yesterday. I work full time but rent keeps going up and wages don''t. My kids don''t know yet. I can''t bear to see the fear in their eyes. Please pray we find somewhere safe to live before the 30 days are up.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.2697, 42.2406), 4326)::geography,
  'Tyler',
  false,
  NOW() - interval '18 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 19: Ypsilanti - First generation college student
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pb111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'I''m the first in my family to go to college. I got into my dream school but imposter syndrome is real. Everyone seems smarter and more prepared. Some days I want to quit and go back to what''s familiar. Please pray I find the confidence to keep going.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.6129, 42.2411), 4326)::geography,
  'Nicole',
  false,
  NOW() - interval '1 day 2 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 20: Inkster - Community violence
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pb222222-2222-2222-2222-222222222222',
  'c2222222-2222-2222-2222-222222222222',
  'Another shooting on my block last night. A 12-year-old caught a stray bullet. I''m tired of being scared to let my kids play outside. This neighborhood has so much potential but we need peace. Please pray for healing and an end to the violence.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.3099, 42.2942), 4326)::geography,
  'Joshua',
  false,
  NOW() - interval '7 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 21: Redford - Caring for disabled sibling
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pb333333-3333-3333-3333-333333333333',
  'c3333333-3333-3333-3333-333333333333',
  'My brother has severe autism. Mom passed last year, so now it''s just me. I love him unconditionally, but I''m only 28 and I''ve given up so much. Dating, career opportunities, my own dreams. I feel guilty for even having these thoughts. Pray for balance.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.2969, 42.3842), 4326)::geography,
  'Megan',
  false,
  NOW() - interval '3 days 8 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 22: Hamtramck - Cultural tensions
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pb444444-4444-4444-4444-444444444444',
  'c4444444-4444-4444-4444-444444444444',
  'Our neighborhood used to be so close-knit. Now there''s tension between old residents and new immigrants. Both sides are good people with fears and hopes. I believe we can be a community again. Please pray for understanding and bridge-builders.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.0497, 42.3928), 4326)::geography,
  'Andrew',
  false,
  NOW() - interval '2 days 1 hour',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 23: Highland Park - Church revival
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pb555555-5555-5555-5555-555555555555',
  'c5555555-5555-5555-5555-555555555555',
  'Our little church has been here for 80 years. We used to fill the pews. Now there''s more gray hair than not, and we struggle to keep the lights on. But I believe God still has plans for this place. Please pray for renewal and for young families to find us.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.0969, 42.4056), 4326)::geography,
  'Lauren',
  false,
  NOW() - interval '6 days',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 24: Farmington Hills - Empty nest syndrome
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pb666666-6666-6666-6666-666666666666',
  'c6666666-6666-6666-6666-666666666666',
  'My youngest just left for college. For 26 years, being a parent was my whole identity. The house is too quiet. I don''t know who I am anymore without someone needing me. Please pray I discover purpose and joy in this new chapter.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.3771, 42.4989), 4326)::geography,
  'Ryan',
  false,
  NOW() - interval '4 days 3 hours',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Prayer 25: Rochester Hills - Gratitude and thanksgiving
INSERT INTO prayers (id, user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
VALUES (
  'pb777777-7777-7777-7777-777777777777',
  'c7777777-7777-7777-7777-777777777777',
  'One year ago today, I was diagnosed with terminal cancer and given 6 months. I''m still here. The tumors are shrinking. My doctor calls it remarkable. I call it a miracle. This isn''t a request - it''s a prayer of pure gratitude. Thank you, God. Thank you to everyone who prayed for me.',
  'text',
  ST_SetSRID(ST_MakePoint(-83.1499, 42.6584), 4326)::geography,
  'Jessica',
  false,
  NOW() - interval '30 minutes',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify users were created
SELECT COUNT(*) as user_count FROM auth.users WHERE email LIKE '%@test.prayermap.net';

-- Verify prayers were created
SELECT COUNT(*) as prayer_count FROM prayers WHERE id LIKE 'p%' OR id LIKE 'pa%' OR id LIKE 'pb%';

-- Show sample of prayers with locations
SELECT
  user_name,
  LEFT(content, 60) || '...' as preview,
  ST_AsText(location::geometry) as location,
  created_at
FROM prayers
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;
