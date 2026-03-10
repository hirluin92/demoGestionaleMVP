'use client'

// Commenti in italiano: header colonna per un singolo operatore

interface StaffHeaderProps {
  name: string
  color: string
}

export function StaffHeader({ name, color }: StaffHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-dark-700">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-medium truncate">{name}</span>
    </div>
  )
}

