import { afterEach, describe, expect, it, vi } from 'vitest'
// Entries are registered, not rendered; the host UI kit is not installed for tests.
vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ Button: () => null, MarkdownText: () => null, IconCheckOutlineMedium: () => null, IconChevronDownOutlineMedium: () => null, IconEditOutlineMedium: () => null }))
import { apply, inject } from '../src/client/index.tsx'
afterEach(() => vi.unstubAllGlobals())
function boot(omit: string[] = []) {
  const nativeEntries: unknown[] = []
  const all: Record<string, unknown> = {
    configForms: { get: () => ({ getSnapshot: () => ({ status: 'ready', value: {} }), subscribe: () => () => {} }) },
    remote: { session: { modelCatalog: async () => ({ ok: true, value: [] }) } },
    sessions: { list: { getSnapshot: () => ({ byId: {}, projectionsBySession: {} }) }, subagentAddress: () => undefined, refreshProjections: async () => {} },
    uiWorkspace: { openSession() {} },
  }
  const services = Object.fromEntries(Object.entries(all).filter(([name]) => !omit.includes(name)))
  const entries = new Map<string, { inject: (...args: unknown[]) => any }>()
  entries.set('native-model-options', nativeEntries as never)
  // Like cordis, `remote.session` is a service of its own name.
  const lookup = (name: string) => name === 'remote.session' ? (services.remote as any)?.session : services[name]
  const present = (name: string) => lookup(name) !== undefined
  const ctx: any = {
    get: lookup,
    effect: (install: () => unknown) => install(),
    locale: { register: () => () => {}, bind: () => (key: string) => key },
    slots: { entries: () => nativeEntries, subscribe: () => () => {}, inject: (_slot: string, add: () => unknown) => add(), register: (spec: any) => { entries.set(spec.id ?? spec.name, spec); return () => {} } },
    inject(deps: string[], start: (scope: unknown) => void) { if (deps.every(present)) start({ ...ctx, ...services }) },
  }
  apply(ctx)
  return entries
}
describe('client entries degrade one at a time', () => {
  it('needs only slots and locale to load', () => {
    expect(inject).toEqual(['slots', 'locale'])
    const entries = boot()
    expect([...entries.keys()].sort()).toEqual(['conversation.composer', 'conversation.input.model', 'model-switch', 'model-switch-badge', 'native-model-options', 'subagent-catalog'])
    expect(entries.get('conversation.input.model')!.children).toBeUndefined()
    expect(entries.get('conversation.input.model')!.priority).toBe(-1)
    const chat = entries.get('conversation.input.model')!.inject('s1')
    expect(chat.renderNativeOptions).toBeTypeOf('function')
    const option = chat.renderNativeOptions({ useSession: 'stock hook' }, { locked: false, dismiss: () => {}, reportFailure: () => {}, reportPresence: () => {} })
    expect(option.props.host.entries()).toBe(entries.get('native-model-options'))
    expect(option.props.sessionId).toBe('s1')
  })
  it('keeps settings and chips without uiWorkspace, and reports the missing catalog seam with the host report', async () => {
    const entries = boot(['uiWorkspace'])
    expect(entries.has('subagent-catalog')).toBe(false)
    expect(entries.has('model-switch')).toBe(true); expect(entries.has('conversation.input.model')).toBe(true)
    const host = [{ capability: 'plan-switch', missing: ['sessionController.selectModel'], mismatched: [] }]
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, value: host }))))
    expect(await entries.get('model-switch')!.inject().seams()).toEqual([...host, { capability: 'subagent-catalog', missing: ['uiWorkspace'], mismatched: [] }])
  })
  it('drops only the chat chips when the remote session service is missing, and names it in the picker error', async () => {
    const entries = boot(['remote'])
    expect(entries.has('conversation.input.model')).toBe(false)
    expect(entries.has('model-switch')).toBe(true); expect(entries.has('model-switch-badge')).toBe(true)
    await expect(entries.get('model-switch')!.inject().access.loadCatalog()).rejects.toThrow('remote.session')
  })
})
