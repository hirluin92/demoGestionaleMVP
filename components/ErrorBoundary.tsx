'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
          <p className="font-semibold">Si è verificato un errore</p>
          {this.state.error && (
            <p className="text-sm mt-2 text-red-300">{this.state.error.message}</p>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
