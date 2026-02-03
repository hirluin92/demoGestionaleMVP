import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
  variant?: 'dark' | 'darker' | 'gold-border' | 'enhanced' | 'advanced'
  as?: 'div' | 'article' | 'section'
}

export function Card({ 
  children, 
  hover = false, 
  padding = 'md',
  variant = 'dark',
  as: Component = 'div',
  className = '',
  ...props 
}: CardProps) {
  const paddingSizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  
  const variants = {
    dark: 'glass-card',
    darker: 'bg-dark-950 border border-dark-100/20',
    'gold-border': 'glass-card border-2 border-gold-400/30 shadow-gold',
    enhanced: 'glass-card-enhanced',
    advanced: 'glass-card-advanced',
  }
  
  const hoverClass = hover 
    ? 'hover:shadow-dark-lg hover:-translate-y-1 hover:border-gold-400/50 transition-all duration-300 will-change-transform' 
    : ''
  
  // Per enhanced e advanced, serve un wrapper con la classe e il contenuto interno
  if (variant === 'enhanced' || variant === 'advanced') {
    return (
      <Component 
        className={`rounded-xl ${variants[variant]} ${className}`}
        {...props}
      >
        <div className={`${paddingSizes[padding]} ${hoverClass}`}>
          {children}
        </div>
      </Component>
    )
  }
  
  return (
    <Component 
      className={`rounded-xl ${variants[variant]} ${paddingSizes[padding]} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardHeader({ 
  children, 
  className = '', 
  ...props 
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ 
  children, 
  className = '', 
  as: Component = 'h3',
  ...props 
}: HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' }) {
  return (
    <Component className={`text-xl md:text-2xl heading-font font-bold text-white ${className}`} {...props}>
      {children}
    </Component>
  )
}

export function CardDescription({ 
  children, 
  className = '', 
  ...props 
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-dark-600 mt-2 font-sans ${className}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ 
  children, 
  className = '', 
  ...props 
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}
