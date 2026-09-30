import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/config/env';

const globalForAnthropic = globalThis as unknown as { anthropic?: Anthropic };

export function getAnthropicClient() {
  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return globalForAnthropic.anthropic;
}
