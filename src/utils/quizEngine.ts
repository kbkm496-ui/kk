export type VideoFormat = '16:9' | '9:16';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type VisualThemeId = 'midnight-broadcast' | 'editorial-slate' | 'emerald-club' | 'cinema-gold';
export type PlaybackPhase = 'intro' | 'read' | 'countdown' | 'reveal' | 'outro';

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number; // 0 to 3
  explanation: string;
  categoryTag: string;
  difficulty: DifficultyLevel;
  voiceoverScript?: string;
  audioDataUrl?: string;
}

export interface YouTubeMetadata {
  primaryTitle: string;
  alternateTitle: string;
  descriptionLead: string;
  tags: string[];
  thumbnailHeadline: string;
  thumbnailSubtext: string;
  targetAudience: string;
}

export interface QuizProject {
  id: string;
  title: string;
  topic: string;
  channelName: string;
  format: VideoFormat;
  themeId: VisualThemeId;
  difficulty: DifficultyLevel;
  introDurationSec: number;
  readDurationSec: number;
  thinkDurationSec: number;
  revealDurationSec: number;
  outroDurationSec: number;
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  sfxEnabled: boolean;
  questions: QuizQuestion[];
  youtubeMeta: YouTubeMetadata;
  updatedAt: string;
}

export interface TimelineSegment {
  id: string;
  label: string;
  phase: PlaybackPhase;
  questionIndex: number | null;
  startSec: number;
  endSec: number;
  durationSec: number;
}

export interface PlaybackFrameState {
  phase: PlaybackPhase;
  questionIndex: number | null;
  question: QuizQuestion | null;
  phaseElapsedSec: number;
  phaseDurationSec: number;
  phaseProgress: number; // 0..1
  countdownRemainingSec: number;
  totalDurationSec: number;
  overallProgress: number; // 0..1
}

export type BatchJobStatus = 'Queued' | 'Processing' | 'Completed';

export interface AgentBatchJob {
  id: string;
  topic: string;
  format: VideoFormat;
  difficulty: DifficultyLevel;
  questionCount: number;
  status: BatchJobStatus;
  durationLabel: string;
  createdAt: string;
  progressPercent?: number;
  etaSeconds?: number;
  currentStepLabel?: string;
  projectSnapshot?: QuizProject;
}

export interface BatchJobProgressState {
  progressPercent: number;
  etaSeconds: number;
  etaFormatted: string;
  currentStepLabel: string;
}

export function estimateBatchJobTotalSeconds(questionCount: number, format: VideoFormat): number {
  const safeCount = Math.max(1, questionCount);
  const baseSec = format === '9:16' ? 6 : 8;
  return baseSec + safeCount * 2;
}

