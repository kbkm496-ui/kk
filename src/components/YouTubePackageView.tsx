import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import {
  generateYouTubeChapters,
  VISUAL_THEMES,
  type QuizProject,
} from '../utils/quizEngine';

interface YouTubePackageViewProps {
  project: QuizProject;
  onUpdateYouTubeMeta: (
    updates: Partial<QuizProject['youtubeMeta']>
  ) => void;
}

export const YouTubePackageView: React.FC<YouTubePackageViewProps> = ({
  project,
  onUpdateYouTubeMeta,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const thumbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chaptersText = generateYouTubeChapters(project);

  const fullDescriptionText = `${project.youtubeMeta.descriptionLead}\n\n⏱️ VIDEO CHAPTERS:\n${chaptersText}\n\n#${project.youtubeMeta.tags
    .map((t) => t.replace(/\s+/g, ''))
    .join(' #')}`;

  const copyText = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Render high-contrast YouTube Thumbnail on Canvas
  useEffect(() => {
    const canvas = thumbCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1280;
    const height = 720;
    const theme = VISUAL_THEMES[project.themeId] || VISUAL_THEMES['midnight-broadcast'];

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, theme.bgStart);
    grad.addColorStop(1, theme.bgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle geometric accent rays
    ctx.strokeStyle = `${theme.accentColor}26`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(width * 0.78, height * 0.5);
      ctx.lineTo(width * 0.78 + Math.cos((i * Math.PI) / 6) * 600, height * 0.5 + Math.sin((i * Math.PI) / 6) * 600);
      ctx.stroke();
    }

    // Left High-CTR Headline Block
    ctx.fillStyle = theme.accentColor;
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(project.youtubeMeta.thumbnailSubtext.toUpperCase(), 72, 170);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 84px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(project.youtubeMeta.thumbnailHeadline.toUpperCase(), 72, 290);

    // Sample Question Teaser Card on Thumbnail
    const sampleQ = project.questions[0];
    ctx.fillStyle = theme.cardBg;
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(72, 350, 1136, 280, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = theme.textPrimary;
    ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
    const qText = sampleQ ? sampleQ.prompt : project.title;
    const clippedQ = qText.length > 58 ? `${qText.slice(0, 56)}?` : qText;
    ctx.fillText(clippedQ, 112, 435);

    const sampleOpts = sampleQ ? sampleQ.options.slice(0, 3) : ['Option A', 'Option B', 'Option C'];
    sampleOpts.forEach((opt, idx) => {
      const bx = 112 + idx * 355;
      const by = 490;
      ctx.fillStyle = idx === 1 ? theme.correctBg : 'rgba(255,255,255,0.07)';
      ctx.strokeStyle = idx === 1 ? theme.correctBorder : theme.cardBorder;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bx, by, 330, 92, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 26px "Public Sans", sans-serif';
      ctx.fillText(`${['A', 'B', 'C'][idx]}. ${opt.slice(0, 16)}`, bx + 24, by + 56);
    });
  }, [project]);

  const handleDownloadThumbnail = () => {
    const canvas = thumbCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_thumbnail.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 6 Columns: SEO Titles, Chapters & Description */}
      <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
        <div className="border-b border-slate-800 pb-3.5">
          <h2 className="text-lg font-semibold text-slate-100">
            01. YouTube Publishing Metadata & Chapters
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Auto-synchronized timestamps calculated from your intro ({project.introDurationSec}s) and {project.questions.length} question segments.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="yt-primary-title" className="text-xs font-medium text-slate-300">
                Primary High-CTR Video Title
              </label>
              <button
                type="button"
                onClick={() => copyText('title', project.youtubeMeta.primaryTitle)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'title' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'title' ? 'Copied' : 'Copy Title'}</span>
              </button>
            </div>
            <input
              id="yt-primary-title"
              type="text"
              value={project.youtubeMeta.primaryTitle}
              onChange={(e) => onUpdateYouTubeMeta({ primaryTitle: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="yt-desc-box" className="text-xs font-medium text-slate-300">
                Complete YouTube Description + Auto-Calculated Chapters
              </label>
              <button
                type="button"
                onClick={() => copyText('desc', fullDescriptionText)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'desc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'desc' ? 'Copied Description' : 'Copy All'}</span>
              </button>
            </div>
            <textarea
              id="yt-desc-box"
              rows={10}
              readOnly
              value={fullDescriptionText}
              className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-3 text-xs font-mono tabular-nums text-slate-300 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Right 6 Columns: Interactive Thumbnail Composer */}
      <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3.5">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              02. High-CTR Thumbnail Composer (1280×720)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Customize the hook headline and export a ready-to-upload 16:9 PNG thumbnail.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadThumbnail}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="thumb-headline" className="block text-xs font-medium text-slate-300 mb-1">
              Thumbnail Hook Headline
            </label>
            <input
              id="thumb-headline"
              type="text"
              value={project.youtubeMeta.thumbnailHeadline}
              onChange={(e) => onUpdateYouTubeMeta({ thumbnailHeadline: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label htmlFor="thumb-subtext" className="block text-xs font-medium text-slate-300 mb-1">
              Top Kicker Label
            </label>
            <input
              id="thumb-subtext"
              type="text"
              value={project.youtubeMeta.thumbnailSubtext}
              onChange={(e) => onUpdateYouTubeMeta({ thumbnailSubtext: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="bg-[#070A10] border border-slate-800 rounded-lg p-3">
          <canvas
            ref={thumbCanvasRef}
            width={1280}
            height={720}
            data-testid="youtube-thumbnail-canvas"
            className="w-full aspect-video rounded border border-slate-800 object-contain"
          />
        </div>
      </div>
    </div>
  );
};
