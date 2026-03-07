import { useState, useEffect, useRef, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useDashboardStore } from '../../stores';
import { PopoverArrow } from '../common';
import dragIcon from '../../assets/icons/drag.svg';
import unlockedIcon from '../../assets/icons/unlocked.svg';
import closeIcon from '../../assets/icons/close.svg';
import { DragHandle, WidgetControls, WidgetTitleSection } from '../Widget/WidgetWrapper.styles';
import {
  TourButton,
  TourContent,
  TourBody,
  TourDot,
  TourDots,
  TourFooter,
  TourHintIcon,
  TourHintItem,
  TourHintList,
  TourPreviewIcon,
  TourPreviewLabel,
  TourResizeCorner,
  TourTitle,
  TourWidgetPreview,
} from './OnboardingTour.styles';

const STORAGE_KEY = 'charlotte-onboarding-seen';

interface OnboardingTourProps {
  children: ReactNode;
}

export function OnboardingTour({ children }: OnboardingTourProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const totalWidgets = useDashboardStore(state => state.widgets.length);
  const hiddenCount = useDashboardStore(state => state.widgets.filter(w => !w.visible).length);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      setOpen(true);
    }
  }, []);

  // Move focus to the action button whenever the step changes or the tour opens
  useEffect(() => {
    if (open) {
      actionButtonRef.current?.focus();
    }
  }, [open, step]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  }

  // Close without marking as seen — tour will reappear on next page load
  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Anchor asChild>{children}</Popover.Anchor>
      <Popover.Portal>
        <TourContent
          side="bottom"
          sideOffset={10}
          aria-label="Getting started"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <PopoverArrow />

          {step === 0 ? (
            <>
              <TourTitle>Some widgets are hidden</TourTitle>
              <TourBody>
                Click &ldquo;Manage Widgets&rdquo; to show or hide any of the {totalWidgets}{' '}
                available widgets.{' '}
                {hiddenCount > 0
                  ? `${hiddenCount} are currently hidden.`
                  : 'All are currently visible.'}
              </TourBody>
            </>
          ) : (
            <>
              <TourTitle>Customize your layout</TourTitle>

              {/* Decorative mini widget header showing the controls in context */}
              <TourWidgetPreview aria-hidden="true">
                <WidgetTitleSection>
                  <DragHandle src={dragIcon} alt="" />
                  <TourPreviewLabel>Widget Name</TourPreviewLabel>
                </WidgetTitleSection>
                <WidgetControls>
                  <TourPreviewIcon src={unlockedIcon} alt="" />
                  <TourPreviewIcon src={closeIcon} alt="" />
                </WidgetControls>
              </TourWidgetPreview>

              <TourHintList>
                <TourHintItem>
                  <TourHintIcon src={dragIcon} alt="" aria-hidden />
                  Drag the header to move
                </TourHintItem>
                <TourHintItem>
                  <TourResizeCorner aria-hidden />
                  Drag the bottom-right corner to resize
                </TourHintItem>
                <TourHintItem>
                  <TourHintIcon src={unlockedIcon} alt="" aria-hidden />
                  Click the lock to lock position and size
                </TourHintItem>
                <TourHintItem>
                  <TourHintIcon src={closeIcon} alt="" aria-hidden />
                  Click X to remove from dashboard
                </TourHintItem>
              </TourHintList>
            </>
          )}

          <TourFooter>
            <TourDots aria-label={`Step ${step + 1} of 2`}>
              <TourDot $active={step === 0} aria-hidden />
              <TourDot $active={step === 1} aria-hidden />
            </TourDots>
            {step === 0 ? (
              <TourButton ref={actionButtonRef} onClick={() => setStep(1)}>
                Next
              </TourButton>
            ) : (
              <TourButton ref={actionButtonRef} onClick={dismiss}>
                Got it
              </TourButton>
            )}
          </TourFooter>
        </TourContent>
      </Popover.Portal>
    </Popover.Root>
  );
}
