/** The main-session chip uses native admission and live projection state. */
import { type ReactNode } from 'react';
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type ModelCatalogAccess } from './ModelPicker.tsx';
import type { MainModelStore } from './config-store.ts';
import type { LocaleKey } from './locales.ts';
import type { NativeModelOptionsOwner } from './NativeModelOptions.tsx';
export interface SessionModelPickerInjected {
    access: ModelCatalogAccess;
    remote: ClientRemote;
    mainStore: MainModelStore;
    t: (key: LocaleKey) => string;
    available: boolean;
    renderNativeOptions?: (standard: Record<string, unknown>, owner: NativeModelOptionsOwner) => ReactNode;
}
export type SessionModelPickerProps = PropsRuntime<'conversation.input.model'> & Partial<SessionModelPickerInjected>;
export declare function SessionModelPicker({ access, remote, mainStore, t, available, renderNativeOptions, ...standard }: SessionModelPickerProps): import("react").JSX.Element | null;
