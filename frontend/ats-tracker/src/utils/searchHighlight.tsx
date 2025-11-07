import React from "react";

/**
 * Highlights matching search terms in text
 * @param text - The text to highlight
 * @param searchTerm - The search term to highlight
 * @returns React element with highlighted text
 */
export function highlightSearchTerm(
  text: string,
  searchTerm?: string
): React.ReactNode {
  if (!searchTerm || !text) {
    return text;
  }

  const searchLower = searchTerm.toLowerCase();

  // Split search term into words for better matching
  const searchWords = searchLower.split(/\s+/).filter((word) => word.length > 0);

  if (searchWords.length === 0) {
    return text;
  }

  // Create a regex pattern that matches any of the search words
  const pattern = new RegExp(
    `(${searchWords.map((word) => escapeRegex(word)).join("|")})`,
    "gi"
  );

  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex
  pattern.lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add highlighted match
    parts.push(
      <mark
        key={match.index}
        className="bg-yellow-200 text-yellow-900 px-0.5 rounded"
      >
        {match[0]}
      </mark>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