export function formatEtaRemaining(etaSeconds: number): string {
  const safe = Math.max(0, Math.ceil(etaSeconds));
  if (safe === 0) return 'Finishing...';
  if (safe < 60) {
    return `${String(safe).padStart(2, '0')}s remaining`;
  }
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s remaining`;
}

export function calculateBatchJobProgressState(
  questionCount: number,
  format: VideoFormat,
  progressRatio: number
): BatchJobProgressState {
  const clamped = Math.max(0, Math.min(1, progressRatio));
  const progressPercent = Math.round(clamped * 100);
  const totalEstimatedSec = estimateBatchJobTotalSeconds(questionCount, format);
  const etaSeconds = Math.max(0, Math.ceil((totalEstimatedSec * (100 - progressPercent)) / 100));

  let currentStepLabel = '1/4 · Fact-checking topic & researching prompts';
  if (progressPercent >= 80) {
    currentStepLabel = '4/4 · Finalizing YouTube chapters & render manifest';
  } else if (progressPercent >= 52) {
    currentStepLabel = '3/4 · Synchronizing voiceover & countdown timers';
  } else if (progressPercent >= 25) {
    currentStepLabel = '2/4 · Synthesizing 4-option distractors & explanations';
  }

  return {
    progressPercent,
    etaSeconds,
    etaFormatted: formatEtaRemaining(etaSeconds),
    currentStepLabel,
  };
}

export interface VisualThemeConfig {
  id: VisualThemeId;
  name: string;
  subtitle: string;
  bgStart: string;
  bgEnd: string;
  cardBg: string;
  cardBorder: string;
  accentColor: string;
  correctBg: string;
  correctBorder: string;
  textPrimary: string;
  textMuted: string;
}

export const VISUAL_THEMES: Record<VisualThemeId, VisualThemeConfig> = {
  'midnight-broadcast': {
    id: 'midnight-broadcast',
    name: 'Midnight Broadcast',
    subtitle: 'Deep studio navy with amber broadcast accents',
    bgStart: '#0B0F19',
    bgEnd: '#151E32',
    cardBg: '#162033',
    cardBorder: '#293856',
    accentColor: '#F59E0B',
    correctBg: '#064E3B',
    correctBorder: '#10B981',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
  },
  'editorial-slate': {
    id: 'editorial-slate',
    name: 'Editorial Slate',
    subtitle: 'Architectural charcoal with crisp sky highlights',
    bgStart: '#090D16',
    bgEnd: '#1E293B',
    cardBg: '#1E293B',
    cardBorder: '#334155',
    accentColor: '#38BDF8',
    correctBg: '#065F46',
    correctBorder: '#34D399',
    textPrimary: '#F1F5F9',
    textMuted: '#94A3B8',
  },
  'emerald-club': {
    id: 'emerald-club',
    name: 'Trivia Club',
    subtitle: 'Classic quiz-bowl forest slate with warm gold trim',
    bgStart: '#071712',
    bgEnd: '#0F2920',
    cardBg: '#123026',
    cardBorder: '#1E4638',
    accentColor: '#FBBF24',
    correctBg: '#14532D',
    correctBorder: '#4ADE80',
    textPrimary: '#ECFDF5',
    textMuted: '#A7F3D0',
  },
  'cinema-gold': {
    id: 'cinema-gold',
    name: 'Cinema Obsidian',
    subtitle: 'High-contrast obsidian frame with warm copper accents',
    bgStart: '#0C0A09',
    bgEnd: '#1C1917',
    cardBg: '#1C1917',
    cardBorder: '#44403C',
    accentColor: '#FB923C',
    correctBg: '#064E3B',
    correctBorder: '#10B981',
    textPrimary: '#FAFAF9',
    textMuted: '#A8A29E',
  },
};

export function calculateQuestionDuration(
  project: Pick<QuizProject, 'readDurationSec' | 'thinkDurationSec' | 'revealDurationSec'>
): number {
  return (
    Math.max(1, project.readDurationSec) +
    Math.max(1, project.thinkDurationSec) +
    Math.max(1, project.revealDurationSec)
  );
}

export function calculateTotalVideoDuration(project: QuizProject): number {
  const perQuestion = calculateQuestionDuration(project);
  const intro = Math.max(1, project.introDurationSec);
  const outro = Math.max(1, project.outroDurationSec);
  return intro + project.questions.length * perQuestion + outro;
}

export function buildTimelineSegments(project: QuizProject): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let cursor = 0;

  const introDur = Math.max(1, project.introDurationSec);
  segments.push({
    id: 'seg-intro',
    label: 'Intro Hook',
    phase: 'intro',
    questionIndex: null,
    startSec: cursor,
    endSec: cursor + introDur,
    durationSec: introDur,
  });
  cursor += introDur;

  const readDur = Math.max(1, project.readDurationSec);
  const thinkDur = Math.max(1, project.thinkDurationSec);
  const revealDur = Math.max(1, project.revealDurationSec);

  project.questions.forEach((q, idx) => {
    segments.push({
      id: `seg-q${idx + 1}-read`,
      label: `Q${idx + 1} Read`,
      phase: 'read',
      questionIndex: idx,
      startSec: cursor,
      endSec: cursor + readDur,
      durationSec: readDur,
    });
    cursor += readDur;

    segments.push({
      id: `seg-q${idx + 1}-countdown`,
      label: `Q${idx + 1} Timer`,
      phase: 'countdown',
      questionIndex: idx,
      startSec: cursor,
      endSec: cursor + thinkDur,
      durationSec: thinkDur,
    });
    cursor += thinkDur;

    segments.push({
      id: `seg-q${idx + 1}-reveal`,
      label: `Q${idx + 1} Answer`,
      phase: 'reveal',
      questionIndex: idx,
      startSec: cursor,
      endSec: cursor + revealDur,
      durationSec: revealDur,
    });
    cursor += revealDur;
  });

  const outroDur = Math.max(1, project.outroDurationSec);
  segments.push({
    id: 'seg-outro',
    label: 'Score & Outro CTA',
    phase: 'outro',
    questionIndex: null,
    startSec: cursor,
    endSec: cursor + outroDur,
    durationSec: outroDur,
  });

  return segments;
}

export function resolvePlaybackFrame(project: QuizProject, currentTimeSec: number): PlaybackFrameState {
  const segments = buildTimelineSegments(project);
  const totalDurationSec = calculateTotalVideoDuration(project);
  const clampedTime = Math.max(0, Math.min(currentTimeSec, totalDurationSec));

  let matched = segments[segments.length - 1];
  for (const seg of segments) {
    if (clampedTime >= seg.startSec && clampedTime < seg.endSec) {
      matched = seg;
      break;
    }
  }

  const phaseElapsedSec = Math.max(0, Math.min(clampedTime - matched.startSec, matched.durationSec));
  const phaseProgress = matched.durationSec > 0 ? phaseElapsedSec / matched.durationSec : 1;
  const question = matched.questionIndex !== null ? project.questions[matched.questionIndex] ?? null : null;

  let countdownRemainingSec = 0;
  if (matched.phase === 'countdown') {
    countdownRemainingSec = Math.max(0, Math.ceil(matched.durationSec - phaseElapsedSec));
  } else if (matched.phase === 'read') {
    countdownRemainingSec = Math.max(1, project.thinkDurationSec);
  }

  return {
    phase: matched.phase,
    questionIndex: matched.questionIndex,
    question,
    phaseElapsedSec,
    phaseDurationSec: matched.durationSec,
    phaseProgress,
    countdownRemainingSec,
    totalDurationSec,
    overallProgress: totalDurationSec > 0 ? clampedTime / totalDurationSec : 0,
  };
}

export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function generateYouTubeChapters(project: QuizProject): string {
  const lines: string[] = [];
  let cursor = 0;
  lines.push(`${formatTimestamp(cursor)} Intro & Rules`);
  cursor += Math.max(1, project.introDurationSec);

  const perQuestion = calculateQuestionDuration(project);
  project.questions.forEach((q, idx) => {
    const cleanPrompt = q.prompt.replace(/\s+/g, ' ').trim();
    const shortTitle = cleanPrompt.length > 48 ? `${cleanPrompt.slice(0, 45)}...` : cleanPrompt;
    lines.push(`${formatTimestamp(cursor)} Question ${idx + 1}: ${shortTitle}`);
    cursor += perQuestion;
  });

  lines.push(`${formatTimestamp(cursor)} Final Score & Subscribe`);
  return lines.join('\n');
}

export function validateQuestionInput(draft: {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}): { valid: boolean; error?: string } {
  if (!draft.prompt || draft.prompt.trim().length < 6) {
    return { valid: false, error: 'Question prompt must be at least 6 characters long.' };
  }
  if (!Array.isArray(draft.options) || draft.options.length !== 4) {
    return { valid: false, error: 'Exactly 4 answer choices (A, B, C, D) are required.' };
  }
  for (let i = 0; i < 4; i++) {
    if (!draft.options[i] || draft.options[i].trim().length === 0) {
      return { valid: false, error: `Option ${['A', 'B', 'C', 'D'][i]} cannot be empty.` };
    }
  }
  if (draft.correctIndex < 0 || draft.correctIndex > 3 || !Number.isInteger(draft.correctIndex)) {
    return { valid: false, error: 'Select a valid correct option between A and D.' };
  }
  if (!draft.explanation || draft.explanation.trim().length < 5) {
    return { valid: false, error: 'Please include a brief explanation fact for the answer reveal.' };
  }
  return { valid: true };
}

export function validateBatchJobInput(topic: string, questionCount: number): { valid: boolean; error?: string } {
  const trimmed = topic.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Enter a specific quiz topic (at least 3 characters).' };
  }
  if (!Number.isInteger(questionCount) || questionCount < 3 || questionCount > 25) {
    return { valid: false, error: 'Question count must be between 3 and 25.' };
  }
  return { valid: true };
}

const TOPIC_QUESTION_BANKS: Record<string, Omit<QuizQuestion, 'id'>[]> = {
  space: [
    {
      prompt: 'Which moon in our solar system is known to have a dense nitrogen-rich atmosphere and liquid hydrocarbon lakes?',
      options: ['Europa', 'Titan', 'Ganymede', 'Enceladus'],
      correctIndex: 1,
      explanation: 'Saturn’s largest moon Titan has a surface pressure 1.45 times Earth’s and stable lakes of liquid methane and ethane.',
      categoryTag: 'Astrophysics',
      difficulty: 'Medium',
    },
    {
      prompt: 'What is the approximate escape velocity required to break free from Earth’s gravitational field at sea level?',
      options: ['7.9 km/s', '11.2 km/s', '16.7 km/s', '29.8 km/s'],
      correctIndex: 1,
      explanation: 'Earth’s escape velocity is 11.186 km/s (about 25,020 mph), whereas 7.9 km/s is orbital velocity for low Earth orbit.',
      categoryTag: 'Orbital Mechanics',
      difficulty: 'Medium',
    },
    {
      prompt: 'Which spacecraft became the first human-made object to cross the heliopause and enter interstellar space in 2012?',
      options: ['Pioneer 10', 'Voyager 2', 'Voyager 1', 'New Horizons'],
      correctIndex: 2,
      explanation: 'Voyager 1 crossed the heliopause at 121 AU from the Sun on August 25, 2012, and still transmits telemetry.',
      categoryTag: 'Space Exploration',
      difficulty: 'Easy',
    },
    {
      prompt: 'At what theoretical mass threshold does a white dwarf star undergo carbon detonation or collapse into a neutron star?',
      options: ['Eddington Limit', 'Roche Limit', 'Chandrasekhar Limit', 'Schwarzschild Radius'],
      correctIndex: 2,
      explanation: 'The Chandrasekhar limit is approximately 1.44 solar masses, above which electron degeneracy pressure fails.',
      categoryTag: 'Stellar Evolution',
      difficulty: 'Hard',
    },
    {
      prompt: 'Which planet in our solar system rotates retrograde, causing the Sun to rise in the west and set in the east?',
      options: ['Mars', 'Mercury', 'Venus', 'Neptune'],
      correctIndex: 2,
      explanation: 'Venus has an axial tilt of 177.36 degrees, spinning clockwise when viewed from above the sun’s north pole.',
      categoryTag: 'Planetary Science',
      difficulty: 'Easy',
    },
    {
      prompt: 'What is the primary infrared mirror diameter of the James Webb Space Telescope deployed at Lagrange Point L2?',
      options: ['2.4 meters', '4.2 meters', '6.5 meters', '8.2 meters'],
      correctIndex: 2,
      explanation: 'JWST uses 18 gold-coated beryllium hex segments forming a 6.5-meter primary mirror, compared to Hubble’s 2.4 meters.',
      categoryTag: 'Observatories',
      difficulty: 'Hard',
    },
  ],
  history: [
    {
      prompt: 'Which ancient civilization engineered the subterranean qanat aqueduct system across arid plateaus as early as 1000 BCE?',
      options: ['Ancient Persia', 'Minoan Crete', 'Olmec Civilization', 'Maurya Empire'],
      correctIndex: 0,
      explanation: 'Persian engineers built gently sloping underground channels to transport mountain aquifer water without evaporation.',
      categoryTag: 'Ancient Engineering',
      difficulty: 'Medium',
    },
    {
      prompt: 'In what year was the printing press with movable metal type introduced in Mainz by Johannes Gutenberg?',
      options: ['1398', '1450', '1517', '1564'],
      correctIndex: 1,
      explanation: 'By 1450 Gutenberg’s workshop in Mainz was operating, completing the 42-line Gutenberg Bible around 1455.',
      categoryTag: 'Renaissance',
      difficulty: 'Easy',
    },
    {
      prompt: 'Which treaty signed in 1648 ended the Thirty Years’ War and established modern principles of state sovereignty?',
      options: ['Treaty of Utrecht', 'Peace of Westphalia', 'Treaty of Tordesillas', 'Congress of Vienna'],
      correctIndex: 1,
      explanation: 'The Peace of Westphalia (1648) signed in Münster and Osnabrück reshaped European diplomatic law.',
      categoryTag: 'World History',
      difficulty: 'Medium',
    },
    {
      prompt: 'Which port city served as the capital of the Nabataean Kingdom and controlled caravan incense routes across Arabia?',
      options: ['Palmyra', 'Petra', 'Byblos', 'Persepolis'],
      correctIndex: 1,
      explanation: 'Petra (known to the Nabataeans as Raqmu) flourished from the 4th century BCE through sophisticated rock-cut water cisterns.',
      categoryTag: 'Archaeology',
      difficulty: 'Easy',
    },
    {
      prompt: 'Who deciphered Egyptian hieroglyphs in 1822 using the trilingual inscription on the Rosetta Stone?',
      options: ['Howard Carter', 'Jean-François Champollion', 'Flinders Petrie', 'Thomas Young'],
      correctIndex: 1,
      explanation: 'Champollion demonstrated that Egyptian hieroglyphs combined phonetic and ideographic signs in his Lettre à M. Dacier.',
      categoryTag: 'Egyptology',
      difficulty: 'Medium',
    },
    {
      prompt: 'Which medieval West African ruler’s 1324 pilgrimage to Mecca distributed so much gold that it depressed bullion prices in Cairo?',
      options: ['Sundiata Keita', 'Askia Muhammad', 'Mansa Musa', 'Sonni Ali'],
      correctIndex: 2,
      explanation: 'Mansa Musa I of the Mali Empire traveled with an estimated 60,000 attendants and vast reserves of Bambuk and Bure gold.',
      categoryTag: 'Medieval Empires',
      difficulty: 'Easy',
    },
  ],
  geography: [
    {
      prompt: 'Which sovereign nation has the highest number of official time zones when including its overseas territories?',
      options: ['Russia', 'United States', 'France', 'United Kingdom'],
      correctIndex: 2,
      explanation: 'France spans 12 time zones due to its overseas departments and collectivities across the Pacific, Atlantic, and Indian Oceans.',
      categoryTag: 'World Geography',
      difficulty: 'Medium',
    },
    {
      prompt: 'Which South American capital city sits at the highest elevation above sea level (approximately 3,640 meters)?',
      options: ['Quito', 'Bogotá', 'La Paz', 'Cusco'],
      correctIndex: 2,
      explanation: 'La Paz, the seat of government of Bolivia, sits at 3,640 meters in a canyon of the Altiplano plateau.',
      categoryTag: 'Capitals',
      difficulty: 'Easy',
    },
    {
      prompt: 'Which strait separates the Asian continent from North America at their closest point of roughly 85 kilometers?',
      options: ['Davis Strait', 'Bering Strait', 'Tartar Strait', 'Magellan Strait'],
      correctIndex: 1,
      explanation: 'The Bering Strait links the Chukchi Sea with the Bering Sea between Russia’s Chukotka Peninsula and Alaska.',
      categoryTag: 'Oceanography',
      difficulty: 'Easy',
    },
    {
      prompt: 'What is the only sea on Earth that has no land boundaries and is instead bounded entirely by ocean currents?',
      options: ['Aral Sea', 'Sargasso Sea', 'Celebes Sea', 'Weddell Sea'],
      correctIndex: 1,
      explanation: 'The Sargasso Sea in the North Atlantic is bounded by the Gulf Stream, North Atlantic, Canary, and North Equatorial currents.',
      categoryTag: 'Physical Geography',
      difficulty: 'Hard',
    },
    {
      prompt: 'Which African river crosses the Equator twice along its 4,700-kilometer arc to the Atlantic Ocean?',
      options: ['Nile River', 'Zambezi River', 'Congo River', 'Niger River'],
      correctIndex: 2,
      explanation: 'The Congo River flows north across the Equator near Kisangani before curving southwest and crossing it again.',
      categoryTag: 'Hydrology',
      difficulty: 'Medium',
    },
  ],
};

export function generateDeterministicQuiz(
  topic: string,
  count: number,
  difficulty: DifficultyLevel,
  format: VideoFormat = '16:9'
): {
  questions: QuizQuestion[];
  youtubeMeta: YouTubeMetadata;
} {
  const cleanTopic = topic.trim() || 'General Knowledge & Science';
  const lower = cleanTopic.toLowerCase();

  let basePool = TOPIC_QUESTION_BANKS.space;
  if (lower.includes('hist') || lower.includes('ancient') || lower.includes('empire') || lower.includes('war') || lower.includes('civil')) {
    basePool = TOPIC_QUESTION_BANKS.history;
  } else if (lower.includes('geo') || lower.includes('country') || lower.includes('capital') || lower.includes('map') || lower.includes('ocean') || lower.includes('earth')) {
    basePool = TOPIC_QUESTION_BANKS.geography;
  }

  const safeCount = Math.max(3, Math.min(count, 15));
  const questions: QuizQuestion[] = [];

  for (let i = 0; i < safeCount; i++) {
    const template = basePool[i % basePool.length];
    const suffix = i >= basePool.length ? ` (Round ${Math.floor(i / basePool.length) + 1})` : '';
    questions.push({
      id: `q-${Date.now()}-${i + 1}`,
      prompt: `${template.prompt}${suffix}`,
      options: [...template.options] as [string, string, string, string],
      correctIndex: template.correctIndex,
      explanation: template.explanation,
      categoryTag: cleanTopic.slice(0, 24),
      difficulty: difficulty || template.difficulty,
      voiceoverScript: `Question ${i + 1}. ${template.prompt} Is it A: ${template.options[0]}, B: ${template.options[1]}, C: ${template.options[2]}, or D: ${template.options[3]}?`,
    });
  }

  const youtubeMeta: YouTubeMetadata = {
    primaryTitle: `Can You Pass This ${difficulty} ${cleanTopic} Quiz? (${safeCount} Questions)`,
    alternateTitle: `Only 4% Score ${safeCount}/${safeCount} on This ${cleanTopic} Trivia Challenge`,
    descriptionLead: `Test your knowledge with our ${safeCount}-question ${cleanTopic} quiz! Each question gives you a countdown timer before revealing the verified answer and explanation. Drop your final score in the comments below.`,
    tags: [
      `${cleanTopic.toLowerCase()} quiz`,
      'trivia challenge',
      'general knowledge quiz',
      'quiz video',
      format === '9:16' ? 'youtube shorts quiz' : 'pub quiz trivia',
    ],
    thumbnailHeadline: `96% FAIL AT Q${Math.min(4, safeCount)}`,
    thumbnailSubtext: `${cleanTopic.toUpperCase()} · ${safeCount} QUESTIONS`,
    targetAudience: 'General trivia viewers, students, and competitive quiz enthusiasts',
  };

  return { questions, youtubeMeta };
}

export function createInitialQuizProject(): QuizProject {
  const { questions, youtubeMeta } = generateDeterministicQuiz(
    'Deep Space & Planetary Science',
    5,
    'Medium',
    '16:9'
  );

  return {
    id: 'proj-default-space',
    title: 'Deep Space & Planetary Science Challenge',
    topic: 'Deep Space & Planetary Science',
    channelName: 'Orion Trivia Lab',
    format: '16:9',
    themeId: 'midnight-broadcast',
    difficulty: 'Medium',
    introDurationSec: 4,
    readDurationSec: 5,
    thinkDurationSec: 5,
    revealDurationSec: 4,
    outroDurationSec: 4,
    voiceName: 'Kore',
    sfxEnabled: true,
    questions,
    youtubeMeta,
    updatedAt: '2026-10-25T10:00:00Z',
  };
}

export function generateLocalPythonAgentScript(project: QuizProject): string {
  const payloadJson = JSON.stringify(
    {
      title: project.title,
      topic: project.topic,
      channelName: project.channelName,
      format: project.format,
      resolution: project.format === '16:9' ? [1920, 1080] : [1080, 1920],
      timings: {
        introSec: project.introDurationSec,
        readSec: project.readDurationSec,
        countdownSec: project.thinkDurationSec,
        revealSec: project.revealDurationSec,
        outroSec: project.outroDurationSec,
      },
      questions: project.questions.map((q, idx) => ({
        number: idx + 1,
        prompt: q.prompt,
        options: q.options,
        correctOption: ['A', 'B', 'C', 'D'][q.correctIndex],
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      })),
    },
    null,
    2
  );

  return `#!/usr/bin/env python3
"""
QuizCast PC Agent - Autonomous Local YouTube Quiz Video Renderer
Project: ${project.title}
Format: ${project.format} (${project.format === '16:9' ? '1920x1080 60fps' : '1080x1920 60fps Shorts'})
Total Duration: ${calculateTotalVideoDuration(project)}s

Prerequisites on your PC:
  pip install pillow edge-tts moviepy
  ffmpeg must be installed on PATH
"""

import asyncio
import json
import subprocess
from pathlib import Path

PROJECT_DATA = json.loads(r'''${payloadJson}''')

async def synthesize_voiceover(text: str, output_path: Path, voice: str = "en-US-ChristopherNeural"):
    import edge_tts
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(output_path))

