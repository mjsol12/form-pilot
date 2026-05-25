import { defaultAdapter } from './defaultAdapter.js';

const adapters = new Map([
  [defaultAdapter.name, defaultAdapter]
]);

export function getAdapter(name = 'default') {
  const adapter = adapters.get(name);

  if (!adapter) {
    throw new Error(`Unknown adapter "${name}". Available adapters: ${[...adapters.keys()].join(', ')}`);
  }

  return adapter;
}
