import { useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Play, X, ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function PromptEditor({ prompt, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: prompt?.name || '',
    promptText: prompt?.promptText || prompt?.prompt_text || '',
    schedule: prompt?.schedule || '0 9 * * *',
    outputType: prompt?.outputType || prompt?.output_type || 'log',
    outputConfig: prompt?.outputConfig || prompt?.output_config || {},
    enabled: prompt?.enabled !== undefined ? !!prompt.enabled : true,
  })
  const [testOutput, setTestOutput] = useState('')
  const [testRunning, setTestRunning] = useState(false)
  const [testStatus, setTestStatus] = useState(null) // 'success' | 'error' | null
  const abortRef = useRef(null)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleOutputConfigChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      outputConfig: { ...prev.outputConfig, [field]: value }
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  const handleTest = async () => {
    setTestRunning(true)
    setTestOutput('')
    setTestStatus(null)

    try {
      const res = await fetch('/api/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: form.promptText }),
      })
      const { runId } = await res.json()

      const es = new EventSource(`/api/runs/${runId}/stream`)
      abortRef.current = es

      es.onmessage = (e) => {
        if (e.data === '[DONE]') {
          setTestStatus('success')
          setTestRunning(false)
          es.close()
        } else {
          setTestOutput(prev => prev + e.data.replace(/\\n/g, '\n'))
        }
      }

      es.onerror = () => {
        setTestStatus('error')
        setTestRunning(false)
        es.close()
      }
    } catch (err) {
      setTestStatus('error')
      setTestRunning(false)
    }
  }

  const handleStopTest = () => {
    if (abortRef.current) {
      abortRef.current.close()
      abortRef.current = null
    }
    setTestRunning(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{prompt ? 'Edit Prompt' : 'New Prompt'}</h1>
          <p className="text-sm text-muted-foreground">
            {prompt ? 'Update your scheduled prompt' : 'Create a new scheduled Claude prompt'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prompt Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Daily Summary"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promptText">Prompt</Label>
              <Textarea
                id="promptText"
                placeholder="Write a brief summary of today's key tasks and priorities..."
                value={form.promptText}
                onChange={e => handleChange('promptText', e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schedule">
                Schedule{' '}
                <a
                  href="https://crontab.guru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline ml-1"
                >
                  crontab.guru ↗
                </a>
              </Label>
              <Input
                id="schedule"
                placeholder="0 9 * * *"
                value={form.schedule}
                onChange={e => handleChange('schedule', e.target.value)}
                required
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Cron expression (e.g. "0 9 * * *" for 9am daily)</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">Run this prompt on schedule</p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={val => handleChange('enabled', val)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Output Configuration</CardTitle>
            <CardDescription>Where should the prompt results be sent?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Output Type</Label>
              <Select value={form.outputType} onValueChange={val => handleChange('outputType', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="log">Log (save to database)</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.outputType === 'email' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emailTo">To</Label>
                  <Input
                    id="emailTo"
                    type="email"
                    placeholder="you@example.com"
                    value={form.outputConfig.to || ''}
                    onChange={e => handleOutputConfigChange('to', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input
                    id="emailSubject"
                    placeholder="Daily Summary"
                    value={form.outputConfig.subject || ''}
                    onChange={e => handleOutputConfigChange('subject', e.target.value)}
                  />
                </div>
              </div>
            )}

            {form.outputType === 'file' && (
              <div className="space-y-1.5">
                <Label htmlFor="filePath">File Path</Label>
                <Input
                  id="filePath"
                  placeholder="/home/user/outputs/summary.txt"
                  value={form.outputConfig.path || ''}
                  onChange={e => handleOutputConfigChange('path', e.target.value)}
                  className="font-mono"
                />
              </div>
            )}

            {form.outputType === 'webhook' && (
              <div className="space-y-1.5">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://hooks.example.com/..."
                  value={form.outputConfig.url || ''}
                  onChange={e => handleOutputConfigChange('url', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Test Run</CardTitle>
                <CardDescription>Run this prompt now to preview the output</CardDescription>
              </div>
              {testRunning ? (
                <Button type="button" variant="outline" size="sm" onClick={handleStopTest}>
                  <X className="w-3.5 h-3.5" />
                  Stop
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={!form.promptText}>
                  <Play className="w-3.5 h-3.5" />
                  Run Test
                </Button>
              )}
            </div>
          </CardHeader>
          {(testOutput || testRunning) && (
            <CardContent>
              <div className="rounded-md bg-zinc-950 p-4 font-mono text-xs text-zinc-100 overflow-auto max-h-64 relative">
                {testRunning && (
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running...
                  </div>
                )}
                {testStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle className="w-3 h-3" />
                    Completed
                  </div>
                )}
                {testStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <XCircle className="w-3 h-3" />
                    Error
                  </div>
                )}
                <pre className="whitespace-pre-wrap">{testOutput}</pre>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {prompt ? 'Save Changes' : 'Create Prompt'}
          </Button>
        </div>
      </form>
    </div>
  )
}
