export class TokenEstimator {
  /**
   * Estimates the number of tokens in a given text.
   * A highly reliable rule-based estimation mimicking BPE tokenization:
   * - Words: 1 token per 4 characters (rounded up)
   * - Punctuation/Symbols: 1 token each
   * - Spaces: 1 token per 2 spaces (rounded up)
   */
  static estimate(text: string): number {
    if (!text) return 0;
    
    // Match words, punctuation marks, and whitespace sequences
    const segments = text.match(/[\w]+|[^\w\s]|\s+/g) || [];
    let count = 0;
    
    for (const segment of segments) {
      if (/^\s+$/.test(segment)) {
        // Space sequence: roughly 1 token per 2 spaces
        count += Math.ceil(segment.length / 2);
      } else if (/^\w+$/.test(segment)) {
        // Alphanumeric word: average of 4 characters per token
        count += Math.ceil(segment.length / 4);
      } else {
        // Punctuation symbol: typically 1 token each
        count += segment.length;
      }
    }
    
    return count;
  }
}
