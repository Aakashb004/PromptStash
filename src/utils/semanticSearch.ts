export interface SearchResult<T> {
  item: T;
  score: number;
}

export class SemanticSearch {
  private static tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  /**
   * Performs a local relevance-based semantic search scoring stashes using a hybrid 
   * TF-IDF & Field-Weighted keyword scoring model.
   */
  static search<T extends { title: string; text: string; tags: string[] }>(
    items: T[],
    query: string
  ): T[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return items;

    // 1. Tokenize all documents and fields
    const docsTokens = items.map((item) => {
      const titleTokens = this.tokenize(item.title);
      const textTokens = this.tokenize(item.text);
      const tagTokens = (item.tags || []).flatMap((t) => this.tokenize(t));
      
      const allTokens = [...titleTokens, ...textTokens, ...tagTokens];
      const uniqueTokens = new Set(allTokens);
      
      return {
        titleTokens,
        textTokens,
        tagTokens,
        uniqueTokens
      };
    });

    const docCount = items.length;
    
    // Calculate Document Frequency (DF) for IDF computation
    const df: Record<string, number> = {};
    docsTokens.forEach(({ uniqueTokens }) => {
      uniqueTokens.forEach((token) => {
        df[token] = (df[token] || 0) + 1;
      });
    });

    // 2. Score documents
    const results: SearchResult<T>[] = items.map((item, index) => {
      const tokens = docsTokens[index];
      let score = 0;

      queryTokens.forEach((qToken) => {
        const docFreq = df[qToken] || 0;
        
        // Smoothed BM25-style IDF to avoid division by zero or negative values
        const idf = Math.log(1 + (docCount - docFreq + 0.5) / (docFreq + 0.5));

        // Compute Term Frequency (TF) for each weighted field
        const titleTF = tokens.titleTokens.filter((t) => t === qToken).length;
        const tagTF = tokens.tagTokens.filter((t) => t === qToken).length;
        const textTF = tokens.textTokens.filter((t) => t === qToken).length;

        // Score formulation: heavy weights on title (10x) and tags (5x) + base text (1x)
        const termScore = (titleTF * 10 + tagTF * 5 + textTF * 1) * idf;
        score += termScore;
      });

      return {
        item,
        score
      };
    });

    // 3. Filter items with scores > 0 and sort by highest relevance descending
    return results
      .filter((res) => res.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((res) => res.item);
  }
}
