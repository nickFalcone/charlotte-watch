import { describe, it, expect } from 'vitest';
import { getDirectionLabel, findNearestStation } from './transitHelpers';
import { BLUE_LINE_STATIONS, GOLD_LINE_STATIONS } from '../data/transitRoutes';

describe('getDirectionLabel', () => {
  it('returns Northbound for bearing 0 (due north)', () => {
    expect(getDirectionLabel(0)).toBe('Northbound');
  });

  it('returns Northbound for bearing just below 45 (NE boundary)', () => {
    expect(getDirectionLabel(44)).toBe('Northbound');
  });

  it('returns Northbound for bearing 315 and above (NW boundary)', () => {
    expect(getDirectionLabel(315)).toBe('Northbound');
    expect(getDirectionLabel(359)).toBe('Northbound');
  });

  it('returns Eastbound for bearing 45 (boundary)', () => {
    expect(getDirectionLabel(45)).toBe('Eastbound');
  });

  it('returns Eastbound for bearing just below 135', () => {
    expect(getDirectionLabel(134)).toBe('Eastbound');
  });

  it('returns Southbound for bearing 135 (boundary)', () => {
    expect(getDirectionLabel(135)).toBe('Southbound');
  });

  it('returns Southbound for bearing just below 225', () => {
    expect(getDirectionLabel(224)).toBe('Southbound');
  });

  it('returns Westbound for bearing 225 (boundary)', () => {
    expect(getDirectionLabel(225)).toBe('Westbound');
  });

  it('returns Westbound for bearing just below 315', () => {
    expect(getDirectionLabel(314)).toBe('Westbound');
  });
});

describe('findNearestStation', () => {
  it('returns the station at its exact coordinates', () => {
    const station = BLUE_LINE_STATIONS[0];
    expect(findNearestStation(station.lat, station.lng, '501')).toEqual(station);
  });

  it('returns the nearest Blue Line station for routeId 501', () => {
    // Coordinates very close to UNC Charlotte (last Blue Line station)
    const unc = BLUE_LINE_STATIONS[BLUE_LINE_STATIONS.length - 1];
    const result = findNearestStation(unc.lat + 0.0001, unc.lng + 0.0001, '501');
    expect(result?.name).toBe(unc.name);
  });

  it('returns the nearest Gold Line station for routeId 510', () => {
    // Coordinates very close to Tryon St (mid-route Gold Line station)
    const tryon = GOLD_LINE_STATIONS.find(s => s.name === 'Tryon St')!;
    const result = findNearestStation(tryon.lat + 0.0001, tryon.lng + 0.0001, '510');
    expect(result?.name).toBe(tryon.name);
  });

  it('searches Blue Line stations for routeId 501, not Gold Line', () => {
    // I-485/South Blvd is only on the Blue Line
    const blueOnly = BLUE_LINE_STATIONS.find(s => s.name === 'I-485/South Blvd')!;
    const result = findNearestStation(blueOnly.lat, blueOnly.lng, '501');
    expect(result?.name).toBe('I-485/South Blvd');
  });

  it('returns null for unknown routeId', () => {
    const goldStation = GOLD_LINE_STATIONS[0];
    const result = findNearestStation(goldStation.lat, goldStation.lng, '999');
    expect(result).toBeNull();
  });

  it('returns a station from the correct line when same coordinates queried on different routes', () => {
    // CTC/Arena appears on both lines but with slightly different coordinates
    const blueCTC = BLUE_LINE_STATIONS.find(s => s.name === 'CTC/Arena (7th St)')!;
    const goldCTC = GOLD_LINE_STATIONS.find(s => s.name === 'CTC/Arena')!;

    const blueResult = findNearestStation(blueCTC.lat, blueCTC.lng, '501');
    const goldResult = findNearestStation(blueCTC.lat, blueCTC.lng, '510');

    expect(blueResult?.name).toBe(blueCTC.name);
    // Gold result should be the nearest Gold Line station to those Blue Line coords
    expect(GOLD_LINE_STATIONS.map(s => s.name)).toContain(goldResult?.name);
    expect(goldResult?.name).toBe(goldCTC.name);
  });
});
