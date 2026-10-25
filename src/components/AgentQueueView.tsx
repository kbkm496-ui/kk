import React, { useState } from 'react';
import {
  Play,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Clock,
  Loader2,
  Monitor,
  FileCode,
  FileJson,
} from 'lucide-react';
import {
  validateBatchJobInput,
  generateLocalPythonAgentScript,
  generateWindowsBatchLauncher,
  generatePortableHtmlStudioBundle,
  calculateTotalVideoDuration,
  formatTimestamp,
  estimateBatchJobTotalSeconds,
  formatEtaRemaining,
  generateDeterministicQuiz,
  type QuizProject,
  type AgentBatchJob,
  type BatchJobStatus,
  type VideoFormat,
  type DifficultyLevel,
} from '../utils/quizEngine';

interface AgentQueueViewProps {
  project: QuizProject;
  jobs: AgentBatchJob[];
  onAddBatchJob: (topic: string, count: number, difficulty: DifficultyLevel, format: VideoFormat) => void;
  onRunQueuedJob: (jobId: string) => void;
  onRunAllQueuedJobs: () => void;
  onLoadJobProject: (job: AgentBatchJob) => void;
  onNotifyDownload?: (message: string) => void;
}

export function triggerBrowserDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const AgentQueueView: React.FC<AgentQueueViewProps> = ({
  project,
  jobs,
  onAddBatchJob,
  onRunQueuedJob,
  onRunAllQueuedJobs,
  onLoadJobProject,
  onNotifyDownload,
}) => {
  const [filter, setFilter] = useState<'all' | BatchJobStatus>('all');
  const [topicInput, setTopicInput] = useState('');
  const [questionCount, setQuestionCount] = useState(6);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [format, setFormat] = useState<VideoFormat>('16:9');
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [lastDownloadedFile, setLastDownloadedFile] = useState<string | null>(null);

  const pythonScript = generateLocalPythonAgentScript(project);

  const processingJobs = jobs.filter((j) => j.status === 'Processing');
  const queuedJobs = jobs.filter((j) => j.status === 'Queued');
  const filteredJobs = jobs.filter((j) => (filter === 'all' ? true : j.status === filter));

  const totalActiveEtaSec = processingJobs.reduce(
    (acc, job) => acc + (job.etaSeconds ?? estimateBatchJobTotalSeconds(job.questionCount, job.format)),
    0
  );

  const handleQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateBatchJobInput(topicInput, questionCount);
    if (!validation.valid) {
      setFormError(validation.error || 'Invalid batch job input.');
      return;
    }
    setFormError(null);
    onAddBatchJob(topicInput.trim(), questionCount, difficulty, format);
    setTopicInput('');
  };

  const recordDownload = (label: string) => {
    setLastDownloadedFile(label);
    onNotifyDownload?.(`Downloaded ${label} to this PC.`);
  };

  const handleDownloadPythonAgent = () => {
    triggerBrowserDownload('quizcast_pc_agent.py', pythonScript, 'text/x-python;charset=utf-8');
    recordDownload('quizcast_pc_agent.py');
  };

  const handleDownloadWindowsBat = () => {
    const batContent = generateWindowsBatchLauncher(project);
    triggerBrowserDownload('Run_QuizCast_PC_Agent.bat', batContent, 'application/x-bat;charset=utf-8');
    recordDownload('Run_QuizCast_PC_Agent.bat');
  };

  const handleDownloadStandaloneHtmlApp = () => {
    const htmlContent = generatePortableHtmlStudioBundle(project);
    triggerBrowserDownload('QuizCast_Standalone_PC_App.html', htmlContent, 'text/html;charset=utf-8');
    recordDownload('QuizCast_Standalone_PC_App.html');
  };

  const handleDownloadJsonManifest = () => {
    const jsonContent = JSON.stringify(project, null, 2);
    triggerBrowserDownload('quizcast_project_manifest.json', jsonContent, 'application/json;charset=utf-8');
    recordDownload('quizcast_project_manifest.json');
  };

  const handleDownloadJobToPc = (job: AgentBatchJob) => {
    const jobProj: QuizProject =
      job.projectSnapshot ||
      (() => {
        const gen = generateDeterministicQuiz(job.topic, job.questionCount, job.difficulty, job.format);
        return {
          ...project,
          title: `${job.topic} Challenge`,
          topic: job.topic,
          format: job.format,
          difficulty: job.difficulty,
          questions: gen.questions,
          youtubeMeta: gen.youtubeMeta,
        };
      })();
    const htmlContent = generatePortableHtmlStudioBundle(jobProj);
    const safeSlug = job.topic.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filename = `QuizCast_${safeSlug}_PC.html`;
    triggerBrowserDownload(filename, htmlContent, 'text/html;charset=utf-8');
    recordDownload(filename);
  };

  const handleCopyScript = () => {
    navigator.clipboard?.writeText(pythonScript).catch(() => {});
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Columns: Batch Queue Manager */}
      <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              01. Personal PC Agent Batch Queue
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Queue multiple YouTube quiz topics for automated script generation, voiceover timing, and frame layout.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {queuedJobs.length > 0 && (
              <button
                type="button"
                onClick={onRunAllQueuedJobs}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Process All Queued ({queuedJobs.length})</span>
              </button>
            )}

            {/* Functional Segmented Filter Buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              {(['all', 'Processing', 'Queued', 'Completed'] as const).map((tab) => {
                const count =
                  tab === 'all' ? jobs.length : jobs.filter((j) => j.status === tab).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      filter === tab
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'all' ? `All (${count})` : `${tab} (${count})`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Backend Processing Progress & ETA Banner */}
        {processingJobs.length > 0 && (
          <div
            aria-label="Active Backend Processing Jobs"
            className="bg-[#0B0F17] border border-amber-500/40 rounded-lg p-4 flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>
                  Backend Processing {processingJobs.length}{' '}
                  {processingJobs.length === 1 ? 'Batch Job' : 'Batch Jobs'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Total Queue ETA: {formatEtaRemaining(totalActiveEtaSec)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {processingJobs.map((pJob) => {
                const pct = pJob.progressPercent ?? 15;
                const etaSec =
                  pJob.etaSeconds ??
                  estimateBatchJobTotalSeconds(pJob.questionCount, pJob.format);
                const stepText =
                  pJob.currentStepLabel || '1/4 · Fact-checking topic & researching prompts';
                return (
                  <div
                    key={pJob.id}
                    className="border-t border-slate-800/80 pt-2.5 first:border-t-0 first:pt-0 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-100 truncate">
                        {pJob.topic}
                      </span>
                      <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                        <span className="text-amber-400 font-semibold">{pct}%</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-slate-300">{formatEtaRemaining(etaSec)}</span>
                      </div>
                    </div>

                    <div
                      role="progressbar"
                      aria-label={`Processing progress for ${pJob.topic}`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="w-full h-2 bg-slate-800 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-amber-500 transition-transform duration-200 origin-left"
                        style={{
                          width: '100%',
                          transform: `scaleX(${Math.max(0.04, pct / 100)})`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{stepText}</span>
                      <span className="tabular-nums">
                        {pJob.format} · {pJob.questionCount} Qs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Batch Job Form */}
        <form
          onSubmit={handleQueueSubmit}
          aria-label="Queue New Quiz Video Job"
          className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 flex flex-col gap-3.5"
        >
          <div className="text-xs font-semibold text-slate-200">
            Add New Quiz Video to Agent Queue
          </div>

          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2 text-xs text-red-300 bg-red-950/50 border border-red-800/70 rounded-lg px-3 py-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label htmlFor="batch-topic-input" className="block text-xs text-slate-400 mb-1">
                Quiz Video Topic / Niche
              </label>
              <input
                id="batch-topic-input"
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g., World Capitals & Flags Challenge"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="batch-count-input" className="block text-xs text-slate-400 mb-1">
                Questions
              </label>
              <input
                id="batch-count-input"
                type="number"
                min={3}
                max={25}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="batch-diff-select" className="block text-xs text-slate-400 mb-1">
                Difficulty
              </label>
              <select
                id="batch-diff-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="batch-format-select" className="block text-xs text-slate-400 mb-1">
                Format
              </label>
              <select
                id="batch-format-select"
                value={format}
                onChange={(e) => setFormat(e.target.value as VideoFormat)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="16:9">16:9 HD</option>
                <option value="9:16">9:16 Shorts</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              Est. Backend Processing Time: ~{estimateBatchJobTotalSeconds(questionCount || 6, format)}s
            </span>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Job to PC Queue</span>
            </button>
          </div>
        </form>

        {/* Jobs Table with Visual Progress Indicator & Estimated Time Remaining */}
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs text-slate-400">
                <th className="py-2.5 px-3 font-medium min-w-[200px]">Topic & Spec</th>
                <th className="py-2.5 px-3 font-medium min-w-[210px]">Progress & Est. Time</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Runtime</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {filteredJobs.map((job) => {
                const isProcessing = job.status === 'Processing';
                const isCompleted = job.status === 'Completed';
                const pct = isCompleted ? 100 : isProcessing ? (job.progressPercent ?? 20) : 0;
                const estTotalSec = estimateBatchJobTotalSeconds(job.questionCount, job.format);
                const etaLabel = isCompleted
                  ? '00s remaining · Complete'
                  : isProcessing
                  ? formatEtaRemaining(job.etaSeconds ?? estTotalSec)
                  : `~${estTotalSec}s est. runtime`;

                return (
                  <tr key={job.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-100">{job.topic}</div>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                        {job.format} · {job.questionCount} Qs · {job.difficulty}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2 font-mono tabular-nums text-[11px]">
                          <span
                            className={
                              isCompleted
                                ? 'text-emerald-400 font-semibold'
                                : isProcessing
                                ? 'text-amber-400 font-semibold'
                                : 'text-slate-400'
                            }
                          >
                            {pct}%
                          </span>
                          <span className="text-slate-300">{etaLabel}</span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label={`Job progress for ${job.topic}`}
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"
                        >
                          <div
                            className={`h-full transition-transform duration-200 origin-left ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : isProcessing
                                ? 'bg-amber-500'
                                : 'bg-slate-700'
                            }`}
                            style={{
                              width: '100%',
                              transform: `scaleX(${pct / 100})`,
                            }}
                          />
                        </div>
                        {isProcessing && job.currentStepLabel && (
                          <div className="text-[11px] text-slate-400 truncate font-mono">
                            {job.currentStepLabel}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                      {job.durationLabel}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={
                          isCompleted
                            ? 'text-emerald-400 font-medium'
                            : isProcessing
                            ? 'text-amber-400 font-semibold'
                            : 'text-slate-300 font-medium'
                        }
                      >
                        {job.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {job.status === 'Queued' && (
                        <button
                          type="button"
                          onClick={() => onRunQueuedJob(job.id)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-md text-xs inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Run Agent</span>
                        </button>
                      )}
                      {job.status === 'Processing' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono tabular-nums text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Processing</span>
                        </span>
                      )}
                      {job.status === 'Completed' && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadJobToPc(job)}
                            aria-label={`Download ${job.topic} to This PC`}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-md text-xs inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Save to PC</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onLoadJobProject(job)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Studio</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right 5 Columns: Download to This PC — Local Desktop & FFmpeg Suite */}
      <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
        <div className="border-b border-slate-800 pb-3.5">
          <h2 className="text-lg font-semibold text-slate-100">
            02. Download to This PC (Desktop Suite)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Save the standalone offline PC app, Windows 1-click installer, or Python/FFmpeg renderer for "{project.title}" ({project.questions.length} Qs · {formatTimestamp(calculateTotalVideoDuration(project))}) directly to your computer.
          </p>
        </div>

        {lastDownloadedFile && (
          <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Saved <strong>{lastDownloadedFile}</strong> to your PC Downloads folder.</span>
          </div>
        )}

        {/* 2x2 PC Download Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleDownloadStandaloneHtmlApp}
            className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-left flex flex-col gap-1 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="whitespace-nowrap">Download Offline PC App</span>
              <Monitor className="w-3.5 h-3.5 shrink-0" />
            </div>
            <span className="text-[11px] text-slate-900 font-mono">
              QuizCast_Standalone_PC_App.html
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWindowsBat}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-lg text-left flex flex-col gap-1 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
              <span className="whitespace-nowrap">Windows 1-Click Installer</span>
              <Download className="w-3.5 h-3.5 shrink-0" />
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Run_QuizCast_PC_Agent.bat
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPythonAgent}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-lg text-left flex flex-col gap-1 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="whitespace-nowrap">Python + FFmpeg Script</span>
              <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              quizcast_pc_agent.py
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJsonManifest}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-lg text-left flex flex-col gap-1 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="whitespace-nowrap">Project JSON Manifest</span>
              <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              quizcast_project_manifest.json
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>quizcast_pc_agent.py</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyScript}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedScript ? 'Copied Python Script' : 'Copy Code'}
            </button>
          </div>
        </div>

        <pre className="bg-[#070A10] border border-slate-800 rounded-lg p-3.5 text-xs font-mono text-slate-300 overflow-x-auto max-h-[300px] leading-relaxed">
          <code>{pythonScript}</code>
        </pre>
      </div>
    </div>
  );
};
