import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';

type Campaign = { id: string; name: string; version?: number; senderReady?: boolean; senderReason?: string };
type CampaignResponse = { data?: { gtmCampaigns?: Campaign[] } };

const CampaignOverview = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [arabic, setArabic] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    new RestApiClient().get('/rest/gtmCampaigns', { query: { limit: 100 }, signal: controller.signal })
      .then((response: unknown) => {
        const records = (response as CampaignResponse).data?.gtmCampaigns;
        if (!Array.isArray(records)) throw new Error('Unexpected campaign response');
        setCampaigns(records);
      })
      .catch(() => { if (!controller.signal.aborted) setError('Campaigns could not load. Check the app permissions and try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  return <section dir={arabic ? 'rtl' : 'ltr'} style={{ padding: 24, fontFamily: 'sans-serif', color: '#14283f' }}>
    <button onClick={() => setArabic(!arabic)} style={{ minHeight: 44 }}>{arabic ? 'English' : 'العربية'}</button>
    <h1>{arabic ? 'مركز إدارة الحملات' : 'Campaign Command Center'}</h1>
    <p>{arabic ? 'معاينة سجلات مساحة العمل الحالية. التنفيذ المباشر غير متصل.' : 'Records from the current Twenty workspace. Live execution is not connected.'}</p>
    {loading && <p role="status">{arabic ? 'جارٍ تحميل الحملات…' : 'Loading campaigns…'}</p>}
    {error && <div role="alert"><p>{error}</p><button onClick={() => setAttempt(attempt + 1)} style={{ minHeight: 44 }}>{arabic ? 'حاول مرة أخرى' : 'Try again'}</button></div>}
    {!loading && !error && campaigns.length === 0 && <p>{arabic ? 'لا توجد حملات في مساحة العمل هذه.' : 'No campaigns in this workspace yet. Add a campaign through the Campaigns sidebar.'}</p>}
    {!loading && !error && campaigns.map(campaign => <article key={campaign.id} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}>
      <h2 dir="auto">{campaign.name}</h2>
      <p>{arabic ? 'الإصدار' : 'Version'} <bdi>{campaign.version ?? '—'}</bdi> · {campaign.senderReady ? (arabic ? 'المرسل جاهز' : 'Sender ready') : (arabic ? 'توقف لمراجعة المرسل' : 'Sender readiness hold')}</p>
      <p dir="auto">{campaign.senderReason}</p>
    </article>)}
    {!loading && !error && campaigns.length === 100 && <p>{arabic ? 'يُعرض أول ١٠٠ سجل. استخدم صفحة الحملات لعرض المزيد.' : 'Showing the first 100 records. Use the Campaigns index for the full list.'}</p>}
  </section>;
};

export default defineFrontComponent({
  universalIdentifier: 'c34ef72c-e62b-47f4-b497-4bb29b2b4940',
  name: 'campaign-overview',
  description: 'Read campaign readiness from the current Twenty workspace.',
  component: CampaignOverview,
});
