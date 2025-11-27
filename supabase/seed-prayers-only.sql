-- ============================================================================
-- PrayerMap Test Data Seed - PRAYERS ONLY
-- 25 Creative Prayers in Metro Detroit
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- This version creates prayers that can be viewed by anyone
-- Uses a placeholder user_id that you can replace with a real user if needed

-- First, let's get or create a test user to own these prayers
-- You may need to sign up a test user first: testuser@prayermap.net / TestPassword123!

-- For now, we'll insert prayers with anonymous flag and let the RLS handle it
-- The prayers will be visible to all users on the map

-- Delete any existing test prayers first (optional - uncomment if needed)
-- DELETE FROM prayers WHERE content LIKE '%Please pray%';

-- ============================================================================
-- METRO DETROIT LOCATIONS REFERENCE
-- ============================================================================
-- Downtown Detroit: 42.3314, -83.0458
-- Ferndale: 42.4606, -83.1347
-- Ann Arbor: 42.2808, -83.7430
-- Royal Oak: 42.4895, -83.1447
-- Dearborn: 42.3223, -83.1763
-- Grosse Pointe: 42.3862, -82.9063
-- Plymouth: 42.3714, -83.4702
-- Troy: 42.6064, -83.1499
-- Birmingham: 42.5467, -83.2113
-- Pontiac: 42.6389, -83.2910
-- Canton: 42.3087, -83.4816
-- Livonia: 42.3684, -83.3527
-- Southfield: 42.4734, -83.2219
-- Warren: 42.4901, -83.0302
-- Sterling Heights: 42.5803, -83.0302
-- Novi: 42.4806, -83.4755
-- Westland: 42.3242, -83.4000
-- Taylor: 42.2406, -83.2697
-- Ypsilanti: 42.2411, -83.6129
-- Inkster: 42.2942, -83.3099
-- Redford: 42.3842, -83.2969
-- Hamtramck: 42.3928, -83.0497
-- Highland Park: 42.4056, -83.0969
-- Farmington Hills: 42.4989, -83.3771
-- Rochester Hills: 42.6584, -83.1499

-- ============================================================================
-- CREATE TEST USER (run this first)
-- ============================================================================

-- Create a test user in auth.users using Supabase Auth API
-- Sign up at your app with: testuser@prayermap.net / TestPassword123!
-- Then get the user ID from the auth.users table

-- For this script, we'll use a variable for the user ID
-- Replace 'YOUR_USER_ID_HERE' with an actual user ID from your database

-- ============================================================================
-- INSERT 25 THOUGHTFUL PRAYERS
-- ============================================================================

