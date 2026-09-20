export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo" aria-label="Atlas Pokémon">
      <span className="logo-mark" aria-hidden="true"><span /></span>
      {!compact && <span>ATLAS <b>POKÉMON</b></span>}
    </div>
  )
}
