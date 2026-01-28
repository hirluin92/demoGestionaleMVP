import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    // Generate ID for accessibility if not provided
    const inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-semibold text-dark-700 mb-2"
          >
            {label}
            {props.required && (
              <span className="text-gold-400 ml-1" aria-label="obbligatorio">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`
            input-field
            w-full
            ${error 
              ? 'border-accent-danger/50 focus:border-accent-danger' 
              : ''
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-2 text-sm text-accent-danger flex items-center" role="alert">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-2 text-sm text-dark-600">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
