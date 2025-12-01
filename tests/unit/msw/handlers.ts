/**
 * MSW (Mock Service Worker) request handlers
 * Defines default mock responses for API endpoints
 */

import { http, HttpResponse } from 'msw';
import { createMockPrayer, createMockPrayerResponse } from '../factories/prayer';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const MAPBOX_API_URL = 'https://api.mapbox.com';

// ============================================================================
// Supabase Auth Handlers
// ============================================================================

export const authHandlers = [
  // Sign in with password
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const body = await request.json();

    // @ts-expect-error - body type
    if (body.email === 'error@test.com') {
      return HttpResponse.json(
        { error: 'Invalid credentials', error_description: 'Email or password is incorrect' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        // @ts-expect-error - body type
        email: body.email,
        app_metadata: {},
        user_metadata: { name: 'Test User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
    });
  }),

  // Sign up
  http.post(`${SUPABASE_URL}/auth/v1/signup`, async ({ request }) => {
    const body = await request.json();

    // @ts-expect-error - body type
    if (body.email === 'exists@test.com') {
      return HttpResponse.json(
        { error: 'User already registered', error_description: 'A user with this email already exists' },
        { status: 422 }
      );
    }

    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        // @ts-expect-error - body type
        email: body.email,
        app_metadata: {},
        // @ts-expect-error - body type
        user_metadata: body.data || {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
    });
  }),

  // Sign out
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Get session
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: { name: 'Test User' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    });
  }),
];

// ============================================================================
// Supabase Database Handlers
// ============================================================================

export const databaseHandlers = [
  // Get prayers
  http.get(`${SUPABASE_URL}/rest/v1/prayers`, () => {
    const prayers = [
      createMockPrayer(),
      createMockPrayer({ content_type: 'audio' }),
      createMockPrayer({ content_type: 'video' }),
    ];

    return HttpResponse.json(prayers);
  }),

  // Get single prayer
  http.get(`${SUPABASE_URL}/rest/v1/prayers/:id`, ({ params }) => {
    const prayer = createMockPrayer({ id: params.id as string });
    return HttpResponse.json([prayer]);
  }),

  // Insert prayer
  http.post(`${SUPABASE_URL}/rest/v1/prayers`, async ({ request }) => {
    const body = await request.json();
    const prayer = createMockPrayer(body as Partial<ReturnType<typeof createMockPrayer>>);
    return HttpResponse.json([prayer], { status: 201 });
  }),

  // Update prayer
  http.patch(`${SUPABASE_URL}/rest/v1/prayers`, async ({ request }) => {
    const body = await request.json();
    const prayer = createMockPrayer(body as Partial<ReturnType<typeof createMockPrayer>>);
    return HttpResponse.json([prayer]);
  }),

  // Delete prayer
  http.delete(`${SUPABASE_URL}/rest/v1/prayers`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Get prayer responses
  http.get(`${SUPABASE_URL}/rest/v1/prayer_responses`, () => {
    const responses = [
      createMockPrayerResponse(),
      createMockPrayerResponse({ content_type: 'audio' }),
    ];

    return HttpResponse.json(responses);
  }),

  // Insert prayer response
  http.post(`${SUPABASE_URL}/rest/v1/prayer_responses`, async ({ request }) => {
    const body = await request.json();
    const response = createMockPrayerResponse(body as Partial<ReturnType<typeof createMockPrayerResponse>>);
    return HttpResponse.json([response], { status: 201 });
  }),

  // RPC: Get nearby prayers
  http.post(`${SUPABASE_URL}/rest/v1/rpc/get_nearby_prayers`, () => {
    const prayers = [
      createMockPrayer(),
      createMockPrayer(),
      createMockPrayer(),
    ];

    return HttpResponse.json(prayers);
  }),

  // RPC: Create prayer connection
  http.post(`${SUPABASE_URL}/rest/v1/rpc/create_prayer_connection`, async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      id: 'mock-connection-id',
      // @ts-expect-error - body type
      prayer_id: body.p_prayer_id,
      // @ts-expect-error - body type
      prayer_response_id: body.p_prayer_response_id,
      from_location: { lat: 40.7128, lng: -74.006 },
      to_location: { lat: 51.5074, lng: -0.1278 },
      requester_name: 'Requester',
      replier_name: 'Replier',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }),
];

