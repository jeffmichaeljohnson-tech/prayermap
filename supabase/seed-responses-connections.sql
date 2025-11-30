-- ============================================================================
-- PrayerMap Prayer Responses & Connections Seed
-- Creates prayer responses and connections for testing chat & memorial lines
-- ============================================================================

-- This seed should be run AFTER seed-test-data.sql

-- ============================================================================
-- 1. CREATE PRAYER RESPONSES (Chat messages)
-- ============================================================================

-- Response 1: Marcus responds to Sarah's prayer (single mom)
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'r1111111-1111-1111-1111-111111111111',
  'p1111111-1111-1111-1111-111111111111', -- Sarah's prayer
  'a2222222-2222-2222-2222-222222222222', -- Marcus
  'Marcus',
  false,
  'Sarah, I''m praying for you. As someone who grew up with a single mom, I know how much she sacrificed. Your children will understand one day. You are not failing them - you are showing them what strength and love look like. Praying for that better opportunity!',
  'text',
  NOW() - interval '1 day 20 hours'
) ON CONFLICT (id) DO NOTHING;

-- Response 2: Jennifer responds to Marcus's prayer (addiction recovery)
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'r2222222-2222-2222-2222-222222222222',
  'p2222222-2222-2222-2222-222222222222', -- Marcus's prayer
  'a3333333-3333-3333-3333-333333333333', -- Jennifer
  'Jennifer',
  false,
  '90 days is incredible! Every single day you choose recovery is a victory. I''m lifting you up in prayer right now. The cravings are liars - you are stronger than them. Keep fighting! 🙏',
  'text',
  NOW() - interval '20 hours'
) ON CONFLICT (id) DO NOTHING;

-- Response 3: David responds to Jennifer's prayer (student)
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'r3333333-3333-3333-3333-333333333333',
  'p3333333-3333-3333-3333-333333333333', -- Jennifer's prayer
  'a4444444-4444-4444-4444-444444444444', -- David
  NULL, -- Anonymous
  true,
  'I was in your exact shoes 10 years ago. The uncertainty was terrifying. But looking back, that period of not knowing led me to opportunities I never imagined. Praying for clarity and unexpected doors to open for you.',
  'text',
  NOW() - interval '2 hours'
) ON CONFLICT (id) DO NOTHING;

-- Response 4: Maria responds to the anonymous marriage prayer
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'r4444444-4444-4444-4444-444444444444',
  'p4444444-4444-4444-4444-444444444444', -- Marriage prayer
  'a5555555-5555-5555-5555-555555555555', -- Maria
  'Maria',
  false,
  'My parents almost divorced when I was young. They chose to fight for their marriage. 30 years later, they''re still best friends. It''s possible. Praying for reconciliation and renewed love between you two.',
  'text',
  NOW() - interval '4 days'
) ON CONFLICT (id) DO NOTHING;

-- Response 5: James responds to Maria's prayer (immigrant family)
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'r5555555-5555-5555-5555-555555555555',
  'p5555555-5555-5555-5555-555555555555', -- Maria's prayer
  'a6666666-6666-6666-6666-666666666666', -- James
  'James',
  false,
  'Your family''s courage to start over in a new country is inspiring. Praying for your father to find work that values his skills and experience, and for your mother to find community here. You belong.',
  'text',
  NOW() - interval '1 day'
) ON CONFLICT (id) DO NOTHING;

-- Response 6: Ashley responds to James's prayer (grieving parent)
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'r6666666-6666-6666-6666-666666666666',
  'p6666666-6666-6666-6666-666666666666', -- James's prayer
  'a7777777-7777-7777-7777-777777777777', -- Ashley
  'Ashley',
  false,
  'James, there are no words adequate for the loss of a child. I''m just holding your family in prayer right now. Take each moment as it comes. Grief has no timeline. Your love for him lives on.',
  'text',
  NOW() - interval '10 hours'
) ON CONFLICT (id) DO NOTHING;

