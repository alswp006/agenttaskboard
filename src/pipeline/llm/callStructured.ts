import type { CallStructured, CallStructuredCallOptions, JSONSchema } from "../design/schemas";
import { TruncatedResponseError } from "./parseJsonResponse";

export interface CallStructuredConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_BASE_URL = "https://api.anthropic.com/v1/messages";
const TOOL_NAME = "emit_structured_output";

/**
 * Creates a callStructured() function that forces the response through Anthropic's
 * tool_use structured-output mode — no free-form JSON + regex extraction anywhere.
 */
export function createCallStructured(config: CallStructuredConfig): CallStructured {
  const model = config.model ?? DEFAULT_MODEL;
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  return async function callStructured(
    prompt: string,
    schema?: JSONSchema,
    options?: CallStructuredCallOptions
  ): Promise<unknown> {
    if (!schema) {
      throw new Error("callStructured requires a schema — free-form JSON calls are not supported");
    }

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 4000,
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            name: TOOL_NAME,
            description: "Return the structured result matching the given schema.",
            input_schema: schema,
          },
        ],
        tool_choice: { type: "tool", name: TOOL_NAME },
      }),
    });

    if (!response.ok) {
      throw new Error(`callStructured request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; input?: unknown }>;
      stop_reason?: string;
    };

    if (data.stop_reason === "max_tokens") {
      throw new TruncatedResponseError(
        "TruncatedResponseError: callStructured response truncated (stop_reason=max_tokens)",
        data.stop_reason
      );
    }

    const toolUseBlock = (data.content ?? []).find((block) => block.type === "tool_use");
    if (!toolUseBlock) {
      throw new Error("callStructured: response did not include a tool_use block");
    }

    return toolUseBlock.input;
  };
}
