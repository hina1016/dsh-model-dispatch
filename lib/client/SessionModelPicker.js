import { jsx as _jsx } from "react/jsx-runtime";
/** The main-session chip uses native admission and live projection state. */
import { useSyncExternalStore } from 'react';
import { ModelPicker } from "./ModelPicker.js";
export function SessionModelPicker({ access, remote, mainStore, t, available, renderNativeOptions, ...standard }) {
    if (!access || !remote || !mainStore || !t)
        return null;
    return _jsx(SessionModelPickerLoaded, { ...standard, access: access, remote: remote, mainStore: mainStore, t: t, available: available === true, renderNativeOptions: renderNativeOptions });
}
function SessionModelPickerLoaded({ access, remote, mainStore, t, locked, available, renderNativeOptions, ...standard }) {
    const { sessionId, useSessions } = standard;
    const projection = useSessions(state => state.projectionsBySession[sessionId]?.values.modelSelection ?? state.byId[sessionId]?.projectionValues?.modelSelection);
    const main = useSyncExternalStore(listener => mainStore.subscribe(listener), () => mainStore.getSnapshot());
    const value = projection?.next ?? projection?.lastUsed ?? main.value;
    const save = async (selection) => {
        const result = await remote.session.selectModel({ sessionId, ...selection });
        if (!result.ok)
            throw new Error(result.error.message);
    };
    return _jsx(ModelPicker, { compact: true, sessionId: sessionId, access: access, value: value, onChange: save, t: t, placement: "top", roleLabel: t('chatMainRole'), disabled: locked || !available, scopeHint: t('mainScope'), sourceLabel: t(projection?.next || projection?.lastUsed ? 'sessionSource' : 'defaultSource'), seed: false, renderOptions: renderNativeOptions === undefined ? undefined : (busy, dismiss, reportFailure, reportPresence) => renderNativeOptions(standard, { locked: locked || busy, dismiss, reportFailure, reportPresence }) });
}
