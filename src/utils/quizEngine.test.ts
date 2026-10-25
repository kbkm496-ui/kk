import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateQuestionDuration,
  calculateTotalVideoDuration,
  buildTimelineSegments,
  resolvePlaybackFrame,
  formatTimestamp,
  generateYouTubeChapters,
  validateQuestionInput,
  validateBatchJobInput,
  createInitialQuizProject,
  generateDeterministicQuiz,
  estimateBatchJobTotalSeconds,
  formatEtaRemaining,
  calculateBatchJobProgressState,
  generateLocalPythonAgentScript,
  generateWindowsBatchLauncher,
  generatePortableHtmlStudioBundle,
} from './quizEngine';

test('calculateQuestionDuration and calculateTotalVideoDuration compute exact seconds', () => {
  const project = createInitialQuizProject();
  // intro=4, read=5, think=5, reveal=4 (14s per question * 5 = 70s), outro=4 => total 78s
  assert.equal(calculateQuestionDuration(project), 14);
  assert.equal(calculateTotalVideoDuration(project), 78);
});

test('buildTimelineSegments constructs contiguous non-overlapping timeline segments', () => {
  const project = createInitialQuizProject();
  const segments = buildTimelineSegments(project);
  // 1 intro + 5 * 3 question phases + 1 outro = 17 segments
  assert.equal(segments.length, 17);
  assert.equal(segments[0].phase, 'intro');
  assert.equal(segments[0].startSec, 0);
  assert.equal(segments[0].endSec, 4);

  for (let i = 1; i < segments.length; i++) {
    assert.equal(segments[i].startSec, segments[i - 1].endSec);
  }
  assert.equal(segments[segments.length - 1].endSec, calculateTotalVideoDuration(project));
});

test('resolvePlaybackFrame accurately resolves intro, question read, countdown, reveal, and outro', () => {
  const project = createInitialQuizProject();

  const introFrame = resolvePlaybackFrame(project, 2);
  assert.equal(introFrame.phase, 'intro');
  assert.equal(introFrame.questionIndex, null);

  // Q1 starts at 4s: read [4..9), countdown [9..14), reveal [14..18)
  const readFrame = resolvePlaybackFrame(project, 5.5);
  assert.equal(readFrame.phase, 'read');
  assert.equal(readFrame.questionIndex, 0);

  const countdownFrame = resolvePlaybackFrame(project, 11.2);
  assert.equal(countdownFrame.phase, 'countdown');
  assert.equal(countdownFrame.questionIndex, 0);
  assert.equal(countdownFrame.countdownRemainingSec, 3); // 5 - 2.2 = 2.8 -> ceil = 3

  const revealFrame = resolvePlaybackFrame(project, 15.0);
  assert.equal(revealFrame.phase, 'reveal');
  assert.equal(revealFrame.questionIndex, 0);

  const outroFrame = resolvePlaybackFrame(project, 76.0);
  assert.equal(outroFrame.phase, 'outro');
  assert.equal(outroFrame.questionIndex, null);
});

test('formatTimestamp and generateYouTubeChapters output YouTube-valid 00:00 chapters', () => {
  assert.equal(formatTimestamp(0), '00:00');
  assert.equal(formatTimestamp(65), '01:05');

  const project = createInitialQuizProject();
  const chapters = generateYouTubeChapters(project);
  const lines = chapters.split('\n');
  assert.equal(lines.length, project.questions.length + 2);
  assert.equal(lines[0].startsWith('00:00 '), true);
  assert.equal(lines[1].startsWith('00:04 Question 1:'), true);
});

test('validateQuestionInput and validateBatchJobInput reject invalid inputs and accept valid ones', () => {
  const badQuestion = validateQuestionInput({
    prompt: 'Short',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'Valid explanation text',
  });
  assert.equal(badQuestion.valid, false);

  const emptyOption = validateQuestionInput({
    prompt: 'Which planet has the largest volcano in the Solar System?',
    options: ['Mars', '', 'Venus', 'Earth'],
    correctIndex: 0,
    explanation: 'Olympus Mons on Mars is the tallest planetary mountain.',
  });
  assert.equal(emptyOption.valid, false);

  const goodQuestion = validateQuestionInput({
    prompt: 'Which planet has the largest volcano in the Solar System?',
    options: ['Mars', 'Jupiter', 'Venus', 'Earth'],
    correctIndex: 0,
    explanation: 'Olympus Mons on Mars stands nearly 22 km high.',
  });
  assert.equal(goodQuestion.valid, true);

  assert.equal(validateBatchJobInput('ab', 5).valid, false);
  assert.equal(validateBatchJobInput('World Capitals', 2).valid, false);
  assert.equal(validateBatchJobInput('World Capitals', 8).valid, true);
});

test('generateDeterministicQuiz produces requested count of structured questions', () => {
  const result = generateDeterministicQuiz('World History & Empires', 6, 'Hard', '9:16');
  assert.equal(result.questions.length, 6);
  assert.equal(result.questions[0].options.length, 4);
  assert.equal(result.youtubeMeta.tags.includes('youtube shorts quiz'), true);
});

test('batch job progress and ETA calculators compute accurate progress and remaining time', () => {
  // 6 questions in 16:9 => 8 + 6*2 = 20s total estimated time
  assert.equal(estimateBatchJobTotalSeconds(6, '16:9'), 20);
  assert.equal(formatEtaRemaining(0), 'Finishing...');
  assert.equal(formatEtaRemaining(9), '09s remaining');
  assert.equal(formatEtaRemaining(75), '1m 15s remaining');

  const halfState = calculateBatchJobProgressState(6, '16:9', 0.5);
  assert.equal(halfState.progressPercent, 50);
  assert.equal(halfState.etaSeconds, 10);
  assert.equal(halfState.etaFormatted, '10s remaining');
  assert.equal(halfState.currentStepLabel.startsWith('2/4'), true);

  const lateState = calculateBatchJobProgressState(6, '16:9', 0.85);
  assert.equal(lateState.progressPercent, 85);
  assert.equal(lateState.etaSeconds, 3);
  assert.equal(lateState.currentStepLabel.startsWith('4/4'), true);
});

test('PC download generators produce valid Python script, Windows .bat launcher, and standalone HTML app', () => {
  const project = createInitialQuizProject();
  const py = generateLocalPythonAgentScript(project);
  assert.equal(py.includes('#!/usr/bin/env python3'), true);
  assert.equal(py.includes(project.title), true);

  const bat = generateWindowsBatchLauncher(project);
  assert.equal(bat.includes('@echo off'), true);
  assert.equal(bat.includes('youtube_package.txt'), true);

  const html = generatePortableHtmlStudioBundle(project);
  assert.equal(html.includes('<!doctype html>'), true);
  assert.equal(html.includes(project.title), true);
});
