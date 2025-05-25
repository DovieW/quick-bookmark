import emojiMap from 'emoji-name-map';

// Function to get emoji name from an emoji character
export function getEmojiName(emojiChar: string): string | undefined {
  return emojiMap.get(emojiChar);
}

// Function to replace emojis in a string with their names
export function replaceEmojisWithNames(text: string): string {
  let newText = text;
  for (const emoji of emojiMap.keys()) {
    const emojiName = emojiMap.get(emoji);
    if (emojiName) {
      // Replace all occurrences of the emoji with its name, wrapped in colons
      // e.g., ✨ becomes :sparkles:
      // This helps in differentiating emoji names from regular text
      newText = newText.split(emoji).join(` :${emojiName}: `);
    }
  }
  // Remove any leading/trailing/extra spaces that might have been introduced
  return newText.replace(/\s+/g, ' ').trim();
}

// Function to extract potential emoji names from a search query
// e.g., "search for sparkles" -> "sparkles"
export function extractPotentialEmojiNames(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/);
    const potentialNames: string[] = [];
    // A simple heuristic: if a word is a known emoji name (without colons)
    // or a substring of an emoji name, consider it.
    // This can be refined further.
    for (const word of words) {
        if (emojiMap.values().some(name => name.includes(word))) {
            potentialNames.push(word);
        }
    }
    return potentialNames;
}

// Enhanced function to prepare text for Fuse.js search
// It appends emoji names to the original text.
export function prepareSearchableText(text: string): string {
  if (typeof text !== 'string' || !text) {
    return text || ''; // Return original text or empty string if invalid
  }

  const originalText = text;
  let emojiNamesFound = new Set<string>();

  if (emojiMap && typeof emojiMap.get === 'function' && typeof emojiMap.has === 'function') {
    try {
      // Iterate through the characters of the input text (graphemes)
      const chars = Array.from(text);
      for (const char of chars) {
        if (emojiMap.has(char)) {
          const name = emojiMap.get(char);
          if (name) {
            emojiNamesFound.add(name);
          }
        }
      }
    } catch (e) {
      console.error("Error processing emojis in prepareSearchableText:", e);
      // Continue without emoji names if an error occurs during emoji processing
    }
  } else {
    console.warn("emojiMap is not initialized correctly or not a Map. Skipping emoji name processing.");
  }

  const appendedNames = Array.from(emojiNamesFound).join(' ');
  // Concatenate original text with unique emoji names
  // Ensure trimming and single spacing for cleanliness
  return `${originalText} ${appendedNames}`.trim().replace(/\s+/g, ' ');
}
