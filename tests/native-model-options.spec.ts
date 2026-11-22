import React from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModelCatalog } from '@deepseek-ai/dsh-api-remotes/client'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  IconCheckOutlineMedium: () => null,
  IconChevronDownOutlineMedium: () => null,
}))
vi.mock('react-dom', () => ({ createPortal: (node: React.ReactNode) => node }))
vi.stubGlobal('document', { body: {}, addEventListener: vi.fn(), removeEventListener: vi.fn(), activeElement: null })
vi.stubGlobal('window', { innerWidth: 1200, innerHeight: 900, addEventListener: vi.fn(), removeEventListener: vi.fn() })

import { ModelPicker, type ModelCatalogAccess } from '../src/client/ModelPicker.tsx'
import { SessionModelPicker } from '../src/client/SessionModelPicker.tsx'
import { SessionModelControls } from '../src/client/SessionModelControls.tsx'
import { en } from '../src/client/locales.ts'
import pickerCss from '../src/client/ModelPicker.module.css'

const catalog: ModelCatalog = {
  default: { provider: 'p', model: 'm' },
  routableProviders: ['p'],
  groups: [{ id: 'p', name: 'Provider', models: [{ id: 'm', name: 'Model' }] }],
  failures: [],
}
const access: ModelCatalogAccess = { loadCatalog: async () => catalog, currentSelection: () => undefined }
const subscribe = () => () => {}
const routeSnapshot = { value: undefined }
const mainSnapshot = { value: { provider: 'p', model: 'm' } }
const emptyMainSnapshot = { value: undefined }
const emptyOverridesSnapshot = { value: {} }
const emptySettingsSnapshot = { value: {} }
const t = (key: keyof typeof en) => en[key]
const renderSlot = vi.fn((slot: string, owner: { dismiss: () => void }) => React.createElement('button', { 'data-native-option': slot, onClick: owner.dismiss }, 'Enable agent teamwork'))
const sessionProps = {
  sessionId: 's1',
  useSessions: (selector: (state: unknown) => unknown) => selector({ byId: {}, projectionsBySession: {} }),
  useSession: (selector: (state: unknown) => unknown) => selector({ subagent: null }),
  useProjection: (key: string) => key === 'agentTeam' ? { enabled: false } : { lastUsed: null },
  locked: false,
  available: true,
}
let tree: ReactTestRenderer | undefined
let errors: unknown[] = []
beforeEach(() => {
  errors = []
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { errors.push(args) })
})
afterEach(() => {
  if (tree) act(() => tree!.unmount())
  tree = undefined
  renderSlot.mockClear()
  vi.restoreAllMocks()
})

function NativeOptionProbe({ owner, standard }: { owner: { reportPresence: (present: boolean) => void }; standard: Record<string, unknown> }) {
  React.useEffect(() => { owner.reportPresence(true) }, [owner])
  return renderSlot('conversation.input.model.options', { ...standard, ...owner })
}

async function mountMainPicker() {
  await act(async () => {
    tree = create(React.createElement(SessionModelPicker, {
      ...sessionProps,
      access,
      remote: { session: { selectModel: vi.fn() } },
      mainStore: { subscribe, getSnapshot: () => mainSnapshot },
      t,
      renderNativeOptions: (standard: Record<string, unknown>, owner: { locked: boolean; dismiss: () => void; reportFailure: (message: string) => void; reportPresence: (present: boolean) => void }) => React.createElement(NativeOptionProbe, { owner, standard }),
    } as never))
  })
  await act(async () => { tree!.root.findByType('button').props.onClick() })
}

