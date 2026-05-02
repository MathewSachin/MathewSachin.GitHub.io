import * as ion from 'ion-js';

export type IonOperation = 'format' | 'minify' | 'toJson';

export interface IonResult {
  output: string;
  error: string | null;
}

export function processIon(raw: string, operation: IonOperation): IonResult {
  if (!raw.trim()) return { output: '', error: null };

  try {
    // Parse the ION text input into a DOM value
    const value = ion.load(raw);

    if (operation === 'toJson') {
      // Convert ION to JSON - ion.load returns a JS value that JSON.stringify understands
      const pretty = JSON.stringify(value, null, 2);
      return { output: pretty, error: null };
    }

    if (operation === 'minify') {
      const minified = ion.dumpText(value);
      return { output: minified, error: null };
    }

    // format: pretty-print with ion's pretty-text serialiser
    const formatted = ion.dumpPrettyText(value);
    return { output: formatted, error: null };
  } catch (e: unknown) {
    const err = e as Error | undefined;
    return { output: '', error: err?.message ?? String(e) };
  }
}
