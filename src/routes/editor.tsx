import { createFileRoute } from '@tanstack/react-router';
import { QuestionnaireEditor } from '../components/QuestionnaireEditor';
import { useUser } from '../hooks/useUser';
import { t } from '../utils/i18n';
import { isAdminFeaturesEnabled } from '../config/appProfile';

export const Route = createFileRoute('/editor')({
  component: EditorPage,
});

function EditorPage() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user?.role !== 'admin' || !isAdminFeaturesEnabled()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('access.denied.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('access.denied.editorOnlyAdmin')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <QuestionnaireEditor />
    </div>
  );
}
