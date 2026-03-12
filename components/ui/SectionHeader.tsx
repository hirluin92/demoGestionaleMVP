'use client'

import type { HTMLAttributes } from 'react'

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  kicker?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}

// Commento in italiano: header di sezione in stile landing (kicker + titolo grande + sottotitolo)
export function SectionHeader({
  kicker,
  title,
  subtitle,
  align = 'left',
  className = '',
  ...rest
}: SectionHeaderProps) {
  const alignment =
    align === 'center'
      ? 'text-center items-center'
      : 'text-left items-start'

  return (
    <div
      className={`flex flex-col gap-2 ${alignment} ${className}`}
      {...rest}
    >
      {kicker && (
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#95A9D0]">
          {kicker}
        </p>
      )}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight font-sans">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}

