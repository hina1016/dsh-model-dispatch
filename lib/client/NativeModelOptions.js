/** Render native model options without taking ownership of their declared slot. */
import { createElement, useEffect, useMemo, useSyncExternalStore } from 'react';
const EMPTY_ENTRIES = [];
/**
 * The stock picker remains the declarer of conversation.input.model.options.
 * A shadowing entry cannot declare it again (one declarer per slot). Read its
 * public ledger instead of replacing native components or their services.
 */
export function nativeModelOptionsHost(entries, subscribe, translate) {
    if (subscribe === undefined)
        return undefined;
    return { entries: () => entries() ?? EMPTY_ENTRIES, subscribe: listener => subscribe('conversation.input.model.options', listener), translate };
}
export function NativeModelOptions({ host, sessionId, standard, ...owner }) {
    const entries = useSyncExternalStore(host.subscribe, host.entries);
    const options = useMemo(() => entries.flatMap(entry => {
        // Hook-valued slot injection belongs to the host renderer, not this bridge.
        if (typeof entry.component !== 'function' || entry.inject === undefined)
            return [];
        const injected = entry.inject(sessionId);
        if (injected.hooks !== undefined || injected.keyedHooks !== undefined)
            return [];
        return [{ entry: entry, injected }];
    }), [entries, sessionId]);
    useEffect(() => { owner.reportPresence(options.length > 0); }, [owner.reportPresence, options.length]);
    return options.map(({ entry, injected }) => createElement(entry.component, {
        ...standard,
        ...injected,
        ...entry.locale === undefined ? {} : { t: host.translate(entry.locale) },
        ...owner,
        key: entry.options.id,
    }));
}
