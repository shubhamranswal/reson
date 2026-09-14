import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createChatCompletionsHandler } from "./handler";

export const POST = createChatCompletionsHandler({
  createOpenAIClient: createOpenAI,
  streamTextImpl: streamText,
});