-- Response 7: Michael responds to Ashley's prayer (bakery)
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'r7777777-7777-7777-7777-777777777777',
  'p7777777-7777-7777-7777-777777777777', -- Ashley's prayer
  'a8888888-8888-8888-8888-888888888888', -- Michael
  'Michael',
  false,
  'What''s your bakery called? I work in Troy and would love to stop by! Dreams pursued with this much heart deserve to succeed. Praying for lines out the door! 🍞',
  'text',
  NOW() - interval '3 days'
) ON CONFLICT (id) DO NOTHING;

-- Response 8: Lisa responds to Michael's prayer (cancer)
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'r8888888-8888-8888-8888-888888888888',
  'p8888888-8888-8888-8888-888888888888', -- Michael's prayer
  'a9999999-9999-9999-9999-999999999999', -- Lisa
  'Lisa',
  false,
  'Michael, I''m a cancer survivor. I know that fear. But I''m also proof that miracles happen. Praying fervently for complete healing. You will see your children grow up. Hold onto hope.',
  'text',
  NOW() - interval '4 hours'
) ON CONFLICT (id) DO NOTHING;

-- Response 9: Chris responds to the anonymous mental health prayer
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'r9999999-9999-9999-9999-999999999999',
  'p9999999-9999-9999-9999-999999999999', -- Mental health prayer
  'b1111111-1111-1111-1111-111111111111', -- Chris
  NULL,
  true,
  'I''ve been there - the perfect exterior hiding the internal storm. Making that appointment was the bravest thing you''ll do. Go. Show up. It saved my life. Praying for healing.',
  'text',
  NOW() - interval '6 hours'
) ON CONFLICT (id) DO NOTHING;

-- Response 10: Emily responds to Chris's prayer (unemployment)
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'ra111111-1111-1111-1111-111111111111',
  'pa111111-1111-1111-1111-111111111111', -- Chris's prayer
  'b2222222-2222-2222-2222-222222222222', -- Emily
  'Emily',
  false,
  '22 years of experience is invaluable. The right employer will see that. Praying for that door to open and for provision during this waiting season.',
  'text',
  NOW() - interval '2 days'
) ON CONFLICT (id) DO NOTHING;

-- Additional response to Sarah's prayer (creates multiple responses for chat thread)
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'ra222222-2222-2222-2222-222222222222',
  'p1111111-1111-1111-1111-111111111111', -- Sarah's prayer again
  'a6666666-6666-6666-6666-666666666666', -- James
  'James',
  false,
  'Praying for you right now, Sarah. I just asked my company if they have any remote positions that might work for a single mom. I''ll let you know! 🙏',
  'text',
  NOW() - interval '1 day 10 hours'
) ON CONFLICT (id) DO NOTHING;

