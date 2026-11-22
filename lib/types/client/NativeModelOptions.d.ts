/** Render native model options without taking ownership of their declared slot. */
import { type ReactNode } from 'react';
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
export interface NativeModelOptionsHost {
    entries: () => readonly StoredEntry[];
    subscribe: (listener: () => void) => () => void;
    translate: (namespace: string) => (key: string) => string;
}
export interface NativeModelOptionsOwner {
    locked: boolean;
    dismiss: () => void;
    reportFailure: (message: string) => void;
    reportPresence: (present: boolean) => void;
}
/**
 * The stock picker remains the declarer of conversation.input.model.options.
 * A shadowing entry cannot declare it again (one declarer per slot). Read its
 * public ledger instead of replacing native components or their services.
 */
export declare function nativeModelOptionsHost(entries: () => readonly StoredEntry[] | undefined, subscribe: ((key: 'conversation.input.model.options', listener: () => void) => () => void) | undefined, translate: (namespace: string) => (key: string) => string): NativeModelOptionsHost | undefined;
export declare function NativeModelOptions({ host, sessionId, standard, ...owner }: {
    host: NativeModelOptionsHost;
    sessionId: string;
    standard: Record<string, unknown>;
} & NativeModelOptionsOwner): ReactNode;
