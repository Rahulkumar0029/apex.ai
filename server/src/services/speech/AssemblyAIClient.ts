import { EventEmitter } from 'events';
import type { Readable } from 'stream';
import axios from 'axios';
import { config } from '../../config';
import type { ISpeechService, TranscriptionResult } from '../../interfaces/ISpeechService';

// In-memory store for partial transcripts per session
const transcriptStore = new Map<string, string>();

export class AssemblyAIClient implements ISpeechService {
  private readonly apiKey = config.ASSEMBLYAI_API_KEY;
  private readonly baseUrl = 'https://api.assemblyai.com/v2';

  streamTranscription(audioStream: Readable, sessionId: string): EventEmitter {
    const emitter = new EventEmitter();
    transcriptStore.set(sessionId, '');

    const chunks: Buffer[] = [];

    audioStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      // Emit partial transcript placeholder — real streaming requires WebSocket
      const partial: TranscriptionResult = {
        sessionId,
        text: '',
        confidence: 1,
        isFinal: false,
        timestamp: Date.now(),
      };
      emitter.emit('chunk', partial);
    });

    audioStream.on('end', async () => {
      try {
        const audioBuffer = Buffer.concat(chunks);
        if (audioBuffer.length === 0) {
          emitter.emit('final', { sessionId, text: '', confidence: 1, isFinal: true, timestamp: Date.now() });
          return;
        }

        // Upload audio
        const uploadRes = await axios.post<{ upload_url: string }>(
          `${this.baseUrl}/upload`,
          audioBuffer,
          { headers: { authorization: this.apiKey, 'Content-Type': 'application/octet-stream' } }
        );

        // Request transcription
        const transcriptRes = await axios.post<{ id: string }>(
          `${this.baseUrl}/transcript`,
          { audio_url: uploadRes.data.upload_url, language_detection: true },
          { headers: { authorization: this.apiKey } }
        );

        // Poll for completion
        const transcriptId = transcriptRes.data.id;
        let result: { status: string; text?: string; confidence?: number } = { status: 'queued' };
        while (result.status !== 'completed' && result.status !== 'error') {
          await new Promise(r => setTimeout(r, 1500));
          const poll = await axios.get<typeof result>(
            `${this.baseUrl}/transcript/${transcriptId}`,
            { headers: { authorization: this.apiKey } }
          );
          result = poll.data;
        }

        const finalText = result.text ?? '';
        transcriptStore.set(sessionId, finalText);

        const final: TranscriptionResult = {
          sessionId,
          text: finalText,
          confidence: result.confidence ?? 1,
          isFinal: true,
          timestamp: Date.now(),
        };
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
    // AssemblyAI does not provide TTS — use a simple fallback
    // Returns empty string; audio is optional in the interview flow
    // TTS via browser SpeechSynthesis is used on the frontend instead
    console.log(`[Speech] TTS requested for voice "${voice}": "${text.substring(0, 60)}..."`);
    return '';
  }
}