-- Get an existing user ID to use (picks the first authenticated user)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Try to get an existing user, or use a placeholder
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No users found. Please create a user first.';
    RETURN;
  END IF;

  -- Prayer 1: Downtown Detroit - Single parent struggling
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'I''m a single mom working two jobs to keep the lights on. My kids ask why I''m never home. I feel like I''m failing them even though I''m trying my hardest. Please pray that I find a better opportunity so I can be present for my babies.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.0458, 42.3314), 4326)::geography,
    'Sarah',
    false,
    NOW() - interval '2 days',
    'active'
  );

  -- Prayer 2: Ferndale - Addiction recovery
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'Today marks 90 days clean. The cravings are still there, whispering lies in the quiet moments. I''ve lost so many friends to this disease. Please pray for my strength to continue this journey and for everyone else fighting the same battle.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.1347, 42.4606), 4326)::geography,
    'Marcus',
    false,
    NOW() - interval '1 day',
    'active'
  );

  -- Prayer 3: Ann Arbor - Student facing uncertainty
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'I graduate in May with $80k in student loans and no job prospects in my field. Everyone told me to follow my passion, but now I''m terrified. Please pray for clarity about my next steps and peace despite the uncertainty.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.7430, 42.2808), 4326)::geography,
    'Jennifer',
    false,
    NOW() - interval '3 hours',
    'active'
  );

  -- Prayer 4: Royal Oak - Marriage restoration (anonymous)
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'My wife and I have been sleeping in separate rooms for three months. We used to be best friends. Somewhere along the way, we became strangers living under the same roof. I still love her deeply. Please pray that we find our way back to each other.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.1447, 42.4895), 4326)::geography,
    NULL,
    true,
    NOW() - interval '5 days',
    'active'
  );

  -- Prayer 5: Dearborn - Immigrant family
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'My parents left everything behind in Lebanon to give us a better life. Now my father can''t find work because of his accent, and my mother cries every night missing her sisters. Please pray for doors to open and for my family to find belonging here.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.1763, 42.3223), 4326)::geography,
    'Maria',
    false,
    NOW() - interval '1 day 4 hours',
    'active'
  );

  -- Prayer 6: Grosse Pointe - Grieving parent
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'We lost our son to a drunk driver six months ago. He was 17. His room is exactly how he left it. I can''t bring myself to change anything. Some days I forget he''s gone for a split second, and then the grief hits all over again. I just need strength to keep breathing.',
    'text',
    ST_SetSRID(ST_MakePoint(-82.9063, 42.3862), 4326)::geography,
    'James',
    false,
    NOW() - interval '12 hours',
    'active'
  );

  -- Prayer 7: Plymouth - Small business owner
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'I put my life savings into opening a bakery last year. Some weeks I can barely make rent. I stay up until 2am baking, then open at 5am. I''m exhausted but this is my dream. Please pray for more customers and the endurance to keep going.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.4702, 42.3714), 4326)::geography,
    'Ashley',
    false,
    NOW() - interval '4 days',
    'active'
  );

  -- Prayer 8: Troy - Cancer diagnosis
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'The doctor said the word no one wants to hear. Stage 3. I start chemo next week. I''m trying to be strong for my kids, but at night when they''re asleep, the fear is overwhelming. Please pray for healing and for me to be there to see my children grow up.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.1499, 42.6064), 4326)::geography,
    'Michael',
    false,
    NOW() - interval '6 hours',
    'active'
  );

  -- Prayer 9: Birmingham - Mental health (anonymous)
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'From the outside, my life looks perfect. Big house, nice car, successful career. But inside I''m drowning in anxiety and depression. I wear a mask every day. I finally made an appointment with a therapist. Please pray I have the courage to actually go.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.2113, 42.5467), 4326)::geography,
    NULL,
    true,
    NOW() - interval '8 hours',
    'active'
  );

  -- Prayer 10: Pontiac - Unemployment
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'The plant closed and 300 of us lost our jobs. I''ve worked there for 22 years. It''s all I know. At 54, no one wants to hire me. My unemployment runs out next month. Please pray that someone gives me a chance.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.2910, 42.6389), 4326)::geography,
    'Chris',
    false,
    NOW() - interval '2 days 3 hours',
    'active'
  );

  -- Prayer 11: Canton - Fertility struggles
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'Three years of trying. Four rounds of IVF. Countless tears. Everyone asks when we''re having kids like it''s so simple. My heart breaks a little more each month. Please pray for a miracle or for peace to accept whatever path God has for us.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.4816, 42.3087), 4326)::geography,
    'Emily',
    false,
    NOW() - interval '1 day 8 hours',
    'active'
  );

  -- Prayer 12: Livonia - Elderly parent care
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'My dad has Alzheimer''s. Yesterday he didn''t recognize me. The man who taught me to ride a bike, who walked me down the aisle, looked at me like a stranger. I''m losing him piece by piece. Please pray for patience and for precious moments of clarity.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.3527, 42.3684), 4326)::geography,
    'Daniel',
    false,
    NOW() - interval '16 hours',
    'active'
  );

  -- Prayer 13: Southfield - Workplace injustice
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'I reported harassment at work and now I''m the one being pushed out. They''re making my life miserable hoping I''ll quit. I did the right thing but I''m being punished for it. Please pray for justice and for the strength to not give up.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.2219, 42.4734), 4326)::geography,
    'Rachel',
    false,
    NOW() - interval '3 days',
    'active'
  );

  -- Prayer 14: Warren - Prodigal child
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'My son is living on the streets by choice. He chose drugs over his family. I haven''t heard from him in 8 months. I don''t even know if he''s alive. Every time my phone rings, I hope and fear it''s news about him. Please pray he finds his way home.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.0302, 42.4901), 4326)::geography,
    'Kevin',
    false,
    NOW() - interval '4 days 6 hours',
    'active'
  );

  -- Prayer 15: Sterling Heights - New baby struggles (anonymous)
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'My baby won''t stop crying. I haven''t slept more than 2 hours at a time in 6 weeks. I love her so much but I''m having dark thoughts I''m ashamed of. I think I have postpartum depression. Please pray I get the help I need.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.0302, 42.5803), 4326)::geography,
    NULL,
    true,
    NOW() - interval '10 hours',
    'active'
  );

  -- Prayer 16: Novi - Teen struggling with identity (anonymous)
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'I''m 16 and I don''t know who I am anymore. Everyone at school seems so sure of themselves. I feel like I''m wearing a costume every day, pretending to be someone I''m not. Please pray that I find my true self and people who accept me for it.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.4755, 42.4806), 4326)::geography,
    NULL,
    true,
    NOW() - interval '5 hours',
    'active'
  );

  -- Prayer 17: Westland - Divorce aftermath
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'The divorce was final last week. 15 years, gone. I keep reaching for her side of the bed. The silence in this house is deafening. I know it was the right decision, but right and painless aren''t the same thing. Pray I learn to be whole on my own.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.4000, 42.3242), 4326)::geography,
    'Stephanie',
    false,
    NOW() - interval '2 days 12 hours',
    'active'
  );

  -- Prayer 18: Taylor - Housing insecurity
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'We got the eviction notice yesterday. I work full time but rent keeps going up and wages don''t. My kids don''t know yet. I can''t bear to see the fear in their eyes. Please pray we find somewhere safe to live before the 30 days are up.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.2697, 42.2406), 4326)::geography,
    'Tyler',
    false,
    NOW() - interval '18 hours',
    'active'
  );

  -- Prayer 19: Ypsilanti - First generation college student
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'I''m the first in my family to go to college. I got into my dream school but imposter syndrome is real. Everyone seems smarter and more prepared. Some days I want to quit and go back to what''s familiar. Please pray I find the confidence to keep going.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.6129, 42.2411), 4326)::geography,
    'Nicole',
    false,
    NOW() - interval '1 day 2 hours',
    'active'
  );

  -- Prayer 20: Inkster - Community violence
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'Another shooting on my block last night. A 12-year-old caught a stray bullet. I''m tired of being scared to let my kids play outside. This neighborhood has so much potential but we need peace. Please pray for healing and an end to the violence.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.3099, 42.2942), 4326)::geography,
    'Joshua',
    false,
    NOW() - interval '7 hours',
    'active'
  );

  -- Prayer 21: Redford - Caring for disabled sibling
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'My brother has severe autism. Mom passed last year, so now it''s just me. I love him unconditionally, but I''m only 28 and I''ve given up so much. Dating, career opportunities, my own dreams. I feel guilty for even having these thoughts. Pray for balance.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.2969, 42.3842), 4326)::geography,
    'Megan',
    false,
    NOW() - interval '3 days 8 hours',
    'active'
  );

  -- Prayer 22: Hamtramck - Cultural tensions
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'Our neighborhood used to be so close-knit. Now there''s tension between old residents and new immigrants. Both sides are good people with fears and hopes. I believe we can be a community again. Please pray for understanding and bridge-builders.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.0497, 42.3928), 4326)::geography,
    'Andrew',
    false,
    NOW() - interval '2 days 1 hour',
    'active'
  );

  -- Prayer 23: Highland Park - Church revival
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'Our little church has been here for 80 years. We used to fill the pews. Now there''s more gray hair than not, and we struggle to keep the lights on. But I believe God still has plans for this place. Please pray for renewal and for young families to find us.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.0969, 42.4056), 4326)::geography,
    'Lauren',
    false,
    NOW() - interval '6 days',
    'active'
  );

  -- Prayer 24: Farmington Hills - Empty nest syndrome
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'My youngest just left for college. For 26 years, being a parent was my whole identity. The house is too quiet. I don''t know who I am anymore without someone needing me. Please pray I discover purpose and joy in this new chapter.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.3771, 42.4989), 4326)::geography,
    'Ryan',
    false,
    NOW() - interval '4 days 3 hours',
    'active'
  );

  -- Prayer 25: Rochester Hills - Gratitude and thanksgiving
  INSERT INTO prayers (user_id, content, content_type, location, user_name, is_anonymous, created_at, status)
  VALUES (
    test_user_id,
    'One year ago today, I was diagnosed with terminal cancer and given 6 months. I''m still here. The tumors are shrinking. My doctor calls it remarkable. I call it a miracle. This isn''t a request - it''s a prayer of pure gratitude. Thank you, God. Thank you to everyone who prayed for me.',
    'text',
    ST_SetSRID(ST_MakePoint(-83.1499, 42.6584), 4326)::geography,
    'Jessica',
    false,
    NOW() - interval '30 minutes',
    'active'
  );

  RAISE NOTICE 'Successfully inserted 25 test prayers for user %', test_user_id;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count total prayers
SELECT COUNT(*) as total_prayers FROM prayers WHERE status = 'active';

-- Show all prayers with their locations
SELECT
  COALESCE(user_name, 'Anonymous') as name,
  LEFT(content, 50) || '...' as preview,
  ROUND(ST_Y(location::geometry)::numeric, 4) as lat,
  ROUND(ST_X(location::geometry)::numeric, 4) as lng,
  created_at
FROM prayers
WHERE status = 'active'
ORDER BY created_at DESC;
