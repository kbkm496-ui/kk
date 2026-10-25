import React, { useState } from 'react';
import { Plus, Trash2, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  validateQuestionInput,
  calculateQuestionDuration,
  formatTimestamp,
  type QuizProject,
  type QuizQuestion,
} from '../utils/quizEngine';

interface QuestionEditorPanelProps {
  project: QuizProject;
  selectedQuestionIndex: number;
  onSelectQuestion: (idx: number) => void;
  onUpdateQuestion: (idx: number, updated: QuizQuestion) => void;
  onAddQuestion: (newQ: QuizQuestion) => void;
  onDeleteQuestion: (idx: number) => void;
  onSynthesizeVoiceover: (idx: number) => void;
  synthesizingIndex: number | null;
}

export const QuestionEditorPanel: React.FC<QuestionEditorPanelProps> = ({
  project,
  selectedQuestionIndex,
  onSelectQuestion,
  onUpdateQuestion,
  onAddQuestion,
  onDeleteQuestion,
  onSynthesizeVoiceover,
  synthesizingIndex,
}) => {
  const activeQuestion = project.questions[selectedQuestionIndex] || project.questions[0];
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftOptions, setDraftOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [draftCorrectIndex, setDraftCorrectIndex] = useState(0);
  const [draftExplanation, setDraftExplanation] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const perQSec = calculateQuestionDuration(project);

  const handleCreateQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateQuestionInput({
      prompt: draftPrompt,
      options: draftOptions,
      correctIndex: draftCorrectIndex,
      explanation: draftExplanation,
    });

    if (!check.valid) {
      setValidationError(check.error || 'Invalid question fields.');
      return;
    }

    setValidationError(null);
    const created: QuizQuestion = {
      id: `q-${Date.now()}`,
      prompt: draftPrompt.trim(),
      options: [
        draftOptions[0].trim(),
        draftOptions[1].trim(),
        draftOptions[2].trim(),
        draftOptions[3].trim(),
      ],
      correctIndex: draftCorrectIndex,
      explanation: draftExplanation.trim(),
      categoryTag: project.topic.slice(0, 20),
      difficulty: project.difficulty,
      voiceoverScript: `Question ${project.questions.length + 1}. ${draftPrompt.trim()}`,
    };
    onAddQuestion(created);
    setDraftPrompt('');
    setDraftOptions(['', '', '', '']);
    setDraftExplanation('');
    setIsAddingNew(false);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3.5">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            02. Question Script & Timing Deck
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a question row to inspect its broadcast frame, options, and voiceover script.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setValidationError(null);
            setIsAddingNew(!isAddingNew);
          }}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAddingNew ? 'Cancel New Question' : 'Add Question'}</span>
        </button>
      </div>

      {/* Add New Question Form Drawer */}
      {isAddingNew && (
        <form
          onSubmit={handleCreateQuestionSubmit}
          aria-label="New Quiz Question Form"
          className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 flex flex-col gap-3.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400">
              Append Question #{project.questions.length + 1}
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              +{perQSec}s video runtime
            </span>
          </div>

          {validationError && (
            <div
              role="alert"
              className="flex items-center gap-2 text-xs text-red-300 bg-red-950/50 border border-red-800/70 rounded-lg px-3 py-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div>
            <label htmlFor="new-q-prompt" className="block text-xs font-medium text-slate-300 mb-1">
              Question Prompt
            </label>
            <input
              id="new-q-prompt"
              type="text"
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              placeholder="e.g., Which element has the highest melting point on the periodic table?"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(['A', 'B', 'C', 'D'] as const).map((letter, idx) => (
              <div key={letter}>
                <label
                  htmlFor={`new-q-opt-${letter}`}
                  className="block text-xs font-medium text-slate-400 mb-1"
                >
                  Option {letter}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`new-q-opt-${letter}`}
                    type="text"
                    value={draftOptions[idx]}
                    onChange={(e) => {
                      const next = [...draftOptions] as [string, string, string, string];
                      next[idx] = e.target.value;
                      setDraftOptions(next);
                    }}
                    placeholder={`Choice ${letter}`}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setDraftCorrectIndex(idx)}
                    aria-label={`Mark Option ${letter} as Correct`}
                    className={`px-2.5 py-1.5 rounded text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer ${
                      draftCorrectIndex === idx
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {draftCorrectIndex === idx ? 'Correct' : 'Set Correct'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="new-q-explanation" className="block text-xs font-medium text-slate-300 mb-1">
              Answer Reveal Fact / Explanation
            </label>
            <input
              id="new-q-explanation"
              type="text"
              value={draftExplanation}
              onChange={(e) => setDraftExplanation(e.target.value)}
              placeholder="e.g., Tungsten melts at 3,422°C (6,192°F), higher than any other pure metal."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Save Question to Timeline
            </button>
          </div>
        </form>
      )}

      {/* Question Sequence Selector Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-xs text-slate-400">
              <th className="py-2.5 px-3 font-medium w-14">#</th>
              <th className="py-2.5 px-3 font-medium">Question Prompt</th>
              <th className="py-2.5 px-3 font-medium">Correct Answer</th>
              <th className="py-2.5 px-3 font-medium text-right w-24">Start</th>
              <th className="py-2.5 px-3 font-medium text-right w-20">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {project.questions.map((q, idx) => {
              const startSec = project.introDurationSec + idx * perQSec;
              const isSelected = idx === selectedQuestionIndex;
              const correctLabel = ['A', 'B', 'C', 'D'][q.correctIndex];
              return (
                <tr
                  key={q.id}
                  onClick={() => onSelectQuestion(idx)}
                  className={`transition-colors cursor-pointer ${
                    isSelected ? 'bg-amber-500/10 text-slate-100' : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-amber-400">
                    Q{String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="py-2.5 px-3 font-medium max-w-[280px] truncate">
                    {q.prompt}
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-medium whitespace-nowrap">
                    {correctLabel}: {q.options[q.correctIndex]}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                    {formatTimestamp(startSec)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      disabled={project.questions.length <= 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteQuestion(idx);
                      }}
                      aria-label={`Delete Question ${idx + 1}`}
                      className="p-1.5 text-slate-400 hover:text-red-400 disabled:opacity-30 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Question Live Editor */}
      {activeQuestion && (
        <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                Editing Question {selectedQuestionIndex + 1} of {project.questions.length}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeQuestion.categoryTag}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{perQSec}s segment</span>
            </div>

            <button
              type="button"
              onClick={() => onSynthesizeVoiceover(selectedQuestionIndex)}
              disabled={synthesizingIndex === selectedQuestionIndex}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {synthesizingIndex === selectedQuestionIndex
                  ? 'Synthesizing Voiceover...'
                  : 'Preview AI Voiceover'}
              </span>
            </button>
          </div>

          <div>
            <label htmlFor="active-q-prompt" className="block text-xs font-medium text-slate-400 mb-1">
              Broadcast Question Text
            </label>
            <input
              id="active-q-prompt"
              type="text"
              value={activeQuestion.prompt}
              onChange={(e) =>
                onUpdateQuestion(selectedQuestionIndex, {
                  ...activeQuestion,
                  prompt: e.target.value,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(['A', 'B', 'C', 'D'] as const).map((letter, optIdx) => {
              const isCorrect = activeQuestion.correctIndex === optIdx;
              return (
                <div key={letter} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateQuestion(selectedQuestionIndex, {
                        ...activeQuestion,
                        correctIndex: optIdx,
                      })
                    }
                    aria-label={`Set Option ${letter} as Correct Answer`}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      isCorrect
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {letter}
                  </button>
                  <input
                    type="text"
                    aria-label={`Option ${letter} Text`}
                    value={activeQuestion.options[optIdx]}
                    onChange={(e) => {
                      const nextOpts = [...activeQuestion.options] as [string, string, string, string];
                      nextOpts[optIdx] = e.target.value;
                      onUpdateQuestion(selectedQuestionIndex, {
                        ...activeQuestion,
                        options: nextOpts,
                      });
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label htmlFor="active-q-exp" className="block text-xs font-medium text-slate-400 mb-1">
              Fact-Check Explanation (Shown on Answer Reveal Card)
            </label>
            <input
              id="active-q-exp"
              type="text"
              value={activeQuestion.explanation}
              onChange={(e) =>
                onUpdateQuestion(selectedQuestionIndex, {
                  ...activeQuestion,
                  explanation: e.target.value,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
