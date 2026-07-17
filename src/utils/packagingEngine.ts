export class PackagingEngine {
  /**
   * Extracts all custom placeholders from the template (excluding standard system variables).
   * E.g. "{{topic}}" -> ["topic"]
   */
  static extractCustomVariables(template: string): string[] {
    const matches = template.matchAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g);
    const vars: string[] = [];
    const systemVars = ["date", "time", "url", "title", "selection", "clipboard"];

    for (const match of matches) {
      const originalName = match[1];
      const lowerName = originalName.toLowerCase();
      if (!systemVars.includes(lowerName) && !vars.includes(originalName)) {
        vars.push(originalName);
      }
    }
    return vars;
  }

  /**
   * Resolves both system variables and custom variables in the template.
   */
  static async resolve(
    template: string,
    context: {
      url?: string;
      title?: string;
      selection?: string;
      clipboard?: string;
      customValues?: Record<string, string>;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    let result = template;
    if (context.systemPrompt) {
      result = `${context.systemPrompt}\n\n${result}`;
    }

    // 1. Resolve {{date}}
    result = result.replace(/\{\{\s*date\s*\}\}/gi, () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const date = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${date}`;
    });

    // 2. Resolve {{time}}
    result = result.replace(/\{\{\s*time\s*\}\}/gi, () => {
      const d = new Date();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const seconds = String(d.getSeconds()).padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    });

    // 3. Resolve {{url}}
    result = result.replace(/\{\{\s*url\s*\}\}/gi, () => context.url || "");

    // 4. Resolve {{title}}
    result = result.replace(/\{\{\s*title\s*\}\}/gi, () => context.title || "");

    // 5. Resolve {{selection}}
    result = result.replace(/\{\{\s*selection\s*\}\}/gi, () => context.selection || "");

    // 6. Resolve {{clipboard}}
    result = result.replace(/\{\{\s*clipboard\s*\}\}/gi, () => context.clipboard || "");

    // 7. Resolve custom values
    if (context.customValues) {
      for (const [key, val] of Object.entries(context.customValues)) {
        const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, "gi");
        result = result.replace(regex, val);
      }
    }

    return result;
  }
}
