import { useHealthQuery } from '../hooks/useHealthQuery'

function StatusPill({ ok }: { ok: boolean }) {
  return <strong className={ok ? 'pill ok' : 'pill bad'}>{ok ? 'Connected' : 'Disconnected'}</strong>
}

export default function HealthStatusCard() {
  const health = useHealthQuery()

  if (health.isPending) {
    return <p>Checking health...</p>
  }

  if (health.isError) {
    return (
      <div>
        <p className="bad">Health request failed</p>
        <p className="error">{health.error.message}</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid">
        <div className="item">
          <span>Ollama</span>
          <StatusPill ok={health.data.ollama_connected} />
        </div>
        <div className="item">
          <span>Anki</span>
          <StatusPill ok={health.data.anki_connected} />
        </div>
      </div>
      <p className="meta">Last update: {new Date(health.dataUpdatedAt).toLocaleTimeString()}</p>
    </>
  )
}