// ============================================================================
// Supabase Storage Handlers
// ============================================================================

export const storageHandlers = [
  // Upload file
  http.post(`${SUPABASE_URL}/storage/v1/object/:bucket/*`, async ({ params }) => {
    const path = params['*'];

    if (typeof path === 'string' && path.includes('error')) {
      return HttpResponse.json(
        { error: 'Upload failed', message: 'Storage error' },
        { status: 500 }
      );
    }

    return HttpResponse.json({
      Key: `${params.bucket}/${path}`,
      Id: 'mock-file-id',
    });
  }),

  // Download file
  http.get(`${SUPABASE_URL}/storage/v1/object/:bucket/*`, ({ params }) => {
    const path = params['*'];

    if (typeof path === 'string' && path.includes('error')) {
      return HttpResponse.json(
        { error: 'Download failed', message: 'File not found' },
        { status: 404 }
      );
    }

    // Return mock file content
    const mockContent = new Uint8Array([1, 2, 3, 4, 5]);
    return HttpResponse.arrayBuffer(mockContent.buffer);
  }),

  // Delete file
  http.delete(`${SUPABASE_URL}/storage/v1/object/:bucket/*`, () => {
    return HttpResponse.json({ message: 'File deleted successfully' });
  }),

  // List files
  http.get(`${SUPABASE_URL}/storage/v1/object/list/:bucket`, () => {
    return HttpResponse.json([
      { name: 'file1.mp3', id: 'file1', created_at: new Date().toISOString() },
      { name: 'file2.mp4', id: 'file2', created_at: new Date().toISOString() },
    ]);
  }),
];

// ============================================================================
// Mapbox Handlers
// ============================================================================

export const mapboxHandlers = [
  // Geocoding
  http.get(`${MAPBOX_API_URL}/geocoding/v5/mapbox.places/:query.json`, ({ params }) => {
    return HttpResponse.json({
      type: 'FeatureCollection',
      query: [params.query],
      features: [
        {
          id: 'place.1',
          type: 'Feature',
          place_type: ['place'],
          relevance: 1,
          properties: {},
          text: 'New York',
          place_name: 'New York, NY, United States',
          center: [-74.006, 40.7128],
          geometry: {
            type: 'Point',
            coordinates: [-74.006, 40.7128],
          },
        },
      ],
    });
  }),

  // Directions
  http.get(`${MAPBOX_API_URL}/directions/v5/mapbox/driving/:coordinates`, () => {
    return HttpResponse.json({
      routes: [
        {
          distance: 1000,
          duration: 300,
          geometry: 'mock-geometry',
          legs: [],
        },
      ],
    });
  }),
];

// ============================================================================
// Error Simulation Handlers
// ============================================================================

/**
 * Create handlers that simulate network errors
 */
export function createErrorHandlers() {
  return [
    http.post(`${SUPABASE_URL}/rest/v1/prayers`, () => {
      return HttpResponse.json(
        { error: 'Database error', message: 'Failed to insert prayer' },
        { status: 500 }
      );
    }),

    http.get(`${SUPABASE_URL}/rest/v1/prayers`, () => {
      return HttpResponse.json(
        { error: 'Database error', message: 'Failed to fetch prayers' },
        { status: 500 }
      );
    }),
  ];
}

// ============================================================================
// Default Handlers Export
// ============================================================================

/**
 * Default request handlers for all API endpoints
 */
export const handlers = [
  ...authHandlers,
  ...databaseHandlers,
  ...storageHandlers,
  ...mapboxHandlers,
];
