import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  generateDeterministicQuiz,
  type DifficultyLevel,
  type VideoFormat,
  type QuizQuestion,
  type YouTubeMetadata,
} from './src/utils/quizEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  app.post('/api/agent/generate-quiz', async (req, res) => {
    const topic = String(req.body?.topic || 'Science & Space Discovery').trim();
    const count = Math.max(3, Math.min(Number(req.body?.count) || 5, 15));
    const difficulty = (req.body?.difficulty || 'Medium') as DifficultyLevel;
    const format = (req.body?.format || '16:9') as VideoFormat;

    const ai = getGenAIClient();
    if (!ai) {
      const fallback = generateDeterministicQuiz(topic, count, difficulty, format);
      return res.json({
        source: 'local-engine',
        ...fallback,
      });
    }

    try {
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create a high-retention YouTube ${format === '9:16' ? 'Shorts' : 'long-form'} trivia quiz about "${topic}" with ${count} multiple-choice questions at ${difficulty} difficulty. Each question must have 4 concise options, a verified correctIndex (0-3), a 1-sentence factual explanation for the answer reveal card, and high-CTR YouTube packaging metadata.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    categoryTag: { type: Type.STRING },
                  },
                  required: ['prompt', 'options', 'correctIndex', 'explanation', 'categoryTag'],
                },
              },
              youtubeMeta: {
                type: Type.OBJECT,
                properties: {
                  primaryTitle: { type: Type.STRING },
                  alternateTitle: { type: Type.STRING },
                  descriptionLead: { type: Type.STRING },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  thumbnailHeadline: { type: Type.STRING },
                  thumbnailSubtext: { type: Type.STRING },
                  targetAudience: { type: Type.STRING },
                },
                required: [
                  'primaryTitle',
                  'alternateTitle',
                  'descriptionLead',
                  'tags',
                  'thumbnailHeadline',
                  'thumbnailSubtext',
                  'targetAudience',
                ],
              },
            },
            required: ['questions', 'youtubeMeta'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 1500)
      );

      const response = await Promise.race([geminiPromise, timeoutPromise]);

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error('Empty response from Gemini model');
      }

      const parsed = JSON.parse(rawText);
      const questions: QuizQuestion[] = (parsed.questions || []).slice(0, count).map((q: any, idx: number) => {
        const opts = Array.isArray(q.options) && q.options.length >= 4
          ? [String(q.options[0]), String(q.options[1]), String(q.options[2]), String(q.options[3])]
          : ['Option A', 'Option B', 'Option C', 'Option D'];
        const cIdx = typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3 ? q.correctIndex : 0;
        return {
          id: `q-${Date.now()}-${idx + 1}`,
          prompt: String(q.prompt || `Question ${idx + 1} about ${topic}`),
          options: opts as [string, string, string, string],
          correctIndex: cIdx,
          explanation: String(q.explanation || 'Verified trivia fact.'),
          categoryTag: String(q.categoryTag || topic.slice(0, 20)),
          difficulty,
          voiceoverScript: `Question ${idx + 1}. ${q.prompt} Is it A: ${opts[0]}, B: ${opts[1]}, C: ${opts[2]}, or D: ${opts[3]}?`,
        };
      });

      if (questions.length === 0) {
        throw new Error('No valid questions parsed');
      }

      const youtubeMeta: YouTubeMetadata = {
        primaryTitle: String(parsed.youtubeMeta?.primaryTitle || `Can You Pass This ${topic} Quiz?`),
        alternateTitle: String(parsed.youtubeMeta?.alternateTitle || `96% Fail This ${topic} Trivia Challenge`),
        descriptionLead: String(parsed.youtubeMeta?.descriptionLead || `Test your knowledge on ${topic}!`),
        tags: Array.isArray(parsed.youtubeMeta?.tags) ? parsed.youtubeMeta.tags.map(String) : [topic.toLowerCase(), 'quiz'],
        thumbnailHeadline: String(parsed.youtubeMeta?.thumbnailHeadline || `96% FAIL AT Q3`),
        thumbnailSubtext: String(parsed.youtubeMeta?.thumbnailSubtext || `${topic.toUpperCase()} QUIZ`),
        targetAudience: String(parsed.youtubeMeta?.targetAudience || 'Quiz & trivia fans'),
      };

      return res.json({
        source: 'gemini-3.8-flash',
        questions,
        youtubeMeta,
      });
    } catch (_error) {
      const fallback = generateDeterministicQuiz(topic, count, difficulty, format);
      return res.json({
        source: 'local-engine',
        ...fallback,
      });
    }
  });

  app.post('/api/agent/tts', async (req, res) => {
    const text = String(req.body?.text || '').trim();
    const voiceName = String(req.body?.voiceName || 'Kore');

    if (!text) {
      return res.status(400).json({ error: 'Text is required for voiceover synthesis.' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.json({
        source: 'browser-synth',
        audioDataUrl: null,
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({
          source: 'gemini-3.8-flash-lite-tts',
          audioDataUrl: `data:audio/wav;base64,${base64Audio}`,
        });
      }
      return res.json({ source: 'browser-synth', audioDataUrl: null });
    } catch (_err) {
      return res.json({ source: 'browser-synth', audioDataUrl: null });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuizCast PC Agent Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
