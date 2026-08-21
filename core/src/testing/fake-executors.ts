import type { ToolExecutionContext, ToolExecutor, ToolResult } from "../tools/types.ts";

/**
 * Fake tool executors.
 *
 * Tests and benchmarks must never perform a production side effect. These record what they were
 * asked to do so a test can assert on the exact payload - which is how "the corrected budget reached
 * the action" becomes a checkable fact rather than an inference from the reply text.
 */

export interface RecordedCall {
  args: Record<string, unknown>;
  context: ToolExecutionContext;
  at: number;
}

export class RecordingExecutor implements ToolExecutor {
  readonly calls: RecordedCall[] = [];
  private readonly responder: (args: Record<string, unknown>, call: number) => ToolResult;

  constructor(responder?: (args: Record<string, unknown>, call: number) => ToolResult) {
    this.responder = responder ?? (() => ({ ok: true, output: {} }));
  }

  get callCount(): number {
    return this.calls.length;
  }

  get lastArgs(): Record<string, unknown> | undefined {
    return this.calls[this.calls.length - 1]?.args;
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    this.calls.push({ args, context, at: Date.now() });
    return this.responder(args, this.calls.length);
  }
}

/** Always succeeds. Optionally returns authoritative facts and echoes chosen argument keys. */
export function successExecutor(options: { output?: Record<string, unknown>; echoArgs?: string[] } = {}): RecordingExecutor {
  return new RecordingExecutor((args) => {
    const output: Record<string, unknown> = { ...(options.output ?? {}) };
    for (const key of options.echoArgs ?? []) output[key] = args[key];
    return { ok: true, output };
  });
}

/** Always fails with the given code/message. Used to test truthful failure reporting. */
export function failureExecutor(code = "transport_failed", message = "the message could not be delivered"): RecordingExecutor {
  return new RecordingExecutor(() => ({ ok: false, error: { code, message }, retryable: true }));
}

/**
 * A dry-run email transport: records the payload and reports success without sending anything.
 *
 * `mode: "fail"` makes it report a transport failure instead, which is how the benchmark exercises
 * the failure path without ever touching a real mail server.
 */
export function emailDryRun(mode: "success" | "fail" = "success"): RecordingExecutor {
  return new RecordingExecutor((_args, call) =>
    mode === "success"
      ? {
          ok: true,
          output: { delivered: true, transport: "dry_run", message_id: `dry-run-${call}` },
          facts: [
            {
              key: "handoff_transmitted",
              value: true,
              description: "The handoff was transmitted to the team. This is the runtime's own record of the dispatch.",
            },
          ],
        }
      : {
          ok: false,
          error: { code: "transport_unavailable", message: "the handoff could not be transmitted" },
          retryable: true,
        },
  );
}
