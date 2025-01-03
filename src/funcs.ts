import { SearchSubtitlesParams, SubtitleData, QueryParams } from "./types";

/**
 * Constructs a URL for the Wyzie Subs API based on the provided parameters.
 *
 * @param {SearchSubtitlesParams} params - The search parameters
 * @returns {Promise<URL>} The constructed URL for the API request
 * @internal
 */
async function constructUrl({
  tmdb_id,
  imdb_id,
  season,
  episode,
  language,
  format,
  hi,
}: SearchSubtitlesParams): Promise<URL> {
  const url = new URL("https://sub.wyzie.ru/search");
  const queryParams: QueryParams = {
    id: String(tmdb_id || imdb_id),
    season,
    episode,
    language,
    format,
    hi,
  };

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value);
    }
  });

  return url;
}

/**
 * Fetches subtitle data from the Wyzie Subs API.
 *
 * @param {URL} url - The API endpoint URL
 * @returns {Promise<SubtitleData[]>} Array of subtitle metadata
 * @throws {Error} If the HTTP request fails
 * @internal
 */
async function fetchSubtitles(url: URL): Promise<SubtitleData[]> {
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Converts subtitle content to WebVTT format.
 * Handles various subtitle formats and normalizes them to valid WebVTT.
 *
 * @param {string} subtitleUrl - URL of the subtitle file to fetch and convert
 * @returns {Promise<string>} The subtitle content in WebVTT format
 * @throws {Error} If fetching or parsing fails
 * @internal
 */
async function parseToVTT(subtitleUrl: string): Promise<string> {
  try {
    const response = await fetch(subtitleUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch subtitle content: ${response.status}`);
    }

    const content = await response.text();

    // Normalize line endings
    const normalizedContent = content
      .replace(/\r\n/g, "\n") // Convert CRLF to LF
      .replace(/\r/g, "\n") // Convert CR to LF
      .trim();

    // Start with VTT header
    let vtt = "WEBVTT\n\n";

    // Split into blocks and process each one
    const blocks = normalizedContent.split(/\n\n+/);

    for (const block of blocks) {
      // Skip empty blocks
      if (!block.trim()) continue;

      // Split into lines and clean them
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length < 2) continue;

      // Find timestamp line using WebVTT timestamp format
      const timestampIndex = lines.findIndex((line) =>
        /^\d{1,2}:\d{2}(?::\d{2})?[,\.]\d{3}(?:\.|,)?\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?[,\.]\d{3}(?:\.|,)?$/.test(
          line,
        ),
      );

      if (timestampIndex === -1) continue;

      // Extract text lines after timestamp
      const textLines = lines
        .slice(timestampIndex + 1)
        .filter((line) => !/^\d+$/.test(line)) // Remove subtitle numbers
        .filter((line) => line.length > 0); // Remove empty lines

      if (textLines.length === 0) continue;

      // Normalize timestamp format
      let timestampLine = lines[timestampIndex];
      timestampLine = timestampLine
        .replace(/[,.](?=\s*-->)/, "") // Remove trailing separators before arrow
        .replace(/[,.]$/, "") // Remove trailing separators at end
        .replace(/,(\d{3})/g, ".$1"); // Convert comma to dot for milliseconds

      // Add the block with proper WebVTT spacing
      vtt += `${timestampLine}\n${textLines.join("\n")}\n\n`;
    }

    // Ensure proper WebVTT format with consistent spacing
    const cleanedVtt =
      vtt
        .replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines
        .trim() + "\n\n"; // Ensure proper ending

    return cleanedVtt;
  } catch (error) {
    console.error("Error in parseToVTT:", error);
    throw error;
  }
}

/**
 * Main function to search for subtitles using the Wyzie Subs API.
 *
 * @example
 * ```typescript
 * // Basic search by TMDB ID
 * const subtitles = await searchSubtitles({ tmdb_id: 123456 });
 *
 * // Search with VTT parsing
 * const { subtitles, vttContent } = await searchSubtitles({
 *   tmdb_id: 123456,
 *   parseVTT: true
 * });
 * ```
 *
 * @param {SearchSubtitlesParams & { parseVTT?: boolean }} params - Search parameters
 * @returns {Promise<SubtitleData[] | { subtitles: SubtitleData[]; vttContent: string }>}
 *          Returns either an array of subtitles or an object with subtitles and parsed VTT content
 * @throws {Error} If the search or parsing fails
 * @public
 */
export async function searchSubtitles(
  params: SearchSubtitlesParams & { parseVTT?: boolean },
): Promise<SubtitleData[] | { subtitles: SubtitleData[]; vttContent: string }> {
  try {
    const url = await constructUrl(params);
    const subtitles = await fetchSubtitles(url);

    if (params.parseVTT && subtitles.length > 0) {
      // Parse the first subtitle to VTT format
      const vttContent = await parseToVTT(subtitles[0].url);
      return { subtitles, vttContent };
    }

    return subtitles;
  } catch (error) {
    throw new Error(`Error fetching subtitles: ${error}`);
  }
}
