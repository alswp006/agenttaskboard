export interface LLMRawResponse {
  stop_reason: string;
  content: string;
  originalPrompt?: string;
}

export interface PipelineEvent {
  type: string;
  [key: string]: unknown;
}

export type SplitRetryFn = (
  originalPrompt: string | undefined,
  level: number
) => Promise<LLMRawResponse>;

export interface ParseJsonResponseOptions {
  /** Re-requests the same prompt split into a smaller scope (e.g. half a packet). */
  splitRetryFn?: SplitRetryFn;
  /** Records diagnostic events (e.g. to pipeline_events) when parsing fails. */
  recordEvent?: (event: PipelineEvent) => void;
}

const CONTEXT_WINDOW = 200;
const MAX_SPLIT_RETRY_LEVELS = 2;

export class TruncatedResponseError extends Error {
  name = "TruncatedResponseError";
  stopReason: string;

  constructor(message: string, stopReason: string) {
    super(message);
    this.stopReason = stopReason;
    Object.setPrototypeOf(this, TruncatedResponseError.prototype);
  }
}

export class ParseErrorWithContext extends Error {
  name = "ParseErrorWithContext";
  stopReason: string;
  totalLength: number;
  failurePosition: number;
  contextBefore: string;
  contextAfter: string;

  constructor(
    message: string,
    details: {
      stopReason: string;
      totalLength: number;
      failurePosition: number;
      contextBefore: string;
      contextAfter: string;
    }
  ) {
    super(message);
    this.stopReason = details.stopReason;
    this.totalLength = details.totalLength;
    this.failurePosition = details.failurePosition;
    this.contextBefore = details.contextBefore;
    this.contextAfter = details.contextAfter;
    Object.setPrototypeOf(this, ParseErrorWithContext.prototype);
  }
}

/**
 * Parses an LLM response's JSON content. If the response was cut off by the
 * model's token limit (stop_reason === "max_tokens"), JSON.parse is never
 * attempted — a truncated response can't produce valid JSON, and trying just
 * hides the real cause behind a generic parse error. Instead this splits the
 * original request into a smaller scope and retries, up to two levels deep.
 *
 * Deliberately NOT declared `async`: when there's no splitRetryFn to await,
 * the failure is known synchronously and must throw synchronously (callers
 * probe this with `expect(() => parseJsonResponse(...)).toThrow()`). It only
 * returns a Promise once a real async retry is in flight.
 */
export function parseJsonResponse(
  response: LLMRawResponse,
  options: ParseJsonResponseOptions = {}
): unknown {
  if (response.stop_reason === "max_tokens") {
    return handleTruncation(response, options, 0);
  }
  return parseOrThrow(response, options);
}

function handleTruncation(
  response: LLMRawResponse,
  options: ParseJsonResponseOptions,
  level: number
): unknown {
  const { splitRetryFn } = options;

  if (!splitRetryFn || level >= MAX_SPLIT_RETRY_LEVELS) {
    throw new TruncatedResponseError(
      `TruncatedResponseError: LLM response truncated (stop_reason=max_tokens) after ${level} split-retry attempt(s)`,
      response.stop_reason
    );
  }

  return retryTruncated(response, options, level, splitRetryFn);
}

async function retryTruncated(
  response: LLMRawResponse,
  options: ParseJsonResponseOptions,
  level: number,
  splitRetryFn: SplitRetryFn
): Promise<unknown> {
  let retryResponse: LLMRawResponse | undefined;
  try {
    retryResponse = await splitRetryFn(response.originalPrompt, level + 1);
  } catch {
    throw new TruncatedResponseError(
      `TruncatedResponseError: split-retry request failed at level ${level + 1}`,
      response.stop_reason
    );
  }

  if (retryResponse && retryResponse.stop_reason === "max_tokens") {
    return handleTruncation(retryResponse, options, level + 1);
  }

  if (retryResponse && typeof retryResponse.content === "string") {
    return parseOrThrow(retryResponse, options);
  }

  throw new TruncatedResponseError(
    `TruncatedResponseError: split-retry did not return usable content after ${level + 1} attempt(s)`,
    response.stop_reason
  );
}

function parseOrThrow(response: LLMRawResponse, options: ParseJsonResponseOptions): unknown {
  const { content, stop_reason } = response;

  try {
    return JSON.parse(content);
  } catch (err) {
    const repaired = attemptRepair(content);
    if (repaired !== undefined) return repaired;

    const nativeMessage = err instanceof Error ? err.message : String(err);
    const failurePosition = findFailurePosition(content, nativeMessage);
    const contextBefore = content.slice(Math.max(0, failurePosition - CONTEXT_WINDOW), failurePosition);
    const contextAfter = content.slice(failurePosition, failurePosition + CONTEXT_WINDOW);

    const error = new ParseErrorWithContext(
      `ParseErrorWithContext: JSON repair failed (stop_reason=${stop_reason}) - ${nativeMessage}`,
      {
        stopReason: stop_reason,
        totalLength: content.length,
        failurePosition,
        contextBefore,
        contextAfter,
      }
    );

    options.recordEvent?.({
      type: "parse_error",
      error: {
        message: error.message,
        stopReason: error.stopReason,
        totalLength: error.totalLength,
        failurePosition: error.failurePosition,
        contextBefore: error.contextBefore,
        contextAfter: error.contextAfter,
      },
    });

    throw error;
  }
}

/** Light, conservative repair — only fixes a trailing comma. Never invents closing brackets. */
function attemptRepair(content: string): unknown {
  const trimmed = content.trim();
  const candidate = trimmed.replace(/,\s*$/, "");
  if (candidate === trimmed) return undefined;
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

/**
 * Prefers the numeric offset V8 reports in its SyntaxError message. Older/newer
 * engines sometimes omit it (e.g. "Unexpected token 'x' ... is not valid JSON");
 * in that case, default to the edge of the context window itself so both
 * contextBefore and contextAfter still get populated with real content.
 */
function findFailurePosition(content: string, nativeMessage: string): number {
  const match = /position (\d+)/i.exec(nativeMessage);
  if (match) {
    return Math.min(Number(match[1]), content.length);
  }
  return Math.min(CONTEXT_WINDOW, content.length);
}

export { runner } from "../runner";
