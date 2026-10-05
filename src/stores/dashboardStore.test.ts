import { beforeEach, describe, expect, it } from 'vitest';
import { useDashboardStore } from './dashboardStore';

const STORAGE_KEY = 'charlotte-dashboard-storage';

describe('dashboardStore persistence migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('drops the removed flight-tracker widget and its layout items from saved state', async () => {
    const layoutItem = (i: string) => ({ i, x: 0, y: 0, w: 4, h: 4 });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 5,
        state: {
          hiddenAlertSources: [],
          widgets: [
            { id: 'alerts-1', type: 'alerts', title: 'Alerts', visible: true },
            { id: 'flights-1', type: 'flight-tracker', title: 'Flight Tracker', visible: true },
          ],
          layouts: {
            lg: [layoutItem('alerts-1'), layoutItem('flights-1')],
            xxs: [layoutItem('flights-1'), layoutItem('alerts-1')],
          },
        },
      })
    );

    await useDashboardStore.persist.rehydrate();

    const { widgets, layouts } = useDashboardStore.getState();
    expect(widgets.map(w => w.id)).toEqual(['alerts-1']);
    expect(layouts.lg?.map(item => item.i)).toEqual(['alerts-1']);
    expect(layouts.xxs?.map(item => item.i)).toEqual(['alerts-1']);
  });

  it('leaves current-version state untouched', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 6,
        state: {
          hiddenAlertSources: [],
          widgets: [{ id: 'news-1', type: 'news', title: 'News', visible: true }],
          layouts: { lg: [{ i: 'news-1', x: 0, y: 0, w: 4, h: 4 }] },
        },
      })
    );

    await useDashboardStore.persist.rehydrate();

    expect(useDashboardStore.getState().widgets.map(w => w.id)).toEqual(['news-1']);
  });
});
