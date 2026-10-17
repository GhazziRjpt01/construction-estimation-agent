import { SYSTEM_PROMPT } from "./prompt.js"
import { TOOL_DEFINITIONS, executeTool } from "./tools.js"

const MAX_ROUNDS = 6

export function safeClientReason(
  err,
  fallback = "The assistant could not finish the reply."
) {
  const message = err instanceof Error ? err.message : ""
  const line = message.split("\n")[0].replace(/\s+/g, " ").trim()
  if (
    !line ||
    line.length > 180 ||
    /sk-|eyJ|supabase|service_role|api[_-]?key|bearer\s/i.test(line)
  ) {
    return fallback
  }
  return line
}

export function applyToolDelta(calls, part) {
  const index = part.index ?? 0
  const current = calls[index] ?? { id: "", name: "", arguments: "" }
  if (part.id) {
    current.id = part.id
  }
  if (part.function?.name) {
    current.name += part.function.name
  }
  if (part.function?.arguments) {
    current.arguments += part.function.arguments
  }
  calls[index] = current
  return calls
}

export async function runTurn({
  openai,
  model,
  session,
  message,
  loadCatalog,
  loadRates,
  onDelta,
  onTool,
  isClosed,
}) {
  const historyLength = session.messages.length
  session.messages.push({ role: "user", content: message })
  let text = ""

  try {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      if (isClosed?.()) {
        break
      }

      const completion = await readCompletion({
        openai,
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...session.messages,
        ],
        onDelta,
      })

      if (completion.content) {
        text += completion.content
      }

      if (completion.toolCalls.length === 0) {
        session.messages.push({
          role: "assistant",
          content: completion.content || "",
        })
        break
      }

      session.messages.push({
        role: "assistant",
        content: completion.content || null,
        tool_calls: completion.toolCalls.map((call) => ({
          id: call.id,
          type: "function",
          function: {
            name: call.name,
            arguments: call.arguments,
          },
        })),
      })

      let interrupted = false
      for (const call of completion.toolCalls) {
        if (isClosed?.()) {
          interrupted = true
          session.messages.push(toolReply(call.id, "The reply was interrupted."))
          continue
        }
        onTool?.(call.name)
        let result
        try {
          result = await executeTool(call.name, call.arguments, {
            session,
            loadCatalog,
            loadRates,
          })
        } catch (err) {
          result = {
            error: safeClientReason(err, "The tool could not finish."),
          }
        }
        session.messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }
      if (interrupted) {
        break
      }
    }
  } catch (err) {
    session.messages.splice(historyLength)
    throw err
  }

  return { text }
}

function toolReply(toolCallId, reason) {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    content: JSON.stringify({ error: reason }),
  }
}

async function readCompletion({ openai, model, messages, onDelta }) {
  const stream = await openai.chat.completions.create({
    model,
    messages,
    tools: TOOL_DEFINITIONS,
    stream: true,
  })

  let content = ""
  const calls = []
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta
    if (!delta) {
      continue
    }
    if (delta.content) {
      content += delta.content
      onDelta?.(delta.content)
    }
    for (const part of delta.tool_calls ?? []) {
      applyToolDelta(calls, part)
    }
  }

  return {
    content,
    toolCalls: calls.filter(Boolean),
  }
}
