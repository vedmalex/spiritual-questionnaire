import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Dashboard } from '../components/Dashboard';
import { CuratorDashboard } from '../components/CuratorDashboard';
import { AdminDashboard, type AdminTab } from '../components/AdminDashboard';
import { useResults } from '../hooks/useResults';
import { useUser } from '../hooks/useUser';
import { useQuestionnaires } from '../hooks/useQuestionnaires';
import { t } from '../utils/i18n';
import { isAdminFeaturesEnabled, isRoleEnabled } from '../config/appProfile';

type DashboardTab = 'results' | 'analytics' | 'feedback';

interface DashboardSearch {
  tab?: DashboardTab;
  adminTab?: AdminTab;
  focusResultId?: string;
  focusResultAt?: number;
  focusQuestionId?: string;
}

function normalizeDashboardTab(value: unknown): DashboardTab | undefined {
  return value === 'feedback' || value === 'results' || value === 'analytics' ? value : undefined;
}

function normalizeAdminTab(value: unknown): AdminTab | undefined {
  if (
    value === 'overview' ||
    value === 'questionnaires' ||
    value === 'translations' ||
    value === 'operations'
  ) {
    return value;
  }
  return undefined;
}

function normalizeFocusId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeFocusTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return undefined;
}

export const Route = createFileRoute('/dashboard')({
  validateSearch: (search): DashboardSearch => ({
    tab: normalizeDashboardTab(search.tab),
    adminTab: normalizeAdminTab(search.adminTab),
    focusResultId: normalizeFocusId(search.focusResultId),
    focusResultAt: normalizeFocusTimestamp(search.focusResultAt),
    focusQuestionId: normalizeFocusId(search.focusQuestionId),
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading: userLoading } = useUser();
  const resultsScope = user?.role === 'curator' ? 'curator' : 'student';
  const ownerName = user?.role === 'student' ? user.name : undefined;
  const {
    results,
    loading,
    deleteResult,
    updateResult,
    exportResult,
    exportAllResults,
    importAllResults,
  } = useResults(resultsScope, ownerName, Boolean(user));
  const { questionnaires, loading: questionnairesLoading } = useQuestionnaires();
  const dashboardTab: DashboardTab = search.tab || 'results';
  const adminTab: AdminTab = search.adminTab || 'overview';

  const handleDashboardTabChange = (tab: DashboardTab) => {
    void navigate({
      to: '/dashboard',
      search: (prev: DashboardSearch) => ({
        tab,
        adminTab: prev.adminTab,
        focusResultId: undefined,
        focusResultAt: undefined,
        focusQuestionId: undefined,
      }),
    });
  };

  const handleAdminTabChange = (tab: AdminTab) => {
    void navigate({
      to: '/dashboard',
      search: (prev: DashboardSearch) => ({
        tab: prev.tab,
        adminTab: tab,
        focusResultId: undefined,
        focusResultAt: undefined,
        focusQuestionId: undefined,
      }),
    });
  };

  useEffect(() => {
    if (userLoading || user) return;

    void navigate({
      to: '/',
      replace: true,
    });
  }, [navigate, user, userLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasLegacyQuizParams =
      params.has('quiz') || params.has('q') || params.has('returnUrl');
    if (!hasLegacyQuizParams) return;

    void navigate({
      to: '/dashboard',
      replace: true,
      search: () => ({
        tab: search.tab,
        adminTab: search.adminTab,
        focusResultId: search.focusResultId,
        focusResultAt: search.focusResultAt,
        focusQuestionId: search.focusQuestionId,
      }),
    });
  }, [
    navigate,
    search.adminTab,
    search.focusQuestionId,
    search.focusResultId,
    search.tab,
  ]);

  if (userLoading || questionnairesLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user?.role === 'curator' && isRoleEnabled('curator')) {
    return <CuratorDashboard />;
  }

  if (user?.role === 'admin' && isAdminFeaturesEnabled()) {
    return <AdminDashboard activeTab={adminTab} onTabChange={handleAdminTabChange} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('dashboard.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('dashboard.subtitle')}
        </p>
      </div>

      <Dashboard
        results={results}
        questionnaires={questionnaires}
        loading={loading}
        onExportResult={exportResult}
        onExportAll={exportAllResults}
        onImportAll={importAllResults}
        onDeleteResult={deleteResult}
        onUpdateResult={updateResult}
        currentUserName={user?.name}
        activeTab={dashboardTab}
        onTabChange={handleDashboardTabChange}
        focusResultId={search.focusResultId}
        focusResultCompletedAt={search.focusResultAt}
        focusQuestionId={search.focusQuestionId}
      />
    </div>
  );
}
