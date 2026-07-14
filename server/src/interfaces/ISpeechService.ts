import { EventEmitter } from 'events';
import type { Readable } from 'stream';

export interface TranscriptionResult {
  sessionId: string;
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface ISpeechService {
  /** Start streaming STT — emits 'chunk' events with TranscriptionResult */
  streamTranscription(audioStream: Readable, sessionId: string): EventEmitter;
  /** Finalize and return the complete transcript for a session */
  finalizeTranscript(sessionId: string): Promise<string>;
  /** Synthesize text to audio, return a URL or base64 data URI */
  synthesize(text: string, voice: string): Promise<string>;
}
