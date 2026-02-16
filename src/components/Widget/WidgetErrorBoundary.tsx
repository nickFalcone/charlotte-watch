import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ErrorContainer, ErrorText, RetryButton } from '../common';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches rendering errors in widget content so a single broken widget
 * cannot take down the entire dashboard. Placed inside WidgetWrapper
 * so the widget chrome (header, drag handle, controls) remains usable.
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Widget crashed:', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorText>Something went wrong rendering this widget.</ErrorText>
          <RetryButton onClick={this.handleRetry}>Retry</RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}