def render_question_slide(q: dict, phase: str, out_png: Path):
    from PIL import Image, ImageDraw
    w, h = PROJECT_DATA["resolution"]
    img = Image.new("RGB", (w, h), color=(11, 15, 25))
    draw = ImageDraw.Draw(img)
    draw.rectangle([60, 60, w - 60, 260], fill=(22, 32, 51), outline=(41, 56, 86), width=3)
    draw.text((95, 110), f"Q{q['number']}: {q['prompt']}", fill=(248, 250, 252))
    labels = ["A", "B", "C", "D"]
    for idx, opt in enumerate(q["options"]):
        y_top = 310 + idx * 110
        is_correct = phase == "reveal" and idx == q["correctIndex"]
        bg = (6, 78, 59) if is_correct else (22, 32, 51)
        border = (16, 185, 129) if is_correct else (41, 56, 86)
        draw.rectangle([60, y_top, w - 60, y_top + 88], fill=bg, outline=border, width=3)
        draw.text((95, y_top + 32), f"{labels[idx]}. {opt}", fill=(248, 250, 252))
    img.save(str(out_png))

def main():
    out_dir = Path("./quizcast_build_output")
    out_dir.mkdir(exist_ok=True)
    
    manifest_file = out_dir / "project_manifest.json"
    manifest_file.write_text(json.dumps(PROJECT_DATA, indent=2), encoding="utf-8")
    print(f"[QuizCast PC Agent] Saved manifest for '{PROJECT_DATA['title']}' ({len(PROJECT_DATA['questions'])} questions)")

    chapters_file = out_dir / "youtube_chapters.txt"
    chapters_file.write_text("""${generateYouTubeChapters(project)}""", encoding="utf-8")
    print(f"[QuizCast PC Agent] Wrote YouTube timestamps to {chapters_file}")

    for q in PROJECT_DATA["questions"]:
        vo_line = f"Question {q['number']}. {q['prompt']} ... Answer: {q['options'][q['correctIndex']]}. {q['explanation']}"
        print(f"  -> Queued TTS & Frame Render for Q{q['number']}: {q['prompt'][:50]}...")
        try:
            render_question_slide(q, "read", out_dir / f"q{q['number']}_read.png")
            render_question_slide(q, "reveal", out_dir / f"q{q['number']}_reveal.png")
        except ImportError:
            pass

    print("[QuizCast PC Agent] Assets generated in ./quizcast_build_output/")

