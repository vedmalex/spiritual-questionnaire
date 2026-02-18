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
  scale_min: number;
  scale_max: number;
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

export interface RuleConstExpression {
  op: 'const';
  value: number;
}

export interface RuleAnswerExpression {
  op: 'answer';
  question_id: string;
  default_value?: number;
}

export interface RuleMetricExpression {
  op: 'metric';
  metric_id: string;
  default_value?: number;
}

export interface RuleUnaryExpression {
  op: 'abs' | 'neg';
  arg: QuestionnaireRuleExpression;
}

export interface RuleVariadicExpression {
  op: 'sum' | 'min' | 'max';
  args: QuestionnaireRuleExpression[];
}

export interface RuleBinaryExpression {
  op: 'sub' | 'mul' | 'div' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  args: [QuestionnaireRuleExpression, QuestionnaireRuleExpression];
  on_divide_by_zero?: number;
}

export interface RuleClampExpression {
  op: 'clamp';
  value: QuestionnaireRuleExpression;
  min_value: number;
  max_value: number;
}

export interface RuleIfExpression {
  op: 'if';
  condition: QuestionnaireRuleExpression;
  then: QuestionnaireRuleExpression;
  else: QuestionnaireRuleExpression;
}

export interface RuleSumAnswersExpression {
  op: 'sum_answers';
  question_ids: string[];
  weights?: Record<string, number>;
  default_value?: number;
}

export interface RuleCountMatchesExpression {
  op: 'count_matches';
  expected_scores: Record<string, number>;
}

export type QuestionnaireRuleExpression =
  | RuleConstExpression
  | RuleAnswerExpression
  | RuleMetricExpression
  | RuleUnaryExpression
  | RuleVariadicExpression
  | RuleBinaryExpression
  | RuleClampExpression
  | RuleIfExpression
  | RuleSumAnswersExpression
  | RuleCountMatchesExpression;

export interface QuestionnaireRuleMetric {
  id: string;
  title?: string | LocalizedText;
  description?: string | LocalizedText;
  expression: QuestionnaireRuleExpression;
  precision?: number;
}

export interface QuestionnaireRuleScoreOverride {
  total_expression: QuestionnaireRuleExpression;
  max_expression: QuestionnaireRuleExpression;
  percentage_expression?: QuestionnaireRuleExpression;
  clamp_percentage?: boolean;
}

export interface QuestionnaireRuleRanking {
  metric_ids?: string[];
  top_n?: number;
}

export type QuestionnaireRuleCheckSeverity = 'info' | 'warning' | 'critical';

export interface QuestionnaireRuleHonestyCheck {
  id: string;
  title?: string | LocalizedText;
  description?: string | LocalizedText;
  pass_expression: QuestionnaireRuleExpression;
  value_expression?: QuestionnaireRuleExpression;
  severity?: QuestionnaireRuleCheckSeverity;
}

export interface QuestionnaireProcessingRules {
  version: 1;
  metrics: QuestionnaireRuleMetric[];
  score?: QuestionnaireRuleScoreOverride;
  ranking?: QuestionnaireRuleRanking;
  honesty_checks?: QuestionnaireRuleHonestyCheck[];
}

export interface Metadata {
  title: string | LocalizedText;
  source_lecture: string | LocalizedText;
  quality: string;
  languages?: string[];
  system_folders?: string[];
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
  processing_rules?: QuestionnaireProcessingRules;
  runtimeId?: string;
  source?: QuestionnaireSource;
}

export interface StudentQuestionnaireFolder {
  id: string;
  name: string;
  parentId: string | null;
  kind?: 'user' | 'system';
}

export interface StudentQuestionnaireFoldersState {
  version: 1;
  folders: StudentQuestionnaireFolder[];
  itemOrderByParent: Record<string, string[]>;
  updatedAt: number;
}

export interface CuratorResultFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface CuratorResultFoldersState {
  version: 1;
  folders: CuratorResultFolder[];
  itemOrderByParent: Record<string, string[]>;
  studentFolderByKey: Record<string, string | null>;
  updatedAt: number;
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
  computed_result?: QuestionnaireComputedResult;
}

export interface QuestionnaireComputedHonestyCheck {
  id: string;
  passed: boolean;
  value: number;
  severity: QuestionnaireRuleCheckSeverity;
}

export interface QuestionnaireComputedResult {
  version: 1;
  engine: 'rules-v1';
  metrics: Record<string, number>;
  ranking: string[];
  honesty_checks?: {
    all_passed: boolean;
    failed_count: number;
    checks: QuestionnaireComputedHonestyCheck[];
  };
  errors?: string[];
}

export interface UserData {
  name: string;
  role: UserRole;
  createdAt: number;
  theme: 'light' | 'dark';
  language: string;
}

export interface ArchivedUserRecord {
  id: string;
  savedAt: number;
  user: UserData;
  appLanguage: string;
  session: QuizSession | null;
  pausedSessions: QuizSession[];
  studentResults: QuizResult[];
  curatorResults: QuizResult[];
  customQuestionnaires: Questionnaire[];
  studentQuestionnaireFolders?: StudentQuestionnaireFoldersState;
  curatorResultFolders?: CuratorResultFoldersState;
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
