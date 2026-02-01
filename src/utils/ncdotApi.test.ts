import { describe, it, expect } from 'vitest';
import {
  isCharlotteRoad,
  getCharlotteRoadDisplay,
  extractMileMarkers,
  extractProjectNumber,
} from './ncdotApi';

describe('isCharlotteRoad', () => {
  it('matches interstates', () => {
    expect(isCharlotteRoad('I-77')).toBe(true);
    expect(isCharlotteRoad('I-85')).toBe(true);
    expect(isCharlotteRoad('I-485')).toBe(true);
    expect(isCharlotteRoad('I-277')).toBe(true);
  });

  it('matches interstate variations', () => {
    expect(isCharlotteRoad('I 77 N')).toBe(true);
    expect(isCharlotteRoad('INTERSTATE 85 S')).toBe(true);
    expect(isCharlotteRoad('I 485')).toBe(true);
  });

  it('matches US routes', () => {
    expect(isCharlotteRoad('US 74 E')).toBe(true);
    expect(isCharlotteRoad('US-74')).toBe(true);
    expect(isCharlotteRoad('US 21')).toBe(true);
    expect(isCharlotteRoad('US-21 N')).toBe(true);
  });

  it('matches NC routes', () => {
    expect(isCharlotteRoad('NC 16')).toBe(true);
    expect(isCharlotteRoad('NC-16')).toBe(true);
    expect(isCharlotteRoad('NC 49')).toBe(true);
    expect(isCharlotteRoad('NC 51')).toBe(true);
  });

  it('matches named roads', () => {
    expect(isCharlotteRoad('BILLY GRAHAM PKWY')).toBe(true);
    expect(isCharlotteRoad('INDEPENDENCE BLVD')).toBe(true);
    expect(isCharlotteRoad('WILKINSON BLVD')).toBe(true);
  });

  it('rejects non-Charlotte roads', () => {
    expect(isCharlotteRoad('I-40')).toBe(false);
    expect(isCharlotteRoad('US 1')).toBe(false);
    expect(isCharlotteRoad('Main Street')).toBe(false);
    expect(isCharlotteRoad('NC 100')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isCharlotteRoad('i-77')).toBe(true);
    expect(isCharlotteRoad('billy graham pkwy')).toBe(true);
  });
});

describe('getCharlotteRoadDisplay', () => {
  it('returns display name for interstates', () => {
    expect(getCharlotteRoadDisplay('I-77 N')).toBe('I-77');
    expect(getCharlotteRoadDisplay('INTERSTATE 85')).toBe('I-85');
    expect(getCharlotteRoadDisplay('I 485 E')).toBe('I-485');
  });

  it('returns display name for US routes', () => {
    expect(getCharlotteRoadDisplay('US 74 E')).toBe('US 74');
    expect(getCharlotteRoadDisplay('US-21')).toBe('US 21');
  });

  it('returns display name for named roads', () => {
    expect(getCharlotteRoadDisplay('BILLY GRAHAM PKWY')).toBe('Billy Graham Pkwy');
    expect(getCharlotteRoadDisplay('INDEPENDENCE BLVD')).toBe('US 74');
  });

  it('returns raw name if not a Charlotte road', () => {
    expect(getCharlotteRoadDisplay('I-40')).toBe('I-40');
    expect(getCharlotteRoadDisplay('Random Road')).toBe('Random Road');
  });
});

describe('extractMileMarkers', () => {
  it('extracts mile marker range', () => {
    expect(extractMileMarkers('Mile Marker 22.6 to 22.4')).toEqual({
      start: 22.6,
      end: 22.4,
    });
  });

  it('extracts integer mile markers', () => {
    expect(extractMileMarkers('Mile Marker 10 to 8')).toEqual({
      start: 10,
      end: 8,
    });
  });

  it('returns null when no mile markers found', () => {
    expect(extractMileMarkers('Near exit 23')).toBeNull();
    expect(extractMileMarkers('')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(extractMileMarkers('mile marker 5.5 to 3.2')).toEqual({
      start: 5.5,
      end: 3.2,
    });
  });
});

describe('extractProjectNumber', () => {
  it('extracts C-prefixed project number', () => {
    expect(extractProjectNumber('Construction project C204556')).toBe('C204556');
  });

  it('extracts project number with hyphen', () => {
    expect(extractProjectNumber('Project C-204556 in progress')).toBe('C204556');
  });

  it('adds C prefix when missing', () => {
    expect(extractProjectNumber('Project 204556')).toBe('C204556');
  });

  it('returns null when no project number found', () => {
    expect(extractProjectNumber('Road maintenance')).toBeNull();
    expect(extractProjectNumber('')).toBeNull();
  });

  it('normalizes to uppercase', () => {
    expect(extractProjectNumber('c204556')).toBe('C204556');
  });
});