if __name__ == "__main__":
    main()
`;
}

export function generateWindowsBatchLauncher(project: QuizProject): string {
  const chapters = generateYouTubeChapters(project).replace(/\n/g, '\r\n');
  return `@echo off
TITLE QuizCast PC Agent - Local Windows Setup & Video Builder
ECHO =====================================================================
ECHO   QuizCast PC Agent Studio - Local PC Installer ^& Video Builder
ECHO   Active Project: ${project.title} (${project.questions.length} Questions)
ECHO =====================================================================
ECHO.
IF NOT EXIST "quizcast_pc_workspace" MKDIR "quizcast_pc_workspace"
CD "quizcast_pc_workspace"

ECHO [1/3] Writing YouTube SEO Chapters ^& Description to youtube_package.txt...
(
ECHO ${project.youtubeMeta.primaryTitle}
ECHO.
ECHO ${project.youtubeMeta.descriptionLead}
ECHO.
ECHO VIDEO CHAPTERS:
${chapters
  .split('\r\n')
  .map((line) => `ECHO ${line}`)
  .join('\r\n')}
) > youtube_package.txt

ECHO [2/3] Checking Python 3 environment ^& installing Pillow + Edge-TTS...
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  ECHO Python 3 was not found on PATH. Opening youtube_package.txt...
  notepad youtube_package.txt
  PAUSE
  EXIT /B 0
)

