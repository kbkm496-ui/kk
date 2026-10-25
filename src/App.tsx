/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Wand2,
  Download,
  CheckCircle2,
  Monitor,
  AlertCircle,
} from 'lucide-react';
import {
  createInitialQuizProject,
  calculateTotalVideoDuration,
  resolvePlaybackFrame,
  formatTimestamp,
  generateDeterministicQuiz,
  validateBatchJobInput,
  estimateBatchJobTotalSeconds,
  calculateBatchJobProgressState,
  generateLocalPythonAgentScript,
  generateWindowsBatchLauncher,
  generatePortableHtmlStudioBundle,
  type QuizProject,
  type QuizQuestion,
  type VideoFormat,
  type DifficultyLevel,
  type AgentBatchJob,
} from './utils/quizEngine';
import { broadcastAudio } from './utils/audioSfx';
import { VideoCanvasPlayer, renderQuizFrameToCanvas } from './components/VideoCanvasPlayer';
import { QuestionEditorPanel } from './components/QuestionEditorPanel';
import { AgentQueueView, triggerBrowserDownload } from './components/AgentQueueView';
import { YouTubePackageView } from './components/YouTubePackageView';
import { ThemeAndTimingPanel } from './components/ThemeAndTimingPanel';

type ActiveTab = 'studio' | 'queue' | 'youtube' | 'theme';

