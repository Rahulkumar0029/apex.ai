import { config } from '../../config';
import { AssemblyAIClient } from './AssemblyAIClient';
import { DeepgramClient } from './DeepgramClient';
import type { ISpeechService } from '../../interfaces/ISpeechService';

// DeepgramClient is a stub until task 9.2 provides the full implementation
export const speechService: ISpeechService =
  config.SPEECH_PROVIDER === 'deepgram'
    ? new DeepgramClient()
    : new AssemblyAIClient();