describe('native model menu options', () => {
  it('keeps the native agent-team switch in the main picker with the stock owner contract', async () => {
    await mountMainPicker()
    expect(tree!.root.findByProps({ role: 'dialog' }).props.className.split(' ')).toContain(pickerCss.menuWithNativeOptions)
    expect(renderSlot).toHaveBeenCalledWith('conversation.input.model.options', expect.objectContaining({
      locked: false,
      useSession: expect.any(Function),
      useProjection: expect.any(Function),
      sessionId: 's1',
      dismiss: expect.any(Function),
      reportFailure: expect.any(Function),
    }))
    const option = tree!.root.findByProps({ 'data-native-option': 'conversation.input.model.options' })
    const owner = renderSlot.mock.calls[0]![1] as { dismiss: () => void; reportFailure: (message: string) => void }
    act(() => { owner.reportFailure('Could not save teamwork'); owner.reportPresence(true) })
    expect(JSON.stringify(tree!.toJSON())).toContain('Could not save teamwork')
    expect(() => act(() => { option.props.onClick() })).not.toThrow()
    expect(tree!.root.findAllByProps({ 'data-native-option': 'conversation.input.model.options' })).toHaveLength(0)
    expect(errors).toEqual([])
  })

  it('does not render main-session options in other pickers', async () => {
    await act(async () => {
      tree = create(React.createElement(ModelPicker, {
        sessionId: undefined, access, value: undefined, onChange: vi.fn(), t, controlLabel: 'Subagent default',
      }))
    })
    await act(async () => { tree!.root.findByType('button').props.onClick() })
    expect(renderSlot).not.toHaveBeenCalled()
    expect(tree!.root.findByProps({ role: 'dialog' }).props.className).toBe(pickerCss.menu)
  })

  it('passes only its own slot shares to the main and subagent pickers', () => {
    act(() => {
      tree = create(React.createElement(SessionModelControls, {
        ...sessionProps,
        access,
        remote: { session: { selectModel: vi.fn() } },
        mainStore: { subscribe, getSnapshot: () => emptyMainSnapshot },
        overrides: { subscribe, getSnapshot: () => emptyOverridesSnapshot, start: vi.fn(), stop: vi.fn() },
        store: { subscribe, getSnapshot: () => emptySettingsSnapshot },
        routes: { subscribe, get: () => routeSnapshot, watch: () => () => {} },
        t,
        unrelated: 'do not forward',
      } as never))
    })
    expect(JSON.stringify(tree!.toJSON())).toContain('Select model')
    expect(JSON.stringify(tree!.toJSON())).not.toContain('undefined')
  })
})

describe('native option ledger bridge', () => {
  it('renders the stock injected component without redeclaring its slot', async () => {
    const { SlotCore } = await import('@deepseek-ai/dsh-client-ui-slots')
    const { NativeModelOptions, nativeModelOptionsHost } = await import('../src/client/NativeModelOptions.tsx')
    const core = new SlotCore()
    core.register({ name: 'root', children: { 'conversation.input.model': { kind: 'single', scope: 'session' } } }, () => null)
    core.register({ name: 'conversation.input.model', children: { 'conversation.input.model.options': { kind: 'list', scope: 'session' } } }, () => null)
    const selectTeamMode = vi.fn()
    const NativeSwitch = (props: { locked: boolean; selectTeamMode: (enabled: boolean) => void; t: (key: string) => string }) => React.createElement('button', { role: 'switch', 'aria-checked': false, disabled: props.locked, onClick: () => props.selectTeamMode(true) }, props.t('mode.label'))
    core.register({ name: 'conversation.input.model.options', id: 'agent-team', locale: 'agent-team', inject: (sessionId: string) => ({ selectTeamMode: (enabled: boolean) => selectTeamMode(sessionId, enabled) }) }, NativeSwitch)
    core.register({ name: 'conversation.input.model', priority: -1 }, () => null)
    expect(core.spec('conversation.input.model.options')?.kind).toBe('list')
    const host = nativeModelOptionsHost(() => core.entries('conversation.input.model.options'), core.subscribe.bind(core), () => (key: string) => key === 'mode.label' ? 'Enable agent teamwork' : key)!
    await act(async () => {
      tree = create(React.createElement(NativeModelOptions, { host, sessionId: 's1', standard: {}, locked: false, dismiss: vi.fn(), reportFailure: vi.fn(), reportPresence: vi.fn() }))
    })
    const toggle = tree!.root.findByProps({ role: 'switch' })
    expect(toggle.children).toContain('Enable agent teamwork')
    toggle.props.onClick()
    expect(selectTeamMode).toHaveBeenCalledWith('s1', true)
  })
})

describe('empty native option registry', () => {
  it.each([
    { description: 'an empty registry', entries: [] },
    { description: 'an unavailable registry', entries: undefined },
  ])('keeps a stable empty snapshot for $description', async ({ entries }) => {
    const { NativeModelOptions, nativeModelOptionsHost } = await import('../src/client/NativeModelOptions.tsx')
    const host = nativeModelOptionsHost(() => entries, () => () => {}, () => (key: string) => key)!
    expect(host.entries()).toBe(host.entries())
    const reportPresence = vi.fn()
    await act(async () => {
      tree = create(React.createElement(NativeModelOptions, { host, sessionId: 's1', standard: {}, locked: false, dismiss: vi.fn(), reportFailure: vi.fn(), reportPresence }))
    })
    expect(tree!.toJSON()).toBeNull()
    expect(reportPresence).toHaveBeenCalledWith(false)
  })
})