const INITIAL_JOBS: AgentBatchJob[] = [
  {
    id: 'job-101',
    topic: 'Deep Space & Planetary Science',
    format: '16:9',
    difficulty: 'Medium',
    questionCount: 5,
    status: 'Completed',
    durationLabel: '01:18',
    createdAt: '2026-10-25 09:42',
    progressPercent: 100,
    etaSeconds: 0,
  },
  {
    id: 'job-102',
    topic: 'Ancient Civilizations & Lost Cities',
    format: '16:9',
    difficulty: 'Medium',
    questionCount: 6,
    status: 'Processing',
    durationLabel: '01:32',
    createdAt: '2026-10-25 09:55',
    progressPercent: 45,
    etaSeconds: 11,
    currentStepLabel: '2/4 · Synthesizing 4-option distractors & explanations',
  },
  {
    id: 'job-103',
    topic: 'World Capitals & Ocean Geography',
    format: '9:16',
    difficulty: 'Easy',
    questionCount: 5,
    status: 'Queued',
    durationLabel: '01:18',
    createdAt: '2026-10-25 10:01',
    progressPercent: 0,
    etaSeconds: 16,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [project, setProject] = useState<QuizProject>(() => createInitialQuizProject());
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);

  // Agent Generator Bar State
  const [agentTopic, setAgentTopic] = useState('Ancient Civilizations & Lost Cities');
  const [agentCount, setAgentCount] = useState(5);
  const [agentDifficulty, setAgentDifficulty] = useState<DifficultyLevel>('Medium');
  const [agentFormat, setAgentFormat] = useState<VideoFormat>('16:9');
  const [agentError, setAgentError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineStepLabel, setPipelineStepLabel] = useState<string | null>(null);

  // Playback & Recording State
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(5.0); // Start on Q1 Read frame for immediate visual clarity
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [synthesizingIndex, setSynthesizingIndex] = useState<number | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Batch Queue State
  const [jobs, setJobs] = useState<AgentBatchJob[]>(INITIAL_JOBS);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPhaseRef = useRef<string>('');
  const lastCountdownSecRef = useRef<number>(-1);

  const totalDurationSec = calculateTotalVideoDuration(project);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      setCurrentTimeSec((prev) => {
        const next = prev + dt;
        if (next >= totalDurationSec) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, totalDurationSec]);

  // Trigger broadcast SFX & synced inspector selection during playback
  useEffect(() => {
    const frame = resolvePlaybackFrame(project, currentTimeSec);
    if (frame.questionIndex !== null && frame.questionIndex !== selectedQuestionIndex && isPlaying) {
      setSelectedQuestionIndex(frame.questionIndex);
    }

    if (!isPlaying || !project.sfxEnabled) return;

    const phaseKey = `${frame.questionIndex ?? 'none'}-${frame.phase}`;
    if (phaseKey !== lastPhaseRef.current) {
      lastPhaseRef.current = phaseKey;
      if (frame.phase === 'reveal') {
        broadcastAudio.playRevealChime();
      } else if (frame.phase === 'read' && frame.question) {
        broadcastAudio.speakText(frame.question.prompt);
      }
    }

    if (frame.phase === 'countdown') {
      if (
        frame.countdownRemainingSec !== lastCountdownSecRef.current &&
        frame.countdownRemainingSec > 0
      ) {
        lastCountdownSecRef.current = frame.countdownRemainingSec;
        broadcastAudio.playCountdownTick(frame.countdownRemainingSec <= 2);
      }
    }
  }, [currentTimeSec, isPlaying, project, selectedQuestionIndex]);

  const handleRunAgentPipeline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const validation = validateBatchJobInput(agentTopic, agentCount);
    if (!validation.valid) {
      setAgentError(validation.error || 'Please enter a valid quiz topic.');
      return;
    }

    setAgentError(null);
    setIsGenerating(true);
    setIsPlaying(false);
    setPipelineStepLabel('Step 1/4 · Researching topic & verifying trivia facts...');

    try {
      const stepTimer1 = setTimeout(
        () => setPipelineStepLabel('Step 2/4 · Generating distractors & reveal explanations...'),
        350
      );
      const stepTimer2 = setTimeout(
        () => setPipelineStepLabel('Step 3/4 · Synchronizing countdown timers & YouTube chapters...'),
        700
      );

      const response = await fetch('/api/agent/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: agentTopic.trim(),
          count: agentCount,
          difficulty: agentDifficulty,
          format: agentFormat,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setPipelineStepLabel('Step 4/4 · Rendering broadcast canvas frames...');

      const data = await response.json();
      const questions: QuizQuestion[] = data.questions;
      const youtubeMeta = data.youtubeMeta;

      const updatedProject: QuizProject = {
        ...project,
        id: `proj-${Date.now()}`,
        title: `${agentTopic.trim()} Trivia Challenge`,
        topic: agentTopic.trim(),
        format: agentFormat,
        difficulty: agentDifficulty,
        questions,
        youtubeMeta,
        updatedAt: new Date().toISOString(),
      };

      setProject(updatedProject);
      setSelectedQuestionIndex(0);
      setCurrentTimeSec(updatedProject.introDurationSec + 0.5);

      const newDurationSec = calculateTotalVideoDuration(updatedProject);
      setJobs((prev) => [
        {
          id: `job-${Date.now()}`,
          topic: agentTopic.trim(),
          format: agentFormat,
          difficulty: agentDifficulty,
          questionCount: questions.length,
          status: 'Completed',
          durationLabel: formatTimestamp(newDurationSec),
          createdAt: 'Just now',
          projectSnapshot: updatedProject,
        },
        ...prev,
      ]);

      setStatusBanner(
        `Agent compiled "${updatedProject.title}" (${questions.length} questions · ${formatTimestamp(newDurationSec)} runtime).`
      );
    } catch {
      const fallback = generateDeterministicQuiz(
        agentTopic.trim(),
        agentCount,
        agentDifficulty,
        agentFormat
      );
      const updatedProject: QuizProject = {
        ...project,
        title: `${agentTopic.trim()} Trivia Challenge`,
        topic: agentTopic.trim(),
        format: agentFormat,
        difficulty: agentDifficulty,
        questions: fallback.questions,
        youtubeMeta: fallback.youtubeMeta,
        updatedAt: new Date().toISOString(),
      };
      setProject(updatedProject);
      setSelectedQuestionIndex(0);
      setCurrentTimeSec(updatedProject.introDurationSec + 0.5);
    } finally {
      setIsGenerating(false);
      setPipelineStepLabel(null);
    }
  };

  const handleSynthesizeVoiceover = async (idx: number) => {
    const q = project.questions[idx];
    if (!q) return;
    setSynthesizingIndex(idx);
    try {
      const script =
        q.voiceoverScript ||
        `Question ${idx + 1}. ${q.prompt} Option A: ${q.options[0]}, B: ${q.options[1]}, C: ${q.options[2]}, D: ${q.options[3]}.`;
      const res = await fetch('/api/agent/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script,
          voiceName: project.voiceName,
        }),
      });
      const data = await res.json();
      if (data.audioDataUrl) {
        const audio = new Audio(data.audioDataUrl);
        audio.play().catch(() => {});
        setStatusBanner(`Playing Gemini TTS (${project.voiceName}) voiceover for Question ${idx + 1}.`);
      } else {
        broadcastAudio.speakText(script);
        setStatusBanner(`Playing local studio voice synthesis for Question ${idx + 1}.`);
      }
    } catch {
      broadcastAudio.speakText(q.prompt);
    } finally {
      setSynthesizingIndex(null);
    }
  };

  const handleStartWebmExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    setIsPlaying(false);
    setIsRecording(true);
    setRecordingProgress(5);

    try {
      const stream = typeof canvas.captureStream === 'function' ? canvas.captureStream(30) : null;
      const chunks: BlobPart[] = [];
      let recorder: MediaRecorder | null = null;

      if (stream && typeof MediaRecorder !== 'undefined') {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.start(100);
      }

      const ctx = canvas.getContext('2d');
      const w = project.format === '9:16' ? 720 : 1280;
      const h = project.format === '9:16' ? 1280 : 720;

      // Render a fast 18-step sample walkthrough across Q1 Read -> Countdown -> Reveal
      const sampleStart = project.introDurationSec;
      const sampleSpan = Math.min(totalDurationSec - sampleStart, 14);
      const totalSteps = 18;

      for (let step = 0; step <= totalSteps; step++) {
        const simSec = sampleStart + (step / totalSteps) * sampleSpan;
        setCurrentTimeSec(simSec);
        if (ctx) {
          const frame = resolvePlaybackFrame(project, simSec);
          renderQuizFrameToCanvas(ctx, w, h, project, frame);
        }
        setRecordingProgress(Math.round(((step + 1) / (totalSteps + 1)) * 100));
        await new Promise((r) => setTimeout(r, 60));
      }

      if (recorder && recorder.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          if (!recorder) return resolve();
          recorder.onstop = () => resolve();
          recorder.stop();
        });
      }

      const blob =
        chunks.length > 0
          ? new Blob(chunks, { type: 'video/webm' })
          : new Blob([JSON.stringify(project, null, 2)], { type: 'video/webm' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusBanner(`Exported broadcast video clip (${project.format}) to your downloads.`);
    } finally {
      setIsRecording(false);
      setRecordingProgress(0);
    }
  };

  // Tick any active Processing batch jobs so progress bar & ETA countdown update smoothly
  useEffect(() => {
    const hasProcessing = jobs.some((j) => j.status === 'Processing');
    if (!hasProcessing) return;

    const timer = setInterval(() => {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.status !== 'Processing') return j;
          const currentPct = j.progressPercent ?? 15;
          if (currentPct >= 95) {
            const generated = generateDeterministicQuiz(
              j.topic,
              j.questionCount,
              j.difficulty,
              j.format
            );
            const builtProject: QuizProject = {
              ...project,
              id: `proj-${j.id}`,
              title: `${j.topic} Challenge`,
              topic: j.topic,
              format: j.format,
              difficulty: j.difficulty,
              questions: generated.questions,
              youtubeMeta: generated.youtubeMeta,
              updatedAt: new Date().toISOString(),
            };
            return {
              ...j,
              status: 'Completed',
              progressPercent: 100,
              etaSeconds: 0,
              currentStepLabel: 'Completed',
              durationLabel: formatTimestamp(calculateTotalVideoDuration(builtProject)),
              projectSnapshot: builtProject,
            };
          }
          const nextRatio = Math.min(0.96, (currentPct + 8) / 100);
          const nextState = calculateBatchJobProgressState(j.questionCount, j.format, nextRatio);
          return {
            ...j,
            progressPercent: nextState.progressPercent,
            etaSeconds: nextState.etaSeconds,
            currentStepLabel: nextState.currentStepLabel,
          };
        })
      );
    }, 900);

    return () => clearInterval(timer);
  }, [jobs, project]);

  const handleAddBatchJob = (
    topic: string,
    count: number,
    difficulty: DifficultyLevel,
    format: VideoFormat
  ) => {
    const estVideoSec = 4 + count * 14 + 4;
    const estProcessSec = estimateBatchJobTotalSeconds(count, format);
    const newJob: AgentBatchJob = {
      id: `job-${Date.now()}`,
      topic,
      format,
      difficulty,
      questionCount: count,
      status: 'Queued',
      durationLabel: formatTimestamp(estVideoSec),
      createdAt: 'Just now',
      progressPercent: 0,
      etaSeconds: estProcessSec,
    };
    setJobs((prev) => [newJob, ...prev]);
    setStatusBanner(`Added "${topic}" (${count} questions · ~${estProcessSec}s est.) to PC Agent Queue.`);
  };

  const handleRunQueuedJob = async (jobId: string) => {
    const target = jobs.find((j) => j.id === jobId);
    if (!target || target.status === 'Processing') return;
    setRunningJobId(jobId);

    const initialState = calculateBatchJobProgressState(target.questionCount, target.format, 0.18);
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: 'Processing',
              progressPercent: initialState.progressPercent,
              etaSeconds: initialState.etaSeconds,
              currentStepLabel: initialState.currentStepLabel,
            }
          : j
      )
    );

    try {
      const res = await fetch('/api/agent/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: target.topic,
          count: target.questionCount,
          difficulty: target.difficulty,
          format: target.format,
        }),
      });
      const data = await res.json();
      const builtProject: QuizProject = {
        ...project,
        id: `proj-${jobId}`,
        title: `${target.topic} Challenge`,
        topic: target.topic,
        format: target.format,
        difficulty: target.difficulty,
        questions: data.questions,
        youtubeMeta: data.youtubeMeta,
        updatedAt: new Date().toISOString(),
      };

      const midState = calculateBatchJobProgressState(target.questionCount, target.format, 0.65);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: 'Processing',
                progressPercent: midState.progressPercent,
                etaSeconds: midState.etaSeconds,
                currentStepLabel: midState.currentStepLabel,
              }
            : j
        )
      );

      await new Promise((r) => setTimeout(r, 650));

      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: 'Completed',
                progressPercent: 100,
                etaSeconds: 0,
                currentStepLabel: 'Completed',
                durationLabel: formatTimestamp(calculateTotalVideoDuration(builtProject)),
                projectSnapshot: builtProject,
              }
            : j
        )
      );
      setProject(builtProject);
      setStatusBanner(`Completed batch job "${target.topic}" and updated Studio project.`);
    } finally {
      setRunningJobId(null);
    }
  };

  const handleRunAllQueuedJobs = () => {
    setJobs((prev) =>
      prev.map((j, idx) => {
        if (j.status !== 'Queued') return j;
        const startRatio = Math.max(0.1, 0.28 - idx * 0.08);
        const st = calculateBatchJobProgressState(j.questionCount, j.format, startRatio);
        return {
          ...j,
          status: 'Processing',
          progressPercent: st.progressPercent,
          etaSeconds: st.etaSeconds,
          currentStepLabel: st.currentStepLabel,
        };
      })
    );
    setStatusBanner('Started backend batch processing for all queued jobs.');
  };

  const handleLoadJobProject = (job: AgentBatchJob) => {
    if (job.projectSnapshot) {
      setProject(job.projectSnapshot);
    } else {
      const generated = generateDeterministicQuiz(
        job.topic,
        job.questionCount,
        job.difficulty,
        job.format
      );
      setProject({
        ...project,
        title: `${job.topic} Challenge`,
        topic: job.topic,
        format: job.format,
        difficulty: job.difficulty,
        questions: generated.questions,
        youtubeMeta: generated.youtubeMeta,
      });
    }
    setActiveTab('studio');
    setSelectedQuestionIndex(0);
    setCurrentTimeSec(project.introDurationSec + 0.5);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F1F5F9] flex flex-col">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/90 bg-[#0B0F17]">
        {/* Zone 1: Single text element brand wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('studio');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 font-display"
        >
          QuizCast Studio
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav aria-label="Main Workspace Navigation" className="flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'studio'
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            Studio Canvas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'queue'
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            PC Agent Queue ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('youtube')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'youtube'
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            YouTube SEO & Chapters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'theme'
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 hover:text-slate-100 border-transparent'
            }`}
          >
            Theme & Pacing
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            disabled={isRecording}
            onClick={handleStartWebmExport}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isRecording ? `Exporting (${recordingProgress}%)...` : 'Export Video (.webm)'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 flex flex-col gap-6">
        {/* PC Agent Prompt & Pipeline Control Bar */}
        <section
          aria-label="PC Agent Quiz Video Generator"
          className="bg-[#111827] border border-slate-800 rounded-xl p-5"
        >
          <form onSubmit={handleRunAgentPipeline} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-lg font-semibold text-slate-100">
                  01. Autonomous YouTube Quiz Video Agent
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter any trivia topic to generate verified multiple-choice questions, countdown timers, voiceover scripts, and YouTube chapters.
                </p>
              </div>

              {/* Topic Quick-Fill Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 mr-1">Presets:</span>
                {[
                  { label: 'Space & Astronomy', topic: 'Deep Space & Planetary Science', fmt: '16:9' as VideoFormat },
                  { label: 'Ancient History', topic: 'Ancient Civilizations & Lost Cities', fmt: '16:9' as VideoFormat },
                  { label: 'Geography Shorts', topic: 'World Capitals & Ocean Geography', fmt: '9:16' as VideoFormat },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setAgentTopic(preset.topic);
                      setAgentFormat(preset.fmt);
                      setAgentError(null);
                    }}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {agentError && (
              <div
                role="alert"
                className="flex items-center gap-2 text-xs text-red-300 bg-red-950/50 border border-red-800/70 rounded-lg px-3 py-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{agentError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label htmlFor="agent-topic-input" className="block text-xs font-medium text-slate-300 mb-1">
                  Quiz Topic or Niche Prompt
                </label>
                <input
                  id="agent-topic-input"
                  type="text"
                  value={agentTopic}
                  onChange={(e) => setAgentTopic(e.target.value)}
                  placeholder="e.g., Ancient Civilizations & Lost Cities"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="agent-format-select" className="block text-xs font-medium text-slate-300 mb-1">
                  Video Format
                </label>
                <select
                  id="agent-format-select"
                  value={agentFormat}
                  onChange={(e) => {
                    const fmt = e.target.value as VideoFormat;
                    setAgentFormat(fmt);
                    setProject((prev) => ({ ...prev, format: fmt }));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="16:9">16:9 Long-Form</option>
                  <option value="9:16">9:16 YT Shorts</option>
                </select>
              </div>

              <div className="md:col-span-1">
                <label htmlFor="agent-count-input" className="block text-xs font-medium text-slate-300 mb-1">
                  Count
                </label>
                <input
                  id="agent-count-input"
                  type="number"
                  min={3}
                  max={15}
                  value={agentCount}
                  onChange={(e) => setAgentCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="agent-difficulty-select" className="block text-xs font-medium text-slate-300 mb-1">
                  Difficulty
                </label>
                <select
                  id="agent-difficulty-select"
                  value={agentDifficulty}
                  onChange={(e) => setAgentDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>{isGenerating ? 'Building...' : 'Generate Quiz Video'}</span>
                </button>
              </div>
            </div>

            {pipelineStepLabel && (
              <div className="text-xs font-mono text-amber-400 pt-1">
                {pipelineStepLabel}
              </div>
            )}

            {statusBanner && !pipelineStepLabel && (
              <div className="flex items-center justify-between gap-2 text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{statusBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusBanner(null)}
                  className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Direct Download to This PC Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Monitor className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-medium text-slate-300">Download to This PC:</span>
                <span>Save standalone offline player or local Python/Windows video builder directly to your computer.</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const html = generatePortableHtmlStudioBundle(project);
                    triggerBrowserDownload('QuizCast_Standalone_PC_App.html', html, 'text/html;charset=utf-8');
                    setStatusBanner('Downloaded QuizCast_Standalone_PC_App.html to this PC.');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download to This PC (.html App)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const bat = generateWindowsBatchLauncher(project);
                    triggerBrowserDownload('Run_QuizCast_PC_Agent.bat', bat, 'application/x-bat;charset=utf-8');
                    setStatusBanner('Downloaded Run_QuizCast_PC_Agent.bat Windows installer to this PC.');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Windows Setup (.bat)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const py = generateLocalPythonAgentScript(project);
                    triggerBrowserDownload('quizcast_pc_agent.py', py, 'text/x-python;charset=utf-8');
                    setStatusBanner('Downloaded quizcast_pc_agent.py local renderer to this PC.');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Python FFmpeg Agent (.py)</span>
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Active View Content */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6">
              <VideoCanvasPlayer
                project={project}
                currentTimeSec={currentTimeSec}
                isPlaying={isPlaying}
                isRecording={isRecording}
                recordingProgress={recordingProgress}
                onTimeChange={(sec) => {
                  setIsPlaying(false);
                  setCurrentTimeSec(sec);
                }}
                onTogglePlay={() => {
                  broadcastAudio.stopSpeech();
                  setIsPlaying((prev) => !prev);
                }}
                onToggleSfx={() =>
                  setProject((prev) => ({ ...prev, sfxEnabled: !prev.sfxEnabled }))
                }
                onStartWebmExport={handleStartWebmExport}
                onSelectQuestionIndex={(idx) => setSelectedQuestionIndex(idx)}
                canvasRef={canvasRef}
              />
            </div>

            <div className="lg:col-span-6">
              <QuestionEditorPanel
                project={project}
                selectedQuestionIndex={selectedQuestionIndex}
                onSelectQuestion={(idx) => {
                  setSelectedQuestionIndex(idx);
                  const perQ =
                    project.readDurationSec +
                    project.thinkDurationSec +
                    project.revealDurationSec;
                  setCurrentTimeSec(project.introDurationSec + idx * perQ + 0.2);
                }}
                onUpdateQuestion={(idx, updated) => {
                  setProject((prev) => {
                    const nextQs = [...prev.questions];
                    nextQs[idx] = updated;
                    return { ...prev, questions: nextQs };
                  });
                }}
                onAddQuestion={(newQ) => {
                  setProject((prev) => {
                    const nextQs = [...prev.questions, newQ];
                    return { ...prev, questions: nextQs };
                  });
                  setSelectedQuestionIndex(project.questions.length);
                  setStatusBanner(`Added Question #${project.questions.length + 1} to timeline.`);
                }}
                onDeleteQuestion={(idx) => {
                  if (project.questions.length <= 1) return;
                  setProject((prev) => {
                    const nextQs = prev.questions.filter((_, i) => i !== idx);
                    return { ...prev, questions: nextQs };
                  });
                  setSelectedQuestionIndex((prev) => Math.max(0, Math.min(prev, project.questions.length - 2)));
                }}
                onSynthesizeVoiceover={handleSynthesizeVoiceover}
                synthesizingIndex={synthesizingIndex}
              />
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <AgentQueueView
            project={project}
            jobs={jobs}
            onAddBatchJob={handleAddBatchJob}
            onRunQueuedJob={handleRunQueuedJob}
            onRunAllQueuedJobs={handleRunAllQueuedJobs}
            onLoadJobProject={handleLoadJobProject}
            onNotifyDownload={(msg) => setStatusBanner(msg)}
          />
        )}

        {activeTab === 'youtube' && (
          <YouTubePackageView
            project={project}
            onUpdateYouTubeMeta={(updates) =>
              setProject((prev) => ({
                ...prev,
                youtubeMeta: { ...prev.youtubeMeta, ...updates },
              }))
            }
          />
        )}

        {activeTab === 'theme' && (
          <ThemeAndTimingPanel
            project={project}
            onUpdateProject={(updates) =>
              setProject((prev) => ({ ...prev, ...updates }))
            }
          />
        )}
      </main>

      {/* Quiet Editorial Footer (No telemetry tickers or fake compiler badges) */}
      <footer className="border-t border-slate-800/80 px-6 py-4 mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            QuizCast PC Agent Studio · Autonomous YouTube Trivia & Shorts Production Suite
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Download Local Python Agent (.py)
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('youtube')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              YouTube Chapters & Thumbnail Export
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
