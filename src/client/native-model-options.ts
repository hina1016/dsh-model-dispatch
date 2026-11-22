import type { NativeModelOptionsOwner } from './NativeModelOptions.tsx'

/** Type contract of the native model-picker child slot; runtime stays native. */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'conversation.input.model.options': {
      kind: 'list'
      scope: 'session'
      owner: NativeModelOptionsOwner
    }
  }
}
