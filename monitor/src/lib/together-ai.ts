export type TogetherModelId =
  | "MiniMaxAI/MiniMax-M2.7"
  | "moonshotai/Kimi-K2.5"
  | "zai-org/GLM-5"
  | "openai/gpt-oss-20b"
  | "openai/gpt-oss-120b"
  | "Qwen/Qwen3.5-397B-A17B"

export type TogetherChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type TogetherChatResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: {
    message?: string
  } | string
}

export const TOGETHER_MODELS: Array<{
  id: TogetherModelId
  name: string
  provider: string
  type: "paid"
  contextWindow: number
  inputPer1M: number
  outputPer1M: number
  avgInputTokens: number
  avgOutputTokens: number
}> = [
  {
    id: "MiniMaxAI/MiniMax-M2.7",
    name: "MiniMax M2.7",
    provider: "MiniMaxAI / Together",
    type: "paid",
    contextWindow: 128_000,
    inputPer1M: 0,
    outputPer1M: 0,
    avgInputTokens: 18_000,
    avgOutputTokens: 4_500,
  },
  {
    id: "moonshotai/Kimi-K2.5",
    name: "Kimi K2.5",
    provider: "Moonshot AI / Together",
    type: "paid",
    contextWindow: 256_000,
    inputPer1M: 0,
    outputPer1M: 0,
    avgInputTokens: 24_000,
    avgOutputTokens: 6_000,
  },
  {
    id: "zai-org/GLM-5",
    name: "GLM-5",
    provider: "Z.ai / Together",
    type: "paid",
    contextWindow: 128_000,
    inputPer1M: 0,
    outputPer1M: 0,
    avgInputTokens: 16_000,
    avgOutputTokens: 4_000,
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    provider: "OpenAI OSS / Together",
    type: "paid",
    contextWindow: 128_000,
    inputPer1M: 0,
    outputPer1M: 0,
    avgInputTokens: 12_000,
    avgOutputTokens: 3_500,
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    provider: "OpenAI OSS / Together",
    type: "paid",
    contextWindow: 128_000,
    inputPer1M: 0,
    outputPer1M: 0,
    avgInputTokens: 20_000,
    avgOutputTokens: 5_500,
  },
  {
    id: "Qwen/Qwen3.5-397B-A17B",
    name: "Qwen 3.5 397B A17B",
    provider: "Qwen / Together",
    type: "paid",
    contextWindow: 256_000,
    inputPer1M: 0,
    outputPer1M: 0,
    avgInputTokens: 22_000,
    avgOutputTokens: 6_500,
  },
]

export async function runTogetherChat(
  model: TogetherModelId,
  messages: TogetherChatMessage[],
): Promise<{ content: string; usage?: TogetherChatResponse["usage"] }> {
  const res = await fetch("/__dev/together/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  })

  const data = await res.json() as TogetherChatResponse
  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || `Together API failed (${res.status})`
    throw new Error(message)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error("Together API returned an empty response.")
  return { content, usage: data.usage }
}
