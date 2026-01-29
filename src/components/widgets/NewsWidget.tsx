import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNowStrict, isToday, format } from 'date-fns';
import * as Dialog from '@radix-ui/react-dialog';
import type { WidgetProps } from '../../types';
import type { NewsArticle } from '../../types/news';
import { useWidgetMetadata } from '../Widget/useWidgetMetadata';
import { queryKeys } from '../../utils/queryKeys';
import { fetchCharlotteNews } from '../../utils/newsApi';
import infoIcon from '../../assets/icons/info.svg';
import closeIcon from '../../assets/icons/close.svg';
import noResultsIcon from '../../assets/icons/no-results.svg';
import {
  CardList,
  CardItem,
  CardItemHeader,
  CardTitleRow,
  CardTitle,
  CardSummary,
  CardMeta,
  CardMetaItem,
} from '../common/CardList.styles';
import {
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
} from '../common/WidgetStates.styles';
import {
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
  ModalText,
} from '../common/DetailModal.styles';
import {
  NewsContainer,
  NewsHeader,
  ArticleCount,
  ArticleSource,
  ArticleLink,
} from './NewsWidget.styles';

const ACCENT_COLOR = '#6366f1';

/** Same-day: relative (e.g. "2 hours ago"). Otherwise: "Jan 24 6:20 PM". */
function formatNewsTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  if (isToday(d)) {
    return formatDistanceToNowStrict(d, { addSuffix: true });
  }
  return format(d, 'MMM d h:mm a');
}

export function NewsWidget(_props: WidgetProps) {
  const { setLastUpdated } = useWidgetMetadata();
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const { data, dataUpdatedAt, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.news.charlotte(),
    queryFn: ({ signal }) => fetchCharlotteNews(signal),
    // 12 hour refetch interval
    refetchInterval: 1000 * 60 * 60 * 12,
    staleTime: 1000 * 60 * 60 * 12,
  });

  const articles = data?.data ?? [];

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
        <ArticleCount>{articles.length} ARTICLES</ArticleCount>
      </NewsHeader>

      {articles.length === 0 ? (
        <EmptyContainer>
          <EmptyIcon src={noResultsIcon} alt="" />
          <EmptyText>No News Available</EmptyText>
          <EmptySubtext>No recent news found</EmptySubtext>
        </EmptyContainer>
      ) : (
        <CardList tabIndex={0} role="region" aria-label="News articles">
          {articles.map((article, index) => (
            <CardItem
              key={`${article.link}-${index}`}
              type="button"
              $accentColor={ACCENT_COLOR}
              onClick={() => setSelectedArticle(article)}
            >
              <CardItemHeader>
                <CardTitleRow>
                  <CardTitle>{article.title}</CardTitle>
                </CardTitleRow>
              </CardItemHeader>
              {article.snippet && <CardSummary>{article.snippet}</CardSummary>}
              <CardMeta>
                <CardMetaItem>
                  <ArticleSource>{article.source_name}</ArticleSource>
                </CardMetaItem>
                <CardMetaItem>{formatNewsTimestamp(article.published_datetime_utc)}</CardMetaItem>
              </CardMeta>
            </CardItem>
          ))}
        </CardList>
      )}

      <Dialog.Root
        open={selectedArticle !== null}
        onOpenChange={open => {
          if (!open) setSelectedArticle(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <ModalOverlay>
              <Dialog.Content asChild>
                <ModalContent>
                  {selectedArticle && (
                    <>
                      <ModalHeader $color={ACCENT_COLOR}>
                        <ModalTitle>
                          <Dialog.Title asChild>
                            <ModalTitleText>{selectedArticle.title}</ModalTitleText>
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
                          <ModalLabel>Source</ModalLabel>
                          <ModalText>{selectedArticle.source_name}</ModalText>
                        </ModalSection>

                        {selectedArticle.authors?.length > 0 && (
                          <ModalSection>
                            <ModalLabel>Authors</ModalLabel>
                            <ModalText>{selectedArticle.authors.join(', ')}</ModalText>
                          </ModalSection>
                        )}

                        <ModalSection>
                          <ModalLabel>Published</ModalLabel>
                          <ModalText>
                            {formatNewsTimestamp(selectedArticle.published_datetime_utc)}
                          </ModalText>
                        </ModalSection>

                        {selectedArticle.snippet && (
                          <ModalSection>
                            <ModalLabel>Summary</ModalLabel>
                            <ModalText>{selectedArticle.snippet}</ModalText>
                          </ModalSection>
                        )}

                        <ModalSection>
                          <ModalLabel>Read Full Article</ModalLabel>
                          <ModalText>
                            <ArticleLink
                              href={selectedArticle.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {selectedArticle.link}
                            </ArticleLink>
                          </ModalText>
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
