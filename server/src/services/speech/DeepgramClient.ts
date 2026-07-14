import { EventEmitter } from 'events';
import type { Readable } from 'stream';
import axios from 'axios';
import { config } from '../../config';
import type { ISpeechService, TranscriptionResult } from '../../interfaces/ISpeechService';

const transcriptStore = new Map<string, string>();

export class DeepgramClient implements ISpeechService {
  private readonly apiKey = config.DEEPGRAM_API_KEY;
  private readonly baseUrl = 'https://api.deepgram.com/v1';

  streamTranscription(audioStream: Readable, sessionId: string): EventEmitter {
    const emitter = new EventEmitter();
    transcriptStore.set(sessionId, '');
    const chunks: Buffer[] = [];

    audioStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      emitter.emit('chunk', { sessionId, text: '', confidence: 1, isFinal: false, timestamp: Date.now() } as TranscriptionResult);
    });

    audioStream.on('end', async () => {
      try {
        const audioBuffer = Buffer.concat(chunks);
        if (audioBuffer.length === 0) {
          emitter.emit('final', { sessionId, text: '', confidence: 1, isFinal: true, timestamp: Date.now() } as TranscriptionResult);
          return;
        }

        // Send to Deepgram transcription endpoint
        const res = await axios.post<{
          results: { channels: Array<{ alternatives: Array<{ transcript: string; confidence: number }> }> };
        }>(
          `${this.baseUrl}/listen?punctuate=true&language=en`,
          audioBuffer,
          {
            headers: {
              Authorization: `Token ${this.apiKey}`,
              'Content-Type': 'audio/wav',
            },
          }
        );

        const alt = res.data.results?.channels?.[0]?.alternatives?.[0];
        const finalText = alt?.transcript ?? '';
        const confidence = alt?.confidence ?? 1;
        transcriptStore.set(sessionId, finalText);

        const final: TranscriptionResult = { sessionId, text: finalText, confidence, isFinal: true, timestamp: Date.now() };
        emitter.emit('chunk', final);
        emitter.emit('final', final);
      } catch (err) {
        emitter.emit('error', err);
      }
    });

    audioStream.on('error', (err) => emitter.emit('error', err));
    return emitter;
  }

  async finalizeTranscript(sessionId: string): Promise<string> {
    return transcriptStore.get(sessionId) ?? '';
  }

  async synthesize(text: string, voice: string): Promise<string> {
    // Deepgram TTS — returns empty string if API key is not configured
    if (!this.apiKey) return '';
    try {
      const res = await axios.post<ArrayBuffer>(
        `${this.baseUrl}/speak?model=${voice || 'aura-asteria-en'}`,
        { text },
        {
          headers: { Authorization: `Token ${this.apiKey}`, 'Content-Type': 'application/json' },
          responseType: 'arraybuffer',
        }
      );
      const b64 = Buffer.from(res.data).toString('base64');
      return `data:audio/mp3;base64,${b64}`;
    } catch {
      return '';
    }
  }
}
