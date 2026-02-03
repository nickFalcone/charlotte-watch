import { describe, it, expect } from 'vitest';
import { dedupeBy } from './dedupe';

describe('dedupeBy', () => {
  it('removes duplicate items based on key function', () => {
    const items = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '1', name: 'Alice Duplicate' },
      { id: '3', name: 'Charlie' },
    ];

    const result = dedupeBy(items, item => item.id);

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
    ]);
  });

  it('keeps first occurrence when duplicates exist', () => {
    const items = [
      { id: '1', value: 'first' },
      { id: '1', value: 'second' },
      { id: '1', value: 'third' },
    ];

    const result = dedupeBy(items, item => item.id);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('first');
  });

  it('handles empty array', () => {
    const result = dedupeBy<{ id: string }>([], item => item.id);

    expect(result).toEqual([]);
  });

  it('handles array with no duplicates', () => {
    const items = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
    ];

    const result = dedupeBy(items, item => item.id);

    expect(result).toHaveLength(3);
    expect(result).toEqual(items);
  });

  it('handles array where all items are duplicates', () => {
    const items = [
      { id: 'same', value: 1 },
      { id: 'same', value: 2 },
      { id: 'same', value: 3 },
    ];

    const result = dedupeBy(items, item => item.id);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'same', value: 1 });
  });

  it('handles numeric keys', () => {
    const items = [
      { eventNo: 123, data: 'a' },
      { eventNo: 456, data: 'b' },
      { eventNo: 123, data: 'c' },
    ];

    const result = dedupeBy(items, item => item.eventNo.toString());

    expect(result).toHaveLength(2);
    expect(result[0].eventNo).toBe(123);
    expect(result[1].eventNo).toBe(456);
  });

  it('handles complex key extraction', () => {
    const items = [
      { type: 'event', id: '1', data: 'a' },
      { type: 'event', id: '2', data: 'b' },
      { type: 'event', id: '1', data: 'c' },
      { type: 'alert', id: '1', data: 'd' }, // Different type, same id
    ];

    // Key combines type and id
    const result = dedupeBy(items, item => `${item.type}:${item.id}`);

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { type: 'event', id: '1', data: 'a' },
      { type: 'event', id: '2', data: 'b' },
      { type: 'alert', id: '1', data: 'd' },
    ]);
  });

  it('handles string array', () => {
    const items = ['apple', 'banana', 'apple', 'cherry', 'banana'];

    const result = dedupeBy(items, item => item);

    expect(result).toEqual(['apple', 'banana', 'cherry']);
  });

  it('handles number array', () => {
    const items = [1, 2, 3, 2, 4, 1, 5];

    const result = dedupeBy(items, item => item.toString());

    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('maintains original order', () => {
    const items = [
      { id: '3', order: 1 },
      { id: '1', order: 2 },
      { id: '2', order: 3 },
      { id: '1', order: 4 },
      { id: '3', order: 5 },
    ];

    const result = dedupeBy(items, item => item.id);

    expect(result).toEqual([
      { id: '3', order: 1 },
      { id: '1', order: 2 },
      { id: '2', order: 3 },
    ]);
  });

  it('works with single item array', () => {
    const items = [{ id: '1', name: 'Alice' }];

    const result = dedupeBy(items, item => item.id);

    expect(result).toEqual(items);
  });

  it('uses case-sensitive keys by default', () => {
    const items = [
      { id: 'ABC', name: 'Upper' },
      { id: 'abc', name: 'Lower' },
      { id: 'ABC', name: 'Upper Duplicate' },
    ];

    const result = dedupeBy(items, item => item.id);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { id: 'ABC', name: 'Upper' },
      { id: 'abc', name: 'Lower' },
    ]);
  });

  it('can implement case-insensitive deduplication with custom key function', () => {
    const items = [
      { id: 'ABC', name: 'Upper' },
      { id: 'abc', name: 'Lower' },
      { id: 'ABC', name: 'Upper Duplicate' },
    ];

    const result = dedupeBy(items, item => item.id.toLowerCase());

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Upper');
  });
});
