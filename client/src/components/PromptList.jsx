import { useState } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Edit2, Trash2, Play, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import { cn } from '../lib/utils'

export default function PromptList({ prompts, selectedPromptId, onSelect, onEdit, onDelete, onRefresh }) {
  const [loadingId, setLoadingId] = useState(null)

  const handleToggle = async (prompt) => {
    setLoadingId(prompt.id)
    try {
      await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prompt.name,
          prompt_text: prompt.promptText,
          schedule: prompt.schedule,
          output_type: prompt.outputType,
          output_config: prompt.outputConfig,
          enabled: !prompt.enabled,
        }),
      })
      onRefresh()
    } finally {
      setLoadingId(null)
    }
  }

  const handleRun = async (e, promptId) => {
    e.stopPropagation()
    setLoadingId(promptId)
    try {
      await fetch(`/api/prompts/${promptId}/run`, { method: 'POST' })
      onRefresh()
    } finally {
      setLoadingId(null)
    }
  }

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-sm mb-1">No prompts yet</h3>
        <p className="text-sm text-muted-foreground">Create your first scheduled prompt to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {prompts.map((prompt) => (
        <Card
          key={prompt.id}
          className={cn(
            "cursor-pointer transition-colors hover:bg-accent/50",
            selectedPromptId === prompt.id && "ring-1 ring-primary bg-accent/30"
          )}
          onClick={() => onSelect(selectedPromptId === prompt.id ? null : prompt.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{prompt.name}</span>
                  <Badge variant={prompt.enabled ? 'success' : 'secondary'} className="text-xs">
                    {prompt.enabled ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {prompt.schedule}
                  </span>
                  <span className="capitalize">{prompt.outputType || prompt.output_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Switch
                  checked={!!prompt.enabled}
                  onCheckedChange={() => handleToggle(prompt)}
                  disabled={loadingId === prompt.id}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => handleRun(e, prompt.id)}
                  disabled={loadingId === prompt.id}
                  title="Run now"
                >
                  <Play className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); onEdit(prompt.id); }}
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); onDelete(prompt.id); }}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