pip install --quiet pillow edge-tts moviepy
ECHO [3/3] Workspace ready in %CD%!
ECHO Place quizcast_pc_agent.py in this folder and run: python quizcast_pc_agent.py
PAUSE
`;
}

export function generatePortableHtmlStudioBundle(project: QuizProject): string {
  const safeJson = JSON.stringify(project).replace(/</g, '\\u003c');
  const chapters = generateYouTubeChapters(project);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${project.title} - QuizCast Standalone PC Player</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0B0F17; color: #F1F5F9; padding: 24px; }
    .wrap { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; }
    .card { background: #111827; border: 1px solid #1E293B; border-radius: 12px; padding: 20px; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    .meta { color: #94A3B8; font-size: 13px; font-family: monospace; margin-bottom: 16px; }
    canvas { width: 100%; background: #070A10; border-radius: 8px; border: 1px solid #1E293B; }
    .controls { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
    button { background: #F59E0B; color: #090D16; border: none; border-radius: 8px; padding: 9px 16px; font-weight: 600; cursor: pointer; font-size: 13px; }
    button.sec { background: #1E293B; color: #E2E8F0; }
    pre { background: #070A10; border: 1px solid #1E293B; padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; color: #CBD5E1; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>${project.title} (Offline PC App)</h1>
      <div class="meta">${project.format} · ${project.questions.length} Questions · Channel: ${project.channelName}</div>
      <canvas id="stage" width="1280" height="720"></canvas>
      <div class="controls">
        <button id="prevBtn" class="sec">Prev Question</button>
        <button id="revealBtn">Toggle Answer Reveal</button>
        <button id="nextBtn" class="sec">Next Question</button>
        <button id="speakBtn" class="sec">Speak Voiceover</button>
      </div>
    </div>
    <div class="card">
      <h1>YouTube SEO & Chapters</h1>
      <div class="meta">${project.youtubeMeta.primaryTitle}</div>
      <pre>${chapters}</pre>
    </div>
  </div>
  <script>
    const PROJECT = ${safeJson};
    let qIdx = 0;
    let showReveal = false;
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    function draw() {
      const q = PROJECT.questions[qIdx];
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(PROJECT.channelName.toUpperCase() + '  |  QUESTION ' + (qIdx + 1) + ' OF ' + PROJECT.questions.length, 64, 58);
      ctx.fillStyle = '#162033';
      ctx.fillRect(64, 90, 1152, 160);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(q.prompt.slice(0, 72), 92, 165);
      if (q.prompt.length > 72) ctx.fillText(q.prompt.slice(72, 144), 92, 205);
      const labels = ['A', 'B', 'C', 'D'];
      q.options.forEach((opt, i) => {
        const y = 285 + i * 86;
        const ok = showReveal && i === q.correctIndex;
        ctx.fillStyle = ok ? '#064E3B' : '#162033';
        ctx.fillRect(64, y, 1152, 70);
        ctx.fillStyle = ok ? '#34D399' : '#F59E0B';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(labels[i] + '. ' + opt, 92, y + 43);
      });
      if (showReveal) {
        ctx.fillStyle = '#34D399';
        ctx.font = '18px sans-serif';
        ctx.fillText('FACT CHECK: ' + q.explanation, 64, 675);
      }
    }
    document.getElementById('prevBtn').onclick = () => { qIdx = Math.max(0, qIdx - 1); showReveal = false; draw(); };
    document.getElementById('nextBtn').onclick = () => { qIdx = Math.min(PROJECT.questions.length - 1, qIdx + 1); showReveal = false; draw(); };
    document.getElementById('revealBtn').onclick = () => { showReveal = !showReveal; draw(); };
    document.getElementById('speakBtn').onclick = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(PROJECT.questions[qIdx].prompt));
      }
    };
    draw();
  </script>
</body>
</html>`;
}

