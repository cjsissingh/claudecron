import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { X, Clock, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Calendar } from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function formatDuration(ms) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function StatusBadge({ status }) {
  if (status === 'success') return <Badge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" />Success</Badge>
  if (status === 'error') return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Error</Badge>
  if (status === 'running') return <Badge variant="running" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Running</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

export default function RunHistory({ prompt, onClose }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!prompt) return
    const fetchRuns = async () => {
      try {
        const res = await fetch(`/api/prompts/${prompt.id}/runs`)
        const data = await res.json()
        setRuns(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchRuns()
    const interval = setInterval(fetchRuns, 3000)
    return () => clearInterval(interval)
  }, [prompt])

  if (!prompt) return null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{prompt.name}</h2>
          <p className="text-sm text-muted-foreground">Run history</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Schedule</span>
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{prompt.schedule}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Output</span>
            <span className="capitalize">{prompt.outputType || prompt.output_type}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={prompt.enabled ? 'success' : 'secondary'}>
              {prompt.enabled ? 'Active' : 'Paused'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-medium mb-3">Runs</h3>
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No runs yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <Card key={run.id} className="overflow-hidden">
                <div
                  className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <span className="text-xs text-muted-foreground">{formatDate(run.startedAt || run.started_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDuration(run.durationMs)}</span>
                      {expandedId === run.id
                        ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </div>
                {expandedId === run.id && run.output && (
                  <div className="border-t">
                    <pre className="p-3 text-xs font-mono bg-zinc-950 text-zinc-100 overflow-auto max-h-48 whitespace-pre-wrap">
                      {run.output}
                    </pre>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
