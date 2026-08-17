import { Routes, Route, Link } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './features/overview/OverviewPage';
import { CampaignsPage } from './features/campaigns/CampaignsPage';
import { CampaignCreatePage } from './features/campaigns/CampaignCreatePage';
import { CampaignDetailPage } from './features/campaigns/CampaignDetailPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { EmptyState } from './components/ui/Feedback';
import { Toaster } from './components/ui/Toast';
import { LiveProvider } from './hooks/use-sse';

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="That address doesn't match anything in B-Matrix."
      action={
        <Link to="/" className="text-sm font-medium text-accent-600 hover:text-accent-700">
          Back to overview
        </Link>
      }
    />
  );
}

export default function App() {
  return (
    <LiveProvider>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaigns/new" element={<CampaignCreatePage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </LiveProvider>
  );
}
