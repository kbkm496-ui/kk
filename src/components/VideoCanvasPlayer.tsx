import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Video,
  RotateCcw,
} from 'lucide-react';
import {
  VISUAL_THEMES,
  resolvePlaybackFrame,
  formatTimestamp,
  calculateTotalVideoDuration,
  buildTimelineSegments,
  type QuizProject,
  type PlaybackFrameState,
} from '../utils/quizEngine';

interface VideoCanvasPlayerProps {
  project: QuizProject;
  currentTimeSec: number;
  isPlaying: boolean;
  isRecording: boolean;
  recordingProgress: number;
  onTimeChange: (sec: number) => void;
  onTogglePlay: () => void;
  onToggleSfx: () => void;
  onStartWebmExport: () => void;
  onSelectQuestionIndex: (index: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function renderQuizFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: QuizProject,
  frame: PlaybackFrameState
) {
  const theme = VISUAL_THEMES[project.themeId] || VISUAL_THEMES['midnight-broadcast'];
  const isShorts = project.format === '9:16';

  // 1. Studio gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.bgStart);
  bgGrad.addColorStop(1, theme.bgEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural studio grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  const gridStep = isShorts ? 48 : 64;
  for (let gx = 0; gx < width; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  // Radial ambient key light
  const radial = ctx.createRadialGradient(
    width * 0.5,
    height * 0.2,
    20,
    width * 0.5,
    height * 0.3,
    width * 0.65
  );
  radial.addColorStop(0, `${theme.accentColor}22`);
  radial.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  const padX = isShorts ? 44 : 64;
  const padY = isShorts ? 56 : 44;

  // 2. Top broadcast status bar
  ctx.fillStyle = theme.textMuted;
  ctx.font = `600 ${isShorts ? 18 : 16}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(project.channelName.toUpperCase(), padX, padY);

  ctx.textAlign = 'right';
  const progressLabel =
    frame.questionIndex !== null
      ? `QUESTION ${String(frame.questionIndex + 1).padStart(2, '0')} / ${String(project.questions.length).padStart(2, '0')}`
      : frame.phase === 'intro'
      ? 'OPENING HOOK'
      : 'FINAL SCOREBOARD';
  ctx.fillStyle = theme.accentColor;
  ctx.fillText(progressLabel, width - padX, padY);

  // Hairline divider
  ctx.strokeStyle = theme.cardBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, padY + 18);
  ctx.lineTo(width - padX, padY + 18);
  ctx.stroke();

  // 3. Phase-specific main stage
  if (frame.phase === 'intro') {
    const centerY = height * 0.45;
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.accentColor;
    ctx.font = `600 ${isShorts ? 22 : 20}px "JetBrains Mono", monospace`;
    ctx.fillText(`${project.difficulty.toUpperCase()} TRIVIA CHALLENGE · ${project.questions.length} QUESTIONS`, width / 2, centerY - 64);

    ctx.fillStyle = theme.textPrimary;
    ctx.font = `700 ${isShorts ? 44 : 46}px "Plus Jakarta Sans", sans-serif`;
    const titleLines = wrapCanvasText(ctx, project.title, width - padX * 2.4);
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, centerY + idx * (isShorts ? 54 : 56));
    });

    const subY = centerY + titleLines.length * 56 + 32;
    ctx.fillStyle = theme.textMuted;
    ctx.font = `500 ${isShorts ? 22 : 20}px "Public Sans", sans-serif`;
    ctx.fillText(
      `You have ${project.thinkDurationSec} seconds per question. Keep track of your score!`,
      width / 2,
      subY
    );
  } else if (frame.phase === 'outro') {
    const centerY = height * 0.44;
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.accentColor;
    ctx.font = `600 ${isShorts ? 22 : 20}px "JetBrains Mono", monospace`;
    ctx.fillText('CHALLENGE COMPLETE', width / 2, centerY - 56);

    ctx.fillStyle = theme.textPrimary;
    ctx.font = `700 ${isShorts ? 42 : 44}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText('How Many Did You Get Right?', width / 2, centerY);

    ctx.fillStyle = theme.textMuted;
    ctx.font = `500 ${isShorts ? 22 : 21}px "Public Sans", sans-serif`;
    ctx.fillText(
      `Comment your score out of ${project.questions.length} & Subscribe to ${project.channelName}`,
      width / 2,
      centerY + 52
    );
  } else if (frame.question) {
    const q = frame.question;
    const topContentY = padY + (isShorts ? 56 : 42);

    // Timer bar & numeric readout
    const timerBoxW = isShorts ? width - padX * 2 : width - padX * 2;
    const timerRatio =
      frame.phase === 'countdown'
        ? Math.max(0, 1 - frame.phaseProgress)
        : frame.phase === 'read'
        ? 1
        : 0;

    // Background track
    drawRoundedRect(ctx, padX, topContentY, timerBoxW, 10, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fill();

    // Active timer bar
    if (timerRatio > 0) {
      drawRoundedRect(ctx, padX, topContentY, Math.max(12, timerBoxW * timerRatio), 10, 5);
      ctx.fillStyle = frame.phase === 'countdown' && frame.countdownRemainingSec <= 2 ? '#EF4444' : theme.accentColor;
      ctx.fill();
    }

    // Status label + seconds
    ctx.textAlign = 'left';
    ctx.font = `600 ${isShorts ? 18 : 15}px "JetBrains Mono", monospace`;
    ctx.fillStyle = theme.textMuted;
    const phaseBanner =
      frame.phase === 'read'
        ? 'LISTEN TO THE QUESTION'
        : frame.phase === 'countdown'
        ? `LOCK IN YOUR ANSWER · 00:0${frame.countdownRemainingSec}`
        : 'VERIFIED ANSWER REVEAL';
    ctx.fillText(phaseBanner, padX, topContentY + 34);

    // Question prompt box
    const promptY = topContentY + (isShorts ? 54 : 50);
    const promptH = isShorts ? 210 : 164;
    drawRoundedRect(ctx, padX, promptY, width - padX * 2, promptH, 16);
    ctx.fillStyle = theme.cardBg;
    ctx.fill();
    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = theme.textPrimary;
    ctx.font = `700 ${isShorts ? 27 : 29}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'left';
    const promptLines = wrapCanvasText(ctx, q.prompt, width - padX * 2 - 56);
    const startPromptTextY = promptY + (promptH - promptLines.length * 38) / 2 + 28;
    promptLines.slice(0, 4).forEach((line, idx) => {
      ctx.fillText(line, padX + 28, startPromptTextY + idx * 38);
    });

    // 4 Options grid (2x2 on 16:9, 1x4 vertical stack on 9:16 Shorts)
    const optionsStartY = promptY + promptH + (isShorts ? 28 : 26);
    const optionLabels = ['A', 'B', 'C', 'D'];

    if (isShorts) {
      const optH = 88;
      const optGap = 18;
      q.options.forEach((optText, idx) => {
        const oy = optionsStartY + idx * (optH + optGap);
        const isCorrect = idx === q.correctIndex;
        const showCorrect = frame.phase === 'reveal' && isCorrect;
        const dimWrong = frame.phase === 'reveal' && !isCorrect;

        ctx.save();
        if (dimWrong) ctx.globalAlpha = 0.45;

        drawRoundedRect(ctx, padX, oy, width - padX * 2, optH, 14);
        ctx.fillStyle = showCorrect ? theme.correctBg : theme.cardBg;
        ctx.fill();
        ctx.strokeStyle = showCorrect ? theme.correctBorder : theme.cardBorder;
        ctx.lineWidth = showCorrect ? 2.5 : 1.5;
        ctx.stroke();

        // Option Letter Square
        drawRoundedRect(ctx, padX + 18, oy + 18, 52, 52, 10);
        ctx.fillStyle = showCorrect ? theme.correctBorder : 'rgba(255,255,255,0.08)';
        ctx.fill();

        ctx.fillStyle = showCorrect ? '#042F2E' : theme.accentColor;
        ctx.font = '700 22px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(optionLabels[idx], padX + 44, oy + 52);

        // Option Text
        ctx.fillStyle = theme.textPrimary;
        ctx.font = '600 23px "Public Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(optText, padX + 88, oy + 52);

        ctx.restore();
      });
    } else {
      const colGap = 24;
      const rowGap = 20;
      const optW = (width - padX * 2 - colGap) / 2;
      const optH = 86;

      q.options.forEach((optText, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const ox = padX + col * (optW + colGap);
        const oy = optionsStartY + row * (optH + rowGap);

        const isCorrect = idx === q.correctIndex;
        const showCorrect = frame.phase === 'reveal' && isCorrect;
        const dimWrong = frame.phase === 'reveal' && !isCorrect;

        ctx.save();
        if (dimWrong) ctx.globalAlpha = 0.45;

        drawRoundedRect(ctx, ox, oy, optW, optH, 14);
        ctx.fillStyle = showCorrect ? theme.correctBg : theme.cardBg;
        ctx.fill();
        ctx.strokeStyle = showCorrect ? theme.correctBorder : theme.cardBorder;
        ctx.lineWidth = showCorrect ? 2.5 : 1.5;
        ctx.stroke();

        drawRoundedRect(ctx, ox + 16, oy + 18, 50, 50, 10);
        ctx.fillStyle = showCorrect ? theme.correctBorder : 'rgba(255,255,255,0.08)';
        ctx.fill();

        ctx.fillStyle = showCorrect ? '#042F2E' : theme.accentColor;
        ctx.font = '700 20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(optionLabels[idx], ox + 41, oy + 50);

        ctx.fillStyle = theme.textPrimary;
        ctx.font = '600 22px "Public Sans", sans-serif';
        ctx.textAlign = 'left';
        const clipped = optText.length > 34 ? `${optText.slice(0, 32)}...` : optText;
        ctx.fillText(clipped, ox + 82, oy + 50);

        ctx.restore();
      });
    }

    // Explanation reveal footer card (or subtle studio footer prompt when in read/countdown)
    const expY = isShorts ? optionsStartY + 4 * 106 + 16 : optionsStartY + 2 * 106 + 20;
    const expH = isShorts ? 132 : 84;
    if (frame.phase === 'reveal') {
      drawRoundedRect(ctx, padX, expY, width - padX * 2, expH, 12);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
      ctx.fill();
      ctx.strokeStyle = theme.correctBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#34D399';
      ctx.font = '600 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `FACT CHECK · CORRECT: ${optionLabels[q.correctIndex]} (${q.options[q.correctIndex]})`,
        padX + 22,
        expY + 28
      );

      ctx.fillStyle = theme.textPrimary;
      ctx.font = '400 17px "Public Sans", sans-serif';
      const expLines = wrapCanvasText(ctx, q.explanation, width - padX * 2 - 44);
      expLines.slice(0, isShorts ? 3 : 2).forEach((line, idx) => {
        ctx.fillText(line, padX + 22, expY + 54 + idx * 22);
      });
    } else {
      drawRoundedRect(ctx, padX, expY, width - padX * 2, expH, 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fill();
      ctx.strokeStyle = theme.cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = theme.textMuted;
      ctx.font = '500 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `CATEGORY: ${q.categoryTag.toUpperCase()}  ·  DIFFICULTY: ${q.difficulty.toUpperCase()}  ·  COMMENT YOUR PICK BELOW`,
        width / 2,
        expY + expH / 2 + 6
      );
    }
  }
}

export const VideoCanvasPlayer: React.FC<VideoCanvasPlayerProps> = ({
  project,
  currentTimeSec,
  isPlaying,
  isRecording,
  recordingProgress,
  onTimeChange,
  onTogglePlay,
  onToggleSfx,
  onStartWebmExport,
  onSelectQuestionIndex,
  canvasRef,
}) => {
  const totalDurationSec = calculateTotalVideoDuration(project);
  const frame = resolvePlaybackFrame(project, currentTimeSec);
  const segments = buildTimelineSegments(project);
  const isShorts = project.format === '9:16';

  const canvasWidth = isShorts ? 720 : 1280;
  const canvasHeight = isShorts ? 1280 : 720;

  // Draw frame whenever currentTimeSec or project changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderQuizFrameToCanvas(ctx, canvasWidth, canvasHeight, project, frame);
  }, [project, currentTimeSec, canvasWidth, canvasHeight, frame, canvasRef]);

  const jumpToQuestion = (qIdx: number) => {
    const targetSeg = segments.find((s) => s.questionIndex === qIdx && s.phase === 'read');
    if (targetSeg) {
      onTimeChange(targetSeg.startSec + 0.05);
      onSelectQuestionIndex(qIdx);
    }
  };

  const handleStepQuestion = (delta: number) => {
    const currentIdx = frame.questionIndex ?? (frame.phase === 'intro' ? 0 : project.questions.length - 1);
    const nextIdx = Math.max(0, Math.min(project.questions.length - 1, currentIdx + delta));
    jumpToQuestion(nextIdx);
  };

  const jumpToPhase = (phase: 'read' | 'countdown' | 'reveal') => {
    const qIdx = frame.questionIndex ?? 0;
    const targetSeg = segments.find((s) => s.questionIndex === qIdx && s.phase === phase);
    if (targetSeg) {
      onTimeChange(targetSeg.startSec + 0.1);
    }
  };

  return (
    <section
      aria-label="Broadcast Video Preview Canvas"
      className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col gap-4"
    >
      {/* Top Preview Metadata Row (Unboxed clean metadata per Zero-Pill rule) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-200">{project.title}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{project.format === '16:9' ? '1920×1080 HD' : '1080×1920 Shorts'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{project.questions.length} Questions</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">Total {formatTimestamp(totalDurationSec)}</span>
        </div>

        {/* Phase Quick-Inspect Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => jumpToPhase('read')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              frame.phase === 'read'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Read Prompt
          </button>
          <button
            type="button"
            onClick={() => jumpToPhase('countdown')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              frame.phase === 'countdown'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Countdown ({project.thinkDurationSec}s)
          </button>
          <button
            type="button"
            onClick={() => jumpToPhase('reveal')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              frame.phase === 'reveal'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Answer Reveal
          </button>
        </div>
      </div>

      {/* Canvas Viewport Frame */}
      <div
        data-state={isPlaying ? 'playing' : frame.phase}
        className="relative w-full bg-[#070A10] border border-slate-800/90 rounded-lg overflow-hidden flex items-center justify-center py-3 px-4"
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          data-testid="quiz-video-canvas"
          className={
            isShorts
              ? 'h-[380px] w-auto aspect-[9/16] rounded shadow-lg border border-slate-800'
              : 'w-full max-h-[380px] aspect-video rounded shadow-lg border border-slate-800 object-contain'
          }
        />
      </div>

      {/* Transport & Scrubber Bar */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tabular-nums text-amber-400 w-12">
            {formatTimestamp(currentTimeSec)}
          </span>
          <input
            type="range"
            aria-label="Video Timeline Scrubber"
            min={0}
            max={totalDurationSec}
            step={0.1}
            value={currentTimeSec}
            onChange={(e) => onTimeChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <span className="text-xs font-mono tabular-nums text-slate-400 w-12 text-right">
            {formatTimestamp(totalDurationSec)}
          </span>
        </div>

        {/* Question Timeline Markers */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause Video Preview' : 'Play Video Preview'}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Preview' : 'Play Preview'}</span>
            </button>

            <button
              type="button"
              onClick={() => onTimeChange(0)}
              aria-label="Restart Video From Intro"
              className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleStepQuestion(-1)}
              aria-label="Previous Question"
              className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleStepQuestion(1)}
              aria-label="Next Question"
              className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleSfx}
              aria-label={project.sfxEnabled ? 'Mute Broadcast Sound Effects' : 'Enable Broadcast Sound Effects'}
              className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {project.sfxEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              <span>{project.sfxEnabled ? 'SFX & Voice On' : 'Muted'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isRecording}
              onClick={onStartWebmExport}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-100 border border-slate-700 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isRecording
                  ? `Rendering WebM (${recordingProgress}%)...`
                  : 'Render Sample Clip (.webm)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
