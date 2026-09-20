export function Loading({ label = 'Carregando dados...' }: { label?: string }) {
  return <div className="loading" role="status"><span className="pokeball-spinner" /> <p>{label}</p></div>
}

export function CardSkeleton({ count = 8 }: { count?: number }) {
  return <div className="pokemon-grid" aria-label="Carregando">{Array.from({ length: count }, (_, index) => <div className="skeleton card-skeleton" key={index} />)}</div>
}
