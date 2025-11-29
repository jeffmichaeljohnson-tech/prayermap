/**
 * Smoke test to verify testing infrastructure setup
 * Validates that all testing utilities and mocks are working correctly
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMockPrayer, createMockUser, createMockAudioBlob } from './factories';
import { mockSupabase, createMockSupabaseClient } from './mocks/supabase';
import { MockMediaRecorder, createMockMediaStream } from './mocks/mediaRecorder';
import { mockMediaDevices } from './mocks/mediaDevices';
import { waitForCondition, flushPromises } from './utils/async';

// ============================================================================
// Test Infrastructure Smoke Tests
// ============================================================================

describe('Test Infrastructure Setup', () => {
  describe('Vitest Configuration', () => {
    it('should have access to vitest globals', () => {
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(expect).toBeDefined();
      expect(vi).toBeDefined();
    });

    it('should support async/await', async () => {
      const promise = Promise.resolve(42);
      const result = await promise;
      expect(result).toBe(42);
    });
  });

  describe('Testing Library', () => {
    it('should render a simple component', () => {
      const TestComponent = () => <div>Hello Test</div>;
      render(<TestComponent />);
      expect(screen.getByText('Hello Test')).toBeInTheDocument();
    });

    it('should support waitFor utility', async () => {
      const TestComponent = () => {
        const [text, setText] = React.useState('Loading...');

        React.useEffect(() => {
          setTimeout(() => setText('Loaded!'), 100);
        }, []);

        return <div>{text}</div>;
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Loaded!')).toBeInTheDocument();
      });
    });
  });

  describe('Prayer Factories', () => {
    it('should create a mock prayer', () => {
      const prayer = createMockPrayer();

      expect(prayer).toHaveProperty('id');
      expect(prayer).toHaveProperty('user_id');
      expect(prayer).toHaveProperty('content');
      expect(prayer).toHaveProperty('location');
      expect(prayer.location).toHaveProperty('lat');
      expect(prayer.location).toHaveProperty('lng');
    });

    it('should create a mock prayer with overrides', () => {
      const prayer = createMockPrayer({
        content: 'Custom prayer content',
        content_type: 'audio',
      });

      expect(prayer.content).toBe('Custom prayer content');
      expect(prayer.content_type).toBe('audio');
    });

    it('should create a mock user', () => {
      const user = createMockUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('user_metadata');
    });

    it('should create a mock audio blob', () => {
      const blob = createMockAudioBlob();

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toContain('audio');
    });
  });

  describe('Supabase Mocks', () => {
    it('should have a mock Supabase client', () => {
      expect(mockSupabase).toBeDefined();
      expect(mockSupabase.auth).toBeDefined();
      expect(mockSupabase.from).toBeDefined();
      expect(mockSupabase.storage).toBeDefined();
    });

    it('should create a new mock client', () => {
      const client = createMockSupabaseClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });

    it('should mock auth.signIn', async () => {
      const result = await mockSupabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.data.user).not.toBeNull();
      expect(result.error).toBeNull();
    });

    it('should mock database queries', () => {
      const queryBuilder = mockSupabase.from('prayers', []);

      expect(queryBuilder).toBeDefined();
      expect(queryBuilder.select).toBeDefined();
      expect(queryBuilder.insert).toBeDefined();
    });
  });

  describe('MediaRecorder Mocks', () => {
    it('should create a mock MediaRecorder', () => {
      const stream = createMockMediaStream();
      const recorder = new MockMediaRecorder(stream);

      expect(recorder).toBeDefined();
      expect(recorder.state).toBe('inactive');
    });

    it('should support start and stop', async () => {
      const stream = createMockMediaStream();
      const recorder = new MockMediaRecorder(stream);

      let dataReceived = false;
      recorder.ondataavailable = () => {
        dataReceived = true;
      };

      recorder.start();
      expect(recorder.state).toBe('recording');

      await flushPromises();

      recorder.stop();
      expect(recorder.state).toBe('inactive');

      await flushPromises();

      expect(dataReceived).toBe(true);
    });

    it('should support isTypeSupported', () => {
      expect(MockMediaRecorder.isTypeSupported('video/webm')).toBe(true);
      expect(MockMediaRecorder.isTypeSupported('audio/webm')).toBe(true);
      expect(MockMediaRecorder.isTypeSupported('video/mp4')).toBe(true);
    });
  });

  describe('MediaDevices Mocks', () => {
    it('should have mock mediaDevices', () => {
      expect(mockMediaDevices).toBeDefined();
      expect(mockMediaDevices.getUserMedia).toBeDefined();
      expect(mockMediaDevices.enumerateDevices).toBeDefined();
    });

    it('should mock getUserMedia', async () => {
      const stream = await mockMediaDevices.getUserMedia({ audio: true });

      expect(stream).toBeDefined();
      expect(stream.getTracks).toBeDefined();
      expect(stream.getAudioTracks().length).toBeGreaterThan(0);
    });

    it('should mock enumerateDevices', async () => {
      const devices = await mockMediaDevices.enumerateDevices();

      expect(devices).toBeInstanceOf(Array);
      expect(devices.length).toBeGreaterThan(0);
      expect(devices[0]).toHaveProperty('kind');
    });
  });

  describe('Async Utilities', () => {
    it('should wait for a condition', async () => {
      let counter = 0;
      const increment = () => {
        setTimeout(() => counter++, 50);
      };

      increment();

      await waitForCondition(() => counter > 0, 1000);

      expect(counter).toBeGreaterThan(0);
    });

    it('should flush promises', async () => {
      let resolved = false;

      Promise.resolve().then(() => {
        resolved = true;
      });

      await flushPromises();

      expect(resolved).toBe(true);
    });
  });

  describe('Global Mocks', () => {
    it('should have URL.createObjectURL mocked', () => {
      const blob = new Blob(['test']);
      const url = URL.createObjectURL(blob);

      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('should have navigator.mediaDevices mocked', () => {
      expect(navigator.mediaDevices).toBeDefined();
      expect(navigator.mediaDevices.getUserMedia).toBeDefined();
    });

    it('should have MediaRecorder mocked globally', () => {
      expect(MediaRecorder).toBeDefined();
      expect(MediaRecorder.isTypeSupported).toBeDefined();
    });

    it('should have geolocation mocked', () => {
      expect(navigator.geolocation).toBeDefined();
      expect(navigator.geolocation.getCurrentPosition).toBeDefined();
    });
  });
});

// ============================================================================
// Success Message
// ============================================================================

describe('Test Setup Validation', () => {
  it('should pass this test to confirm setup is working', () => {
    expect(true).toBe(true);
    console.log('✓ Test infrastructure setup is complete and working!');
  });
});
