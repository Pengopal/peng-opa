export function emptyRuleSet() {
    return {
        schemaVersion: 1,
        fields: [],
        outcomes: [],
        rules: [],
        otherwise: { allowed: false, reason: "No rule matched", outcomes: {} },
    };
}
//# sourceMappingURL=types.js.map