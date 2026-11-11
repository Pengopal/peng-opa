export type SampleLanguage = "curl" | "javascript" | "python" | "csharp";

export const LANGUAGE_LABELS: Record<SampleLanguage, string> = { curl: "curl", javascript: "JavaScript", python: "Python", csharp: "C#" };

const indent = (text: string, spaces: number) => text.split("\n").join(`\n${" ".repeat(spaces)}`);

/** Copy-ready calls to the decide endpoint. Always the YOUR_API_KEY placeholder, never a real key. */
export function buildSamples({ baseUrl, policyKey, input }: { baseUrl: string; policyKey: string; input: unknown }): Record<SampleLanguage, string> {
  const url = `${baseUrl}/v1/decide/${policyKey}`;
  const body = JSON.stringify({ input }, null, 2);
  return {
    curl: `curl -X POST ${url} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/'/g, "'\\''")}'`,
    javascript: `const res = await fetch("${url}", {
  method: "POST",
  headers: {
    Authorization: "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${indent(body, 2)}),
});
const decision = await res.json();
if (decision.allowed) {
  // go ahead
}`,
    python: `import requests

res = requests.post(
    "${url}",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json=${indent(body.replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\bnull\b/g, "None"), 4)},
    timeout=5,
)
decision = res.json()
if decision["allowed"]:
    pass  # go ahead`,
    csharp: `using System.Net.Http.Json;

var http = new HttpClient();
http.DefaultRequestHeaders.Add("Authorization", "Bearer YOUR_API_KEY");
var res = await http.PostAsync(
    "${url}",
    new StringContent("""
${body}
""", System.Text.Encoding.UTF8, "application/json"));
var decision = await res.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
if (decision.GetProperty("allowed").GetBoolean())
{
    // go ahead
}`,
  };
}
