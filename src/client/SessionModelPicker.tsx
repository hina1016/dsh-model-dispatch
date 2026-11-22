/** The main-session chip uses native admission and live projection state. */
import { useSyncExternalStore, type ReactNode } from 'react'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ModelSelectionConfig } from '../shared.ts'
import { ModelPicker, type ModelCatalogAccess } from './ModelPicker.tsx'
import type { MainModelStore } from './config-store.ts'
import type { LocaleKey } from './locales.ts'
import type { NativeModelOptionsOwner } from './NativeModelOptions.tsx'

export interface SessionModelPickerInjected {
  access: ModelCatalogAccess
  remote: ClientRemote
  mainStore: MainModelStore
  t: (key: LocaleKey) => string
  available: boolean
  renderNativeOptions?: (standard: Record<string, unknown>, owner: NativeModelOptionsOwner) => ReactNode
}
export type SessionModelPickerProps = PropsRuntime<'conversation.input.model'> & Partial<SessionModelPickerInjected>
export function SessionModelPicker({ access, remote, mainStore, t, available, renderNativeOptions, ...standard }: SessionModelPickerProps) {
  if (!access || !remote || !mainStore || !t) return null
  return <SessionModelPickerLoaded {...standard} access={access} remote={remote} mainStore={mainStore} t={t} available={available === true} renderNativeOptions={renderNativeOptions} />
}
function SessionModelPickerLoaded({ access, remote, mainStore, t, locked, available, renderNativeOptions, ...standard }: PropsRuntime<'conversation.input.model'> & SessionModelPickerInjected) {
  const { sessionId, useSessions } = standard
  const projection = useSessions(state => state.projectionsBySession[sessionId]?.values.modelSelection ?? state.byId[sessionId]?.projectionValues?.modelSelection)
  const main = useSyncExternalStore(listener => mainStore.subscribe(listener), () => mainStore.getSnapshot())
  const value = projection?.next ?? projection?.lastUsed ?? main.value
  const save = async (selection: ModelSelectionConfig): Promise<void> => {
    const result = await remote.session.selectModel({ sessionId, ...selection })
    if (!result.ok) throw new Error(result.error.message)
  }
  return <ModelPicker compact sessionId={sessionId} access={access} value={value} onChange={save} t={t} placement="top" roleLabel={t('chatMainRole')} disabled={locked || !available} scopeHint={t('mainScope')} sourceLabel={t(projection?.next || projection?.lastUsed ? 'sessionSource' : 'defaultSource')} seed={false} renderOptions={renderNativeOptions === undefined ? undefined : (busy, dismiss, reportFailure, reportPresence) => renderNativeOptions(standard, { locked: locked || busy, dismiss, reportFailure, reportPresence })} />
}
