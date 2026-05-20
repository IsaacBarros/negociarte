interface Props {
  title: string
  description?: string
  children: React.ReactNode
}

export function ProfileSectionCard({ title, description, children }: Props) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  )
}