-- Third response to Sarah's prayer
INSERT INTO prayer_responses (id, prayer_id, responder_id, responder_name, is_anonymous, message, content_type, created_at)
VALUES (
  'ra333333-3333-3333-3333-333333333333',
  'p1111111-1111-1111-1111-111111111111', -- Sarah's prayer again
  'b4444444-4444-4444-4444-444444444444', -- Rachel
  'Rachel',
  false,
  'Sarah, my church has a single moms support group that meets Wednesday nights with free childcare. Would love to have you join us. You don''t have to do this alone!',
  'text',
  NOW() - interval '12 hours'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. CREATE PRAYER CONNECTIONS (Memorial Lines)
-- These are the beautiful connection lines that show on the map
-- ============================================================================

-- Connection 1: Marcus prayed for Sarah (Detroit to Ferndale)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'p1111111-1111-1111-1111-111111111111',
  'r1111111-1111-1111-1111-111111111111',
  ST_SetSRID(ST_MakePoint(-83.1347, 42.4606), 4326)::geography, -- From Ferndale (Marcus)
  ST_SetSRID(ST_MakePoint(-83.0458, 42.3314), 4326)::geography, -- To Detroit (Sarah)
  'Sarah',
  'Marcus',
  NOW() - interval '1 day 20 hours',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Connection 2: Jennifer prayed for Marcus (Ann Arbor to Ferndale)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'c2222222-2222-2222-2222-222222222222',
  'p2222222-2222-2222-2222-222222222222',
  'r2222222-2222-2222-2222-222222222222',
  ST_SetSRID(ST_MakePoint(-83.7430, 42.2808), 4326)::geography, -- From Ann Arbor (Jennifer)
  ST_SetSRID(ST_MakePoint(-83.1347, 42.4606), 4326)::geography, -- To Ferndale (Marcus)
  'Marcus',
  'Jennifer',
  NOW() - interval '20 hours',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Connection 3: David prayed for Jennifer (Royal Oak to Ann Arbor)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'p3333333-3333-3333-3333-333333333333',
  'r3333333-3333-3333-3333-333333333333',
  ST_SetSRID(ST_MakePoint(-83.1447, 42.4895), 4326)::geography, -- From Royal Oak (David)
  ST_SetSRID(ST_MakePoint(-83.7430, 42.2808), 4326)::geography, -- To Ann Arbor (Jennifer)
  'Jennifer',
  'Anonymous',
  NOW() - interval '2 hours',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Connection 4: Maria prayed for anonymous marriage (Dearborn to Royal Oak)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'c4444444-4444-4444-4444-444444444444',
  'p4444444-4444-4444-4444-444444444444',
  'r4444444-4444-4444-4444-444444444444',
  ST_SetSRID(ST_MakePoint(-83.1763, 42.3223), 4326)::geography, -- From Dearborn (Maria)
  ST_SetSRID(ST_MakePoint(-83.1447, 42.4895), 4326)::geography, -- To Royal Oak (anonymous)
  'Anonymous',
  'Maria',
  NOW() - interval '4 days',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Connection 5: James prayed for Maria (Grosse Pointe to Dearborn)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'c5555555-5555-5555-5555-555555555555',
  'p5555555-5555-5555-5555-555555555555',
  'r5555555-5555-5555-5555-555555555555',
  ST_SetSRID(ST_MakePoint(-82.9063, 42.3862), 4326)::geography, -- From Grosse Pointe (James)
  ST_SetSRID(ST_MakePoint(-83.1763, 42.3223), 4326)::geography, -- To Dearborn (Maria)
  'Maria',
  'James',
  NOW() - interval '1 day',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Connection 6: Ashley prayed for James (Plymouth to Grosse Pointe)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'c6666666-6666-6666-6666-666666666666',
  'p6666666-6666-6666-6666-666666666666',
  'r6666666-6666-6666-6666-666666666666',
  ST_SetSRID(ST_MakePoint(-83.4702, 42.3714), 4326)::geography, -- From Plymouth (Ashley)
  ST_SetSRID(ST_MakePoint(-82.9063, 42.3862), 4326)::geography, -- To Grosse Pointe (James)
  'James',
  'Ashley',
  NOW() - interval '10 hours',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Connection 7: Michael prayed for Ashley (Troy to Plymouth)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'c7777777-7777-7777-7777-777777777777',
  'p7777777-7777-7777-7777-777777777777',
  'r7777777-7777-7777-7777-777777777777',
  ST_SetSRID(ST_MakePoint(-83.1499, 42.6064), 4326)::geography, -- From Troy (Michael)
  ST_SetSRID(ST_MakePoint(-83.4702, 42.3714), 4326)::geography, -- To Plymouth (Ashley)
  'Ashley',
  'Michael',
  NOW() - interval '3 days',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Connection 8: Lisa prayed for Michael (Birmingham to Troy)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'c8888888-8888-8888-8888-888888888888',
  'p8888888-8888-8888-8888-888888888888',
  'r8888888-8888-8888-8888-888888888888',
  ST_SetSRID(ST_MakePoint(-83.2113, 42.5467), 4326)::geography, -- From Birmingham (Lisa)
  ST_SetSRID(ST_MakePoint(-83.1499, 42.6064), 4326)::geography, -- To Troy (Michael)
  'Michael',
  'Lisa',
  NOW() - interval '4 hours',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Connection 9: James prayed for Sarah (second connection to same prayer)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'c9999999-9999-9999-9999-999999999999',
  'p1111111-1111-1111-1111-111111111111',
  'ra222222-2222-2222-2222-222222222222',
  ST_SetSRID(ST_MakePoint(-82.9063, 42.3862), 4326)::geography, -- From Grosse Pointe (James)
  ST_SetSRID(ST_MakePoint(-83.0458, 42.3314), 4326)::geography, -- To Detroit (Sarah)
  'Sarah',
  'James',
  NOW() - interval '1 day 10 hours',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- Connection 10: Rachel prayed for Sarah (third connection to same prayer)
INSERT INTO prayer_connections (id, prayer_id, prayer_response_id, from_location, to_location, requester_name, replier_name, created_at, expires_at)
VALUES (
  'ca111111-1111-1111-1111-111111111111',
  'p1111111-1111-1111-1111-111111111111',
  'ra333333-3333-3333-3333-333333333333',
  ST_SetSRID(ST_MakePoint(-83.2219, 42.4734), 4326)::geography, -- From Southfield (Rachel)
  ST_SetSRID(ST_MakePoint(-83.0458, 42.3314), 4326)::geography, -- To Detroit (Sarah)
  'Sarah',
  'Rachel',
  NOW() - interval '12 hours',
  NOW() + interval '1 year'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. CREATE NOTIFICATIONS for inbox testing
-- ============================================================================

-- Notification for Sarah about Marcus's response
INSERT INTO notifications (notification_id, user_id, type, payload, is_read, created_at)
VALUES (
  'n1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111', -- Sarah
  'RESPONSE_RECEIVED',
  jsonb_build_object(
    'prayer_id', 'p1111111-1111-1111-1111-111111111111',
    'response_id', 'r1111111-1111-1111-1111-111111111111',
    'responder_name', 'Marcus',
    'message', 'Sarah, I''m praying for you...',
    'content_type', 'text'
  ),
  false,
  NOW() - interval '1 day 20 hours'
) ON CONFLICT (notification_id) DO NOTHING;

-- Notification for Sarah about James's response
INSERT INTO notifications (notification_id, user_id, type, payload, is_read, created_at)
VALUES (
  'n2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111', -- Sarah
  'RESPONSE_RECEIVED',
  jsonb_build_object(
    'prayer_id', 'p1111111-1111-1111-1111-111111111111',
    'response_id', 'ra222222-2222-2222-2222-222222222222',
    'responder_name', 'James',
    'message', 'Praying for you right now, Sarah...',
    'content_type', 'text'
  ),
  false,
  NOW() - interval '1 day 10 hours'
) ON CONFLICT (notification_id) DO NOTHING;

-- Notification for Marcus about Jennifer's response
INSERT INTO notifications (notification_id, user_id, type, payload, is_read, created_at)
VALUES (
  'n3333333-3333-3333-3333-333333333333',
  'a2222222-2222-2222-2222-222222222222', -- Marcus
  'RESPONSE_RECEIVED',
  jsonb_build_object(
    'prayer_id', 'p2222222-2222-2222-2222-222222222222',
    'response_id', 'r2222222-2222-2222-2222-222222222222',
    'responder_name', 'Jennifer',
    'message', '90 days is incredible!...',
    'content_type', 'text'
  ),
  false,
  NOW() - interval '20 hours'
) ON CONFLICT (notification_id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count prayer responses
SELECT COUNT(*) as response_count FROM prayer_responses WHERE id LIKE 'r%';

-- Count prayer connections
SELECT COUNT(*) as connection_count FROM prayer_connections WHERE id LIKE 'c%';

-- Count notifications
SELECT COUNT(*) as notification_count FROM notifications WHERE notification_id LIKE 'n%';

-- Show connections with names (memorial lines)
SELECT
  replier_name || ' → ' || requester_name as connection,
  ST_AsText(from_location::geometry) as from_loc,
  ST_AsText(to_location::geometry) as to_loc,
  created_at
FROM prayer_connections
WHERE id LIKE 'c%'
ORDER BY created_at DESC;

-- Show conversation thread for Sarah's prayer (multiple responses)
SELECT
  COALESCE(pr.responder_name, 'Anonymous') as responder,
  pr.message,
  pr.created_at
FROM prayer_responses pr
WHERE pr.prayer_id = 'p1111111-1111-1111-1111-111111111111'
ORDER BY pr.created_at;
