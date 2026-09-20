import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ErrorState({ title = 'Ops! Algo saiu da rota.', message = 'Não foi possível buscar estes dados agora.' }: { title?: string; message?: string }) {
  return (
    <section className="state-page">
      <div className="state-icon"><AlertTriangle /></div>
      <h1>{title}</h1><p>{message}</p>
      <Link to="/pokemon" className="button"><ArrowLeft size={18} /> Voltar à Pokédex</Link>
    </section>
  )
}
