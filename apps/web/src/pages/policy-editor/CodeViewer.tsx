import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker.start?worker";

// Use the bundled Monaco (no CDN) with its base worker; Rego is shown as plain text.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

/** Read-only Monaco viewer (lazy-loaded: Monaco is large). */
export default function CodeViewer({ value }: { value: string }) {
  const dark = document.documentElement.classList.contains("dark");
  return (
    <div className="h-96 overflow-hidden rounded-md border">
      <Editor
        value={value}
        language="plaintext"
        theme={dark ? "vs-dark" : "light"}
        options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 13, wordWrap: "on", domReadOnly: true }}
      />
    </div>
  );
}
