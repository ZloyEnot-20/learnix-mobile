import React from "react"
import { useRouter } from "expo-router"
import { HomeworkStatusScreen } from "../homework/HomeworkStatusScreen"

interface ScreenErrorBoundaryProps {
  children: React.ReactNode
  title?: string
  description?: string
  onRetry?: () => void
}

interface ScreenErrorBoundaryState {
  error: Error | null
}

function ScreenErrorFallback({
  title = "Something went wrong",
  description = "We couldn't load this screen. Please try again or go back.",
  onRetry,
  onBack,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  onBack: () => void
}) {
  return (
    <HomeworkStatusScreen
      style={{ flex: 1 }}
      code="!"
      icon="alert-circle-outline"
      iconColor="#DC2626"
      iconBg="rgba(220, 38, 38, 0.1)"
      title={title}
      description={description}
      buttonLabel={onRetry ? "Try again" : "Go back"}
      onButtonPress={onRetry ?? onBack}
      secondaryButtonLabel={onRetry ? "Go back" : undefined}
      onSecondaryButtonPress={onRetry ? onBack : undefined}
    />
  )
}

export class ScreenErrorBoundary extends React.Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return { error }
  }

  private handleRetry = () => {
    this.setState({ error: null })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.error) {
      return (
        <ScreenErrorBoundaryFallback
          title={this.props.title}
          description={this.props.description}
          onRetry={this.props.onRetry ? this.handleRetry : undefined}
        />
      )
    }

    return this.props.children
  }
}

function ScreenErrorBoundaryFallback({
  title,
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  const router = useRouter()
  return (
    <ScreenErrorFallback
      title={title}
      description={description}
      onRetry={onRetry}
      onBack={() => router.back()}
    />
  )
}
