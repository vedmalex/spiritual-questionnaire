/**
 * Spiritual Assessment Types
 * Based on SKILL.md schema
 */

export type UserRole = 'student' | 'curator' | 'admin';

export interface GradingDescription {
  score: number;
  meaning: string;
}

export interface GradingSystem {
  scale_min: 0;
  scale_max: 10;
  description: GradingDescription[];
}

export interface LocalizedText {
  [languageCode: string]: string;
}

export interface LocalizedStringList {
  [languageCode: string]: string[];
}

export interface Question {
  id: string;
  question: string | LocalizedText;
  context_sources: string[] | LocalizedStringList;
  self_check_prompts: string[] | LocalizedStringList;
  requires_comment: boolean;
  user_score: number | null;
}

export interface Metadata {
  title: string | LocalizedText;
  source_lecture: string | LocalizedText;
  quality: string;
  languages?: string[];
}

export type QuestionnaireSource = 'static' | 'local';

export interface Questionnaire {
  $schema?: string;
  title: string;
  type: 'object';
  required: string[];
  metadata: Metadata;
  grading_system: GradingSystem;
  questions: Question[];
  runtimeId?: string;
  source?: QuestionnaireSource;
}

export interface CuratorFeedback {
  id: string;
  curatorName: string;
  questionId: string;
  comment: string;
  timestamp: number;
  authorRole?: 'curator' | 'student';
  authorName?: string;
}

export interface AnswerDetails {
  score: number;
  comment?: string;
  photos?: string[]; // base64 encoded images
  curatorFeedback?: CuratorFeedback[];
}

export interface QuizSession {
  id: string;
  questionnaireId: string;
  userName: string;
  userRole: UserRole;
  sourceResultId?: string;
  sourceResultCompletedAt?: number;
  returnUrl?: string;
  startTime: number;
  lastActivity: number;
  currentQuestionIndex: number;
  answers: Record<string, AnswerDetails>;
  status: 'active' | 'paused' | 'completed';
}

export type ReviewStatus =
  | 'pending'
  | 'in_review'
  | 'reviewed'
  | 'needs_revision'
  | 'approved'; // legacy alias, normalize to needs_revision on import

export interface QuizResult {
  id: string;
  questionnaireId: string;
  questionnaireTitle: string;
  userName: string;
  userRole: UserRole;
  completedAt: number;
  answers: Record<string, AnswerDetails>;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  reviewStatus: ReviewStatus;
  absentInCurrentSchemaQuestionIds?: string[];
  assignedCurator?: string;
  reviewCompletedAt?: number;
}

export interface UserData {
  name: string;
  role: UserRole;
  createdAt: number;
  theme: 'light' | 'dark';
  language: string;
}

export interface AppState {
  version: number;
  buildId?: string;
  user: UserData | null;
  currentSession: QuizSession | null;
  results: QuizResult[];
}

// Statistics types
export interface ScoreDistribution {
  score: number;
  count: number;
}

export interface QuizStatistics {
  totalAttempts: number;
  averageScore: number;
  scoreDistribution: ScoreDistribution[];
  averagePercentage: number;
}
