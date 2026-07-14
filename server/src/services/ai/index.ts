import { config } from '../../config';
import { GeminiClient } from './GeminiClient';
import { OpenAIClient } from './OpenAIClient';
import type { IAIEngine } from '../../interfaces/IAIEngine';

export const aiEngine: IAIEngine =
  config.AI_PROVIDER === 'openai' ? new OpenAIClient() : new GeminiClient();
