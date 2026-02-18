import { useEffect, useState } from 'react';
import type { Questionnaire, AnswerDetails } from '../types/questionnaire';
import { t } from '../utils/i18n';
import {
  extractMarkdownImageSources,
  hasMarkdownTextContent,
  mergeLegacyCommentWithPhotos,
} from '../utils/markdown';
import { MarkdownEditor } from './ui/MarkdownEditor';
import { getGradingMeaning } from '../utils/gradingSystem';

interface QuizTakerProps {
  questionnaire: Questionnaire;
  currentQuestionIndex: number;
  answers: Record<string, AnswerDetails>;
  onAnswer: (questionId: string, details: AnswerDetails) => void;
  onNext: () => void;
  onPrev: () => void;
  onPause: () => void;
  onComplete: () => void;
}

export function QuizTaker({
  questionnaire,
  currentQuestionIndex,
  answers,
  onAnswer,
  onNext,
  onPrev,
  onPause,
  onComplete,
}: QuizTakerProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [showComment, setShowComment] = useState(false);
  
  const currentQuestion = questionnaire.questions[currentQuestionIndex];
  const currentLanguage = document.documentElement.lang || 'ru';
  const totalQuestions = questionnaire.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  const currentAnswer = answers[currentQuestion.id];
  const currentScore = currentAnswer?.score;
  const currentComment = mergeLegacyCommentWithPhotos(
    currentAnswer?.comment || '',
    currentAnswer?.photos || []
  );
  const currentPhotos = extractMarkdownImageSources(currentComment);
  const currentFeedback = currentAnswer?.curatorFeedback || [];
  const commentRequired = Boolean(currentQuestion.requires_comment);
  const hasRequiredComment = !commentRequired || hasMarkdownTextContent(currentComment);
  const canProceed = currentScore !== undefined && hasRequiredComment;
  const gradingSystem = questionnaire.grading_system;
  const gradingScores =
    gradingSystem.description.length > 0
      ? gradingSystem.description
          .map((entry) => entry.score)
          .filter((score, index, source) => Number.isFinite(score) && source.indexOf(score) === index)
          .sort((left, right) => left - right)
      : Array.from(
          { length: gradingSystem.scale_max - gradingSystem.scale_min + 1 },
          (_, index) => gradingSystem.scale_min + index
        );

  useEffect(() => {
    setShowComment(commentRequired || Boolean(currentComment));
  }, [currentQuestion.id, commentRequired]);

  const handleScoreSelect = (score: number) => {
    onAnswer(currentQuestion.id, {
      score,
      comment: currentComment,
      photos: currentPhotos,
      curatorFeedback: currentFeedback,
    });
  };

  const handleCommentChange = (comment: string) => {
    const nextPhotos = extractMarkdownImageSources(comment);
    onAnswer(currentQuestion.id, {
      score: currentScore ?? gradingSystem.scale_min,
      comment,
      photos: nextPhotos,
      curatorFeedback: currentFeedback,
    });
  };

  const getQuestionText = () => {
    const q = currentQuestion.question;
    if (typeof q === 'string') return q;
    return q[currentLanguage] || q['en'] || q['ru'] || '';
  };

  const getLocalizedList = (value: Questionnaire['questions'][number]['context_sources']) => {
    if (Array.isArray(value)) {
      return value;
    }

    return value[currentLanguage] || value['en'] || value['ru'] || [];
  };

  const currentSources = getLocalizedList(currentQuestion.context_sources);
  const currentPrompts = getLocalizedList(currentQuestion.self_check_prompts);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>{t('quiz.question')} {currentQuestionIndex + 1} {t('quiz.of')} {totalQuestions}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {getQuestionText()}
        </h2>

        {/* Context Sources */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('quiz.sources')}
          </h3>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {currentSources.map((source, idx) => (
              <li key={`source-${idx}`}>{source}</li>
            ))}
          </ul>
        </div>

        {/* Self-Check Prompts */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium flex items-center"
          >
            {showHelp ? t('quiz.selfCheck.hide') : t('quiz.selfCheck.show')}
            <svg
              className={`w-4 h-4 ml-1 transform transition-transform ${showHelp ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showHelp && (
            <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                {t('quiz.selfCheck.title')}
              </h4>
              <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {currentPrompts.map((prompt, idx) => (
                  <li key={`prompt-${idx}`}>{prompt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Score Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('quiz.score.select')}
          </h3>

          <div className="flex flex-wrap gap-2">
            {gradingScores.map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => handleScoreSelect(score)}
                onMouseEnter={() => setHoveredScore(score)}
                onMouseLeave={() => setHoveredScore(null)}
                onFocus={() => setHoveredScore(score)}
                onBlur={() => setHoveredScore(null)}
                className={`
                  min-w-[3rem] px-3 py-3 rounded-lg text-sm font-medium transition-all
                  ${currentScore === score
                    ? 'bg-primary-600 text-white ring-2 ring-primary-600 ring-offset-2 dark:ring-offset-gray-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {score}
              </button>
            ))}
          </div>

          <p className="mt-3 min-h-[1.5rem] text-sm text-gray-600 dark:text-gray-400">
            {hoveredScore !== null || currentScore !== undefined ? (
              <>
                {t(
                  hoveredScore !== null && hoveredScore !== currentScore
                    ? 'quiz.score.preview'
                    : 'quiz.score.selected'
                )}
                :{' '}
                <strong className="text-primary-600 dark:text-primary-400">
                  {hoveredScore ?? currentScore}
                </strong>{' '}
                - {getGradingMeaning(gradingSystem, hoveredScore ?? currentScore ?? gradingSystem.scale_min)}
              </>
            ) : (
              <span className="italic text-gray-400 dark:text-gray-500">{t('quiz.score.hint')}</span>
            )}
          </p>
        </div>

        {/* Comment Section */}
        <div className="mb-6">
          {!commentRequired && (
            <button
              type="button"
              onClick={() => setShowComment(!showComment)}
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium flex items-center mb-3"
            >
              📝 {t('quiz.comment.add')}
            </button>
          )}

          {commentRequired && (
            <p className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-300">
              {t('quiz.comment.required')}
            </p>
          )}
          
          {(commentRequired || showComment || currentComment) && (
            <MarkdownEditor
              value={currentComment}
              onChange={handleCommentChange}
              placeholder={t('quiz.comment.placeholder')}
              allowImages
            />
          )}

          {commentRequired && currentScore !== undefined && !hasRequiredComment && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              {t('quiz.comment.requiredHint')}
            </p>
          )}
        </div>

      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← {t('quiz.navigation.back')}
          </button>
          
          <button
            type="button"
            onClick={onPause}
            className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
          >
            ⏸ {t('quiz.navigation.pause')}
          </button>
        </div>

        <div>
          {currentQuestionIndex === totalQuestions - 1 ? (
            <button
              type="button"
              onClick={onComplete}
              disabled={!canProceed}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ✅ {t('quiz.navigation.complete')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!canProceed}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('quiz.navigation.next')} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
