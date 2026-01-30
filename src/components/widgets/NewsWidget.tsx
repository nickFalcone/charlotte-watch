import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import type { WidgetProps } from '../../types';
import type { ParsedNewsEvent, ParsedNewsSource } from '../../types/news';
import { useWidgetMetadata } from '../Widget/useWidgetMetadata';
import { queryKeys } from '../../utils/queryKeys';
import { fetchCharlotteNewsParsed } from '../../utils/newsApi';
import { formatTimestamp } from '../common';
import infoIcon from '../../assets/icons/info.svg';
import closeIcon from '../../assets/icons/close.svg';
import noResultsIcon from '../../assets/icons/no-results.svg';
import {
  CardList,
  CardItem,
  CardItemHeader,
  CardTitleRow,
  CardTitle,
  CardMeta,
  CardMetaItem,
  LoadingContainer,
  LoadingIcon,
  LoadingText,
  ErrorContainer,
  ErrorText,
  RetryButton,
  EmptyContainer,
  EmptyIcon,
  EmptyText,
  EmptySubtext,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalTitleText,
  ModalClose,
  ModalCloseIcon,
  ModalBody,
  ModalSection,
  ModalLabel,
  InfoIcon,
  InfoTrigger,
  PopoverContent,
} from '../common';
import {
  NewsContainer,
  NewsHeader,
  ArticleCount,
  ArticleLink,
  SourcesList,
  SourceItem,
} from './NewsWidget.styles';

const ACCENT_COLOR = '#6366f1';

function mostRecentSourceDate(sources: ParsedNewsSource[]): string | null {
  if (sources.length === 0) return null;
  const dates = sources
    .map(s => new Date(s.published_datetime_utc).getTime())
    .filter(t => !Number.isNaN(t));
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}

const TWELVE_HOURS_MS = 1000 * 60 * 60 * 12;

export function NewsWidget(_props: WidgetProps) {
  const { setLastUpdated } = useWidgetMetadata();
  const [selectedEvent, setSelectedEvent] = useState<ParsedNewsEvent | null>(null);

  const { data, dataUpdatedAt, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.news.charlotteParsed(),
    queryFn: ({ signal }) => fetchCharlotteNewsParsed(signal),
    refetchInterval: TWELVE_HOURS_MS,
    staleTime: TWELVE_HOURS_MS,
  });

  // Filter to only show events with 2+ corroborating sources
  const events = (data?.data ?? []).filter(event => event.sources.length >= 2);

  // Sync React Query's dataUpdatedAt timestamp to widget metadata context.
  // MUST use useEffect to avoid infinite render loops.
  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdated(dataUpdatedAt);
    }
  }, [dataUpdatedAt, setLastUpdated]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingIcon src={infoIcon} alt="Loading news" />
        <LoadingText>Loading news...</LoadingText>
      </LoadingContainer>
    );
  }

  if (isError && !data) {
    return (
      <ErrorContainer>
        <ErrorText>{error instanceof Error ? error.message : 'Failed to load news'}</ErrorText>
        <RetryButton onClick={() => refetch()}>Retry</RetryButton>
      </ErrorContainer>
    );
  }

  return (
    <NewsContainer>
      <NewsHeader>
        <ArticleCount>
          {events.length} EVENT{events.length !== 1 ? 'S' : ''}
        </ArticleCount>
        <Popover.Root>
          <Popover.Trigger asChild>
            <InfoTrigger aria-label="About news sources">
              <InfoIcon src={infoIcon} alt="" aria-hidden />
            </InfoTrigger>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content side="top" sideOffset={6} asChild>
              <PopoverContent>
                News events shown require at least 2 corroborating sources for verification.
              </PopoverContent>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </NewsHeader>

      {events.length === 0 ? (
        <EmptyContainer>
          <EmptyIcon src={noResultsIcon} alt="" />
          <EmptyText>No News Available</EmptyText>
          <EmptySubtext>No recent Charlotte news meeting criteria</EmptySubtext>
        </EmptyContainer>
      ) : (
        <CardList tabIndex={0} role="region" aria-label="News events">
          {events.map((event, index) => (
            <CardItem
              key={`${event.event_key}-${index}`}
              type="button"
              $accentColor={ACCENT_COLOR}
              onClick={() => setSelectedEvent(event)}
            >
              <CardItemHeader>
                <CardTitleRow>
                  <CardTitle>{event.text}</CardTitle>
                </CardTitleRow>
              </CardItemHeader>
              <CardMeta>
                {event.sources.length > 0 && (
                  <>
                    {mostRecentSourceDate(event.sources) && (
                      <CardMetaItem>
                        {formatTimestamp(mostRecentSourceDate(event.sources)!)}
                      </CardMetaItem>
                    )}
                    <CardMetaItem>
                      {event.sources.length} source{event.sources.length !== 1 ? 's' : ''}
                    </CardMetaItem>
                  </>
                )}
              </CardMeta>
            </CardItem>
          ))}
        </CardList>
      )}

      <Dialog.Root
        open={selectedEvent !== null}
        onOpenChange={open => {
          if (!open) setSelectedEvent(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <ModalOverlay>
              <Dialog.Content asChild>
                <ModalContent>
                  {selectedEvent && (
                    <>
                      <ModalHeader $color={ACCENT_COLOR}>
                        <ModalTitle>
                          <Dialog.Title asChild>
                            <ModalTitleText>{selectedEvent.text}</ModalTitleText>
                          </Dialog.Title>
                        </ModalTitle>
                        <Dialog.Close asChild>
                          <ModalClose aria-label="Close">
                            <ModalCloseIcon src={closeIcon} alt="" aria-hidden />
                          </ModalClose>
                        </Dialog.Close>
                      </ModalHeader>
                      <ModalBody>
                        <ModalSection>
                          <ModalLabel>
                            Source{selectedEvent.sources.length > 1 ? 's' : ''}
                          </ModalLabel>
                          <SourcesList>
                            {selectedEvent.sources.map((src, i) => (
                              <SourceItem key={src.link + i}>
                                <ArticleLink
                                  href={src.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {src.source_name}
                                </ArticleLink>{' '}
                                ({formatTimestamp(src.published_datetime_utc)})
                              </SourceItem>
                            ))}
                          </SourcesList>
                        </ModalSection>
                      </ModalBody>
                    </>
                  )}
                </ModalContent>
              </Dialog.Content>
            </ModalOverlay>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
    </NewsContainer>
  );
}
