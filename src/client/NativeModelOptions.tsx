/** Render native model options without taking ownership of their declared slot. */
import { createElement, useEffect, useMemo, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'

export interface NativeModelOptionsHost {
  entries: () => readonly StoredEntry[]
  subscribe: (listener: () => void) => () => void
  translate: (namespace: string) => (key: string) => string
}
export interface NativeModelOptionsOwner {
  locked: boolean
  dismiss: () => void
  reportFailure: (message: string) => void
  reportPresence: (present: boolean) => void
}
interface NativeEntry extends StoredEntry {
  component: ComponentType<Record<string, unknown>>
  inject: (sessionId: string) => Record<string, unknown>
}
interface ResolvedOption {
  entry: NativeEntry
  injected: Record<string, unknown>
}

const EMPTY_ENTRIES: readonly StoredEntry[] = []

/**
 * The stock picker remains the declarer of conversation.input.model.options.
 * A shadowing entry cannot declare it again (one declarer per slot). Read its
 * public ledger instead of replacing native components or their services.
 */
export function nativeModelOptionsHost(entries: () => readonly StoredEntry[] | undefined, subscribe: ((key: 'conversation.input.model.options', listener: () => void) => () => void) | undefined, translate: (namespace: string) => (key: string) => string): NativeModelOptionsHost | undefined {
  if (subscribe === undefined) return undefined
  return { entries: () => entries() ?? EMPTY_ENTRIES, subscribe: listener => subscribe('conversation.input.model.options', listener), translate }
}

export function NativeModelOptions({ host, sessionId, standard, ...owner }: { host: NativeModelOptionsHost; sessionId: string; standard: Record<string, unknown> } & NativeModelOptionsOwner): ReactNode {
  const entries = useSyncExternalStore(host.subscribe, host.entries)
  const options = useMemo<ResolvedOption[]>(() => entries.flatMap(entry => {
    // Hook-valued slot injection belongs to the host renderer, not this bridge.
    if (typeof entry.component !== 'function' || entry.inject === undefined) return []
    const injected = (entry.inject as NativeEntry['inject'])(sessionId)
    if (injected.hooks !== undefined || injected.keyedHooks !== undefined) return []
    return [{ entry: entry as NativeEntry, injected }]
  }), [entries, sessionId])
  useEffect(() => { owner.reportPresence(options.length > 0) }, [owner.reportPresence, options.length])
  return options.map(({ entry, injected }) => createElement(entry.component, {
    ...standard,
    ...injected,
    ...entry.locale === undefined ? {} : { t: host.translate(entry.locale) },
    ...owner,
    key: entry.options.id,
  }))
}
