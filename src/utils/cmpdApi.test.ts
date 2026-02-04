import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchCMPDTrafficEvents } from './cmpdApi';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('cmpdApi coordinate handling', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeEvent coordinate defaults - THE ISSUE', () => {
    it('currently defaults missing coordinates to 0,0 (Gulf of Guinea)', async () => {
      // Mock API response with missing coordinates
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            EventNo: 'TEST-001',
            EventDateTime: '2024-01-01T12:00:00',
            TypeDescription: 'Accident',
            Address: '123 Main St',
            // Missing latitude, longitude, xCoordinate, yCoordinate
          },
        ],
      });

      const events = await fetchCMPDTrafficEvents();

      // CURRENT BEHAVIOR: Missing coordinates default to 0
      // This is problematic because (0,0) is a valid location (Gulf of Guinea)
      // AND it passes the filterCharlotteBoundsEvents check (0 != null)

      // Since (0, 0) is not within Charlotte bounds, it should be filtered out
      // but let's verify the normalization behavior first
      expect(events).toHaveLength(0); // Should be filtered out by bounds check
    });

    it('should filter out events with 0,0 coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            EventNo: 'TEST-002',
            EventDateTime: '2024-01-01T12:00:00',
            TypeDescription: 'Accident',
            Address: '123 Main St',
            Latitude: 0,
            Longitude: 0,
          },
        ],
      });

      const events = await fetchCMPDTrafficEvents();

      // Events with (0, 0) coordinates should be filtered out
      // because they're not in Charlotte bounds
      expect(events).toHaveLength(0);
    });

    it('DESIRED: should not include events with undefined/null coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            EventNo: 'TEST-003',
            EventDateTime: '2024-01-01T12:00:00',
            TypeDescription: 'Accident',
            Address: 'Unknown location',
            Latitude: null,
            Longitude: null,
          },
          {
            EventNo: 'TEST-004',
            EventDateTime: '2024-01-01T12:00:00',
            TypeDescription: 'Accident',
            Address: '456 Main St',
            // Missing coordinates entirely
          },
        ],
      });

      const events = await fetchCMPDTrafficEvents();

      // Events without valid coordinates should be filtered out
      expect(events).toHaveLength(0);
    });
  });

  describe('valid coordinate handling', () => {
    it('includes events with valid Charlotte coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            EventNo: 'TEST-005',
            EventDateTime: '2024-01-01T12:00:00',
            AddedDateTimeString: '2024-01-01T11:00:00',
            TypeCode: '01',
            TypeDescription: 'Accident',
            TypeSubCode: 'A',
            TypeSubDescription: 'Property damage',
            Division: '1',
            Address: '123 Tryon St',
            Latitude: 35.2271, // Charlotte, NC
            Longitude: -80.8431,
            XCoordinate: 500000,
            YCoordinate: 600000,
          },
        ],
      });

      const events = await fetchCMPDTrafficEvents();

      expect(events).toHaveLength(1);
      expect(events[0].eventNo).toBe('TEST-005');
      expect(events[0].latitude).toBe(35.2271);
      expect(events[0].longitude).toBe(-80.8431);
    });

    it('filters out events outside Charlotte bounds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            EventNo: 'TEST-006',
            EventDateTime: '2024-01-01T12:00:00',
            TypeDescription: 'Accident',
            Address: 'New York',
            Latitude: 40.7128, // NYC - outside Charlotte bounds
            Longitude: -74.006,
          },
        ],
      });

      const events = await fetchCMPDTrafficEvents();

      // Should be filtered out by Charlotte bounds check
      expect(events).toHaveLength(0);
    });
  });

  describe('coordinate validation edge cases', () => {
    it('handles events with only latitude (missing longitude)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            EventNo: 'TEST-007',
            TypeDescription: 'Accident',
            Latitude: 35.2271,
            // Missing longitude
          },
        ],
      });

      const events = await fetchCMPDTrafficEvents();
      expect(events).toHaveLength(0);
    });

    it('handles events with only longitude (missing latitude)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            EventNo: 'TEST-008',
            TypeDescription: 'Accident',
            Longitude: -80.8431,
            // Missing latitude
          },
        ],
      });

      const events = await fetchCMPDTrafficEvents();
      expect(events).toHaveLength(0);
    });

    it('handles events with zero as legitimate coordinate value', async () => {
      // Edge case: What if there's a real location at latitude or longitude = 0?
      // The equator is at latitude 0, and the prime meridian is at longitude 0
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            EventNo: 'TEST-009',
            TypeDescription: 'Accident',
            Latitude: 0, // Equator
            Longitude: -80.8431, // Charlotte's longitude
          },
        ],
      });

      const events = await fetchCMPDTrafficEvents();

      // This would be in the Atlantic Ocean, not Charlotte, so should be filtered out
      expect(events).toHaveLength(0);
    });
  });
});
