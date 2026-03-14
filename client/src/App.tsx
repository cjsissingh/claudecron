import { useState, useEffect, useCallback } from 'react';
import PromptList from './components/PromptList';
import PromptEditor from './components/PromptEditor';
import RunHistory from './components/RunHistory';
import Settings from './components/Settings';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { Clock, Settings as SettingsIcon, Plus, Menu } from 'lucide-react';
import { cn } from './lib/utils';

export interface Prompt {
  id: number;
  name: string;
  promptText: string;
  schedule: string;
  outputType: string;
  outputConfig: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ServerPrompt {
  id: number;
  name: string;
  prompt_text: string;
  schedule: string;
  output_type: string;
  output_config: Record<string, unknown> | string | null;
  enabled: number | boolean;
  created_at: string;
  updated_at: string;
}

function toClient(p: ServerPrompt): Prompt {
  return {
    ...p,
    enabled: !!p.enabled,
    promptText: p.prompt_text,
    outputType: p.output_type,
    outputConfig:
      typeof p.output_config === 'string'
        ? (JSON.parse(p.output_config || '{}') as Record<string, unknown>)
        : (p.output_config ?? {}),
  };
}

function toServer(d: Partial<Prompt>): Record<string, unknown> {
  return {
    name: d.name,
    prompt_text: d.promptText,
    schedule: d.schedule,
    output_type: d.outputType,
    output_config: d.outputConfig,
    enabled: d.enabled,
  };
}

type Page = 'prompts' | 'settings';

interface SidebarContentProps {
  page: Page;
  prompts: Prompt[];
  onNavigate: (page: Page) => void;
  onNewPrompt: () => void;
  onClose?: () => void;
}

function SidebarContent({ page, prompts, onNavigate, onNewPrompt, onClose }: SidebarContentProps) {
  const handleNavigate = (p: Page) => {
    onNavigate(p);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Logo */}
      <div className="p-5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm">claudecron</div>
            <div className="text-xs text-muted-foreground">Prompt Scheduler</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <button
          onClick={() => handleNavigate('prompts')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
            page === 'prompts'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Clock className="w-4 h-4 shrink-0" />
          Prompts
          {prompts.length > 0 && (
            <span
              className={cn(
                'ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium',
                page === 'prompts'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {prompts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => handleNavigate('settings')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left',
            page === 'settings'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <SettingsIcon className="w-4 h-4 shrink-0" />
          Settings
        </button>
      </nav>

      {/* New Prompt button */}
      {page === 'prompts' && (
        <div className="p-3 border-t">
          <Button
            className="w-full"
            size="sm"
            onClick={() => {
              onNewPrompt();
              onClose?.();
            }}
          >
            <Plus className="w-4 h-4" />
            New Prompt
          </Button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('prompts');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<number | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch('/api/prompts');
      const data = (await res.json()) as ServerPrompt[];
      setPrompts(data.map(toClient));
    } catch (err) {
      console.error('Failed to fetch prompts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
    const interval = setInterval(fetchPrompts, 5000);
    return () => clearInterval(interval);
  }, [fetchPrompts]);

  const handleSave = async (promptData: Partial<Prompt>) => {
    const body = toServer(promptData);
    if (editingPromptId && editingPromptId !== 'new') {
      await fetch(`/api/prompts/${editingPromptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    setEditingPromptId(null);
    fetchPrompts();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
    if (selectedPromptId === id) setSelectedPromptId(null);
    fetchPrompts();
  };

  const handleNavigate = (p: Page) => {
    setPage(p);
    setEditingPromptId(null);
  };

  const handleNewPrompt = () => {
    setEditingPromptId('new');
    setSelectedPromptId(null);
  };

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r flex-col">
        <SidebarContent
          page={page}
          prompts={prompts}
          onNavigate={handleNavigate}
          onNewPrompt={handleNewPrompt}
        />
      </aside>

      {/* Mobile: top bar + sheet drawer */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="w-4 h-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarContent
                page={page}
                prompts={prompts}
                onNavigate={handleNavigate}
                onNewPrompt={handleNewPrompt}
                onClose={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Clock className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">claudecron</span>
          </div>
          {page === 'prompts' && !editingPromptId && (
            <Button size="sm" className="ml-auto h-7" onClick={handleNewPrompt}>
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
          )}
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {page === 'settings' ? (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <Settings />
            </div>
          ) : editingPromptId ? (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <PromptEditor
                prompt={
                  editingPromptId === 'new'
                    ? null
                    : (prompts.find((p) => p.id === editingPromptId) ?? null)
                }
                onSave={handleSave}
                onCancel={() => setEditingPromptId(null)}
              />
            </div>
          ) : (
            <>
              {/* Prompts list panel — full width on mobile, half on desktop when history open */}
              <div
                className={cn(
                  'overflow-auto',
                  selectedPromptId
                    ? 'hidden md:block md:w-1/2 md:border-r'
                    : 'flex-1'
                )}
              >
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div>
                      <h1 className="text-lg font-semibold">Prompts</h1>
                      <p className="text-sm text-muted-foreground">
                        Manage your scheduled Claude prompts
                      </p>
                    </div>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <PromptList
                      prompts={prompts}
                      selectedPromptId={selectedPromptId}
                      onSelect={setSelectedPromptId}
                      onEdit={(id) => {
                        setEditingPromptId(id);
                        setSelectedPromptId(null);
                      }}
                      onDelete={handleDelete}
                      onRefresh={fetchPrompts}
                    />
                  )}
                </div>
              </div>

              {/* Run history — full width on mobile (replaces list), half on desktop */}
              {selectedPromptId && selectedPrompt && (
                <div className="flex-1 md:w-1/2 overflow-auto">
                  <div className="p-4 md:p-6">
                    <RunHistory
                      prompt={selectedPrompt}
                      onClose={() => setSelectedPromptId(null)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
