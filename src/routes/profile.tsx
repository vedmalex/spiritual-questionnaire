import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '../components/ProfilePage';

export const Route = createFileRoute('/profile')({
  component: ProfileRoutePage,
});

function ProfileRoutePage() {
  return <ProfilePage />;
}
