'use client'

import { useFormStatus } from 'react-dom'

interface Props {
  children: React.ReactNode
  pendingText?: string
  className?: string
  disabled?: boolean
}

export function SubmitButton({ children, pendingText = 'Aguarde...', className, disabled }: Props) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? pendingText : children}
    </button>
  )
}
