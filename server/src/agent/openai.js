import OpenAI from "openai"

export const DEFAULT_MODEL = "gpt-4o-mini"

export function createOpenAI(env = process.env) {
  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY must be set")
  }
  return new OpenAI({ apiKey })
}
