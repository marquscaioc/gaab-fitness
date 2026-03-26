import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-gray-900 p-8">
          <Text className="mb-2 text-2xl font-bold text-red-400">Something went wrong</Text>
          <Text className="mb-6 text-center text-base text-gray-400">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            className="rounded-xl bg-green-600 px-8 py-3">
            <Text className="font-bold text-white">Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
