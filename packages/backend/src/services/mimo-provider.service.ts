/**
 * MiMo AI provider — thin wrapper around an OpenAI-compatible chat endpoint.
 *
 * All features degrade gracefully when MIMO_API_KEY is not set: `isConfigured`
 * returns false and callers skip their AI step without error.
 */

import { env } from '../config/env.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export class MiMoProvider {
  get isConfigured(): boolean {
    return Boolean(env.MIMO_API_KEY);
  }

  /**
   * Send a chat completion request. Returns the assistant message content.
   * Throws on network or API errors — callers should catch and log.
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('MIMO_API_KEY is not configured');
    }

    const body: Record<string, unknown> = {
      model: env.MIMO_MODEL,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
    };

    if (options.json) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${env.MIMO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.MIMO_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`MiMo API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('MiMo returned empty response');

    return content;
  }

  /**
   * Convenience: send a single user prompt with an optional system preamble.
   */
  async ask(userPrompt: string, systemPrompt?: string, options?: ChatOptions): Promise<string> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userPrompt });
    return this.chat(messages, options);
  }
}

export const mimoProvider = new MiMoProvider();
