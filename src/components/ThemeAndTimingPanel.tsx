import React from 'react';
import {
  VISUAL_THEMES,
  calculateQuestionDuration,
  calculateTotalVideoDuration,
  formatTimestamp,
  type QuizProject,
  type VisualThemeId,
  type VideoFormat,
} from '../utils/quizEngine';

interface ThemeAndTimingPanelProps {
  project: QuizProject;
  onUpdateProject: (updates: Partial<QuizProject>) => void;
}

export const ThemeAndTimingPanel: React.FC<ThemeAndTimingPanelProps> = ({
  project,
  onUpdateProject,
}) => {
  const perQuestionSec = calculateQuestionDuration(project);
  const totalSec = calculateTotalVideoDuration(project);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 6 Columns: Visual Broadcast Themes & Aspect Ratio */}
      <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
        <div className="border-b border-slate-800 pb-3.5">
          <h2 className="text-lg font-semibold text-slate-100">
            01. Broadcast Visual Theme & Aspect Ratio
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Switch between 16:9 Long-Form and 9:16 YouTube Shorts layouts and select a curated studio palette.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="channel-name-input" className="block text-xs font-medium text-slate-300 mb-1">
              Channel Watermark Name
            </label>
            <input
              id="channel-name-input"
              type="text"
              value={project.channelName}
              onChange={(e) => onUpdateProject({ channelName: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Video Aspect Ratio
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              {(['16:9', '9:16'] as VideoFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onUpdateProject({ format: fmt })}
                  className={`flex-1 py-1.5 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    project.format === fmt
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fmt === '16:9' ? '16:9 Long-Form' : '9:16 YouTube Shorts'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(VISUAL_THEMES) as VisualThemeId[]).map((tId) => {
            const theme = VISUAL_THEMES[tId];
            const isSelected = project.themeId === tId;
            return (
              <button
                key={tId}
                type="button"
                onClick={() => onUpdateProject({ themeId: tId })}
                className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-amber-500'
                    : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-100">
                    {theme.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-white/20"
                      style={{ backgroundColor: theme.bgStart }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-white/20"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400">{theme.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right 6 Columns: Pacing, Countdown Timer & Voiceover Config */}
      <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
        <div className="border-b border-slate-800 pb-3.5">
          <h2 className="text-lg font-semibold text-slate-100">
            02. Countdown Pacing & Voiceover Persona
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Each question runs for {perQuestionSec}s · Total video length {formatTimestamp(totalSec)} across {project.questions.length} questions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="read-sec-input" className="block text-xs font-medium text-slate-300 mb-1">
              Question Read (sec)
            </label>
            <input
              id="read-sec-input"
              type="number"
              min={2}
              max={15}
              value={project.readDurationSec}
              onChange={(e) =>
                onUpdateProject({ readDurationSec: Math.max(2, Number(e.target.value)) })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label htmlFor="think-sec-input" className="block text-xs font-medium text-slate-300 mb-1">
              Countdown Timer (sec)
            </label>
            <input
              id="think-sec-input"
              type="number"
              min={3}
              max={15}
              value={project.thinkDurationSec}
              onChange={(e) =>
                onUpdateProject({ thinkDurationSec: Math.max(3, Number(e.target.value)) })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label htmlFor="reveal-sec-input" className="block text-xs font-medium text-slate-300 mb-1">
              Answer Reveal (sec)
            </label>
            <input
              id="reveal-sec-input"
              type="number"
              min={2}
              max={12}
              value={project.revealDurationSec}
              onChange={(e) =>
                onUpdateProject({ revealDurationSec: Math.max(2, Number(e.target.value)) })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="voice-persona-select" className="block text-xs font-medium text-slate-300 mb-1">
              Gemini TTS Voice Persona
            </label>
            <select
              id="voice-persona-select"
              value={project.voiceName}
              onChange={(e) =>
                onUpdateProject({
                  voiceName: e.target.value as QuizProject['voiceName'],
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="Kore">Kore (Clear Broadcast Host)</option>
              <option value="Puck">Puck (Energetic Shorts Narrator)</option>
              <option value="Charon">Charon (Deep Documentary Baritone)</option>
              <option value="Fenrir">Fenrir (Fast-Paced Quizmaster)</option>
              <option value="Zephyr">Zephyr (Warm Academic Guide)</option>
            </select>
          </div>

          <div>
            <label htmlFor="intro-sec-input" className="block text-xs font-medium text-slate-300 mb-1">
              Intro & Outro Hook (sec each)
            </label>
            <input
              id="intro-sec-input"
              type="number"
              min={2}
              max={10}
              value={project.introDurationSec}
              onChange={(e) => {
                const val = Math.max(2, Number(e.target.value));
                onUpdateProject({ introDurationSec: val, outroDurationSec: val });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
