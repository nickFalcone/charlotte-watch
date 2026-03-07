import { Children, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  TabsContainer,
  TabList,
  TabTrigger,
  TabContent,
  TabContentForceMount,
} from './WidgetTabs.styles';

export interface TabPanelProps {
  /** Tab identifier */
  value: string;
  /** Display label shown in the tab trigger */
  label: string;
  /** Keep mounted when inactive (useful for maps or expensive content) */
  forceMount?: boolean;
  children: ReactNode;
}

/**
 * Data-only component that defines a tab panel.
 * Does not render on its own -- consumed by WidgetTabs.
 */
export function TabPanel(_props: TabPanelProps): ReactElement {
  return null as unknown as ReactElement;
}

// Sentinel for identifying TabPanel elements
TabPanel.displayName = 'TabPanel';

export interface WidgetTabsProps {
  /** Initial active tab (uncontrolled mode) */
  defaultValue: string;
  /** Active tab value (controlled mode) */
  value?: string;
  /** Called when the active tab changes */
  onValueChange?: (value: string) => void;
  /** Accessible label for the tab list (announces context to screen readers) */
  'aria-label'?: string;
  children: ReactNode;
}

interface ParsedTab {
  value: string;
  label: string;
  forceMount?: boolean;
  children: ReactNode;
}

function parseTabs(children: ReactNode): ParsedTab[] {
  const tabs: ParsedTab[] = [];
  Children.forEach(children, child => {
    if (isValidElement<TabPanelProps>(child) && child.type === TabPanel) {
      tabs.push({
        value: child.props.value,
        label: child.props.label,
        forceMount: child.props.forceMount,
        children: child.props.children,
      });
    }
  });
  return tabs;
}

/**
 * Reusable tab system for dashboard widgets.
 *
 * - 1 TabPanel: renders content directly with no tab UI
 * - 2+ TabPanels: renders a Radix Tabs bar with tab content panels
 *
 * Panels with `forceMount` stay mounted when inactive (hidden via CSS).
 */
export function WidgetTabs({
  defaultValue,
  value,
  onValueChange,
  'aria-label': ariaLabel,
  children,
}: WidgetTabsProps) {
  const tabs = parseTabs(children);

  // Track active tab for forceMount visibility toggling
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = value ?? internalValue;

  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  // Single tab: render content directly, no tab UI
  if (tabs.length <= 1) {
    return <>{tabs[0]?.children}</>;
  }

  return (
    <TabsContainer
      defaultValue={value === undefined ? defaultValue : undefined}
      value={value}
      onValueChange={handleValueChange}
    >
      <TabList aria-label={ariaLabel}>
        {tabs.map(tab => (
          <TabTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabTrigger>
        ))}
      </TabList>

      {tabs.map(tab =>
        tab.forceMount ? (
          <Tabs.Content key={tab.value} value={tab.value} forceMount asChild>
            <TabContentForceMount $active={activeValue === tab.value}>
              {tab.children}
            </TabContentForceMount>
          </Tabs.Content>
        ) : (
          <TabContent key={tab.value} value={tab.value}>
            {tab.children}
          </TabContent>
        )
      )}
    </TabsContainer>
  );
}
