import { describe, it, expect } from 'vitest';
import {
  getRouteGeometry,
  getPolylineForMileRange,
  getPolylineForSingleMile,
} from './routeGeometry';

describe('getRouteGeometry', () => {
  it('returns geometry for known routes', () => {
    const route = getRouteGeometry('I-77');
    expect(route).not.toBeNull();
    expect(route!.routeId).toBe('I-77');
    expect(route!.points.length).toBeGreaterThan(10);
  });

  it('returns geometry for I-485', () => {
    const route = getRouteGeometry('I-485');
    expect(route).not.toBeNull();
    expect(route!.points.length).toBeGreaterThan(100);
    // I-485 is a ~66 mile loop
    expect(route!.maxMile).toBeGreaterThan(50);
  });

  it('returns null for unknown routes', () => {
    expect(getRouteGeometry('I-40')).toBeNull();
    expect(getRouteGeometry('Unknown')).toBeNull();
  });
});

describe('getPolylineForMileRange', () => {
  it('returns polyline for valid range on known route', () => {
    const points = getPolylineForMileRange('I-77', 5, 10);
    expect(points).not.toBeNull();
    expect(points!.length).toBeGreaterThanOrEqual(2);
    // Each point is [lat, lng]
    for (const point of points!) {
      expect(point).toHaveLength(2);
      expect(point[0]).toBeGreaterThan(34);
      expect(point[0]).toBeLessThan(36);
      expect(point[1]).toBeGreaterThan(-82);
      expect(point[1]).toBeLessThan(-80);
    }
  });

  it('handles reversed mile markers', () => {
    const forward = getPolylineForMileRange('I-77', 5, 10);
    const reversed = getPolylineForMileRange('I-77', 10, 5);
    expect(forward).not.toBeNull();
    expect(reversed).not.toBeNull();
    // Should produce the same polyline
    expect(forward!.length).toBe(reversed!.length);
  });

  it('clamps to route bounds', () => {
    const route = getRouteGeometry('I-277');
    expect(route).not.toBeNull();
    // Request range beyond route bounds
    const points = getPolylineForMileRange('I-277', -10, 100);
    expect(points).not.toBeNull();
    // Should be clamped to actual route extent
    expect(points!.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null for zero-length range after clamping', () => {
    const route = getRouteGeometry('I-77');
    expect(route).not.toBeNull();
    // Range entirely outside route bounds
    const points = getPolylineForMileRange('I-77', 999, 1000);
    expect(points).toBeNull();
  });

  it('returns null for unknown route', () => {
    expect(getPolylineForMileRange('I-40', 0, 10)).toBeNull();
  });

  it('produces points that progress geographically', () => {
    const points = getPolylineForMileRange('I-77', 5, 15);
    expect(points).not.toBeNull();
    expect(points!.length).toBeGreaterThanOrEqual(3);
    // I-77 runs north-south, so latitude should generally change
    const lats = points!.map(p => p[0]);
    const latRange = Math.max(...lats) - Math.min(...lats);
    expect(latRange).toBeGreaterThan(0.01);
  });
});

describe('getPolylineForSingleMile', () => {
  it('returns a short polyline for a valid mile marker', () => {
    const points = getPolylineForSingleMile('I-77', 15);
    expect(points).not.toBeNull();
    expect(points!.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null for out-of-range mile marker', () => {
    expect(getPolylineForSingleMile('I-77', 999)).toBeNull();
  });

  it('returns null for unknown route', () => {
    expect(getPolylineForSingleMile('I-40', 10)).toBeNull();
  });
});
