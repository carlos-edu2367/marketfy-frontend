import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import FunnelStepFrame from '../../components/funnels/FunnelStepFrame';
import { useAuth } from '../../hooks/useAuth';
import {
  finishUrl, getFunnelPreview, readFsid, readUtms, rememberCheckoutFsid, saveFsid, sendFunnelEvent,
  startFunnelSession,
} from '../../lib/funnels';

export default function FunnelPlayer() {
  const { slug } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const previewVariant = new URLSearchParams(search).get('preview');

  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | missing

  useEffect(() => {
    if (previewVariant && authLoading) return;
    let cancelled = false;
    const load = async () => {
      try {
        if (previewVariant) {
          const preview = await getFunnelPreview(previewVariant);
          if (!cancelled) {
            setData({ ...preview, fsid: null });
            setIndex(0);
            setStatus('ready');
          }
          return;
        }
        const result = await startFunnelSession(slug, {
          fsid: readFsid(slug), ...readUtms(search), referrer: document.referrer || null,
        });
        if (cancelled) return;
        saveFsid(slug, result.fsid);
        const start = result.steps.findIndex((s) => s.position === result.resume_position);
        setData(result);
        setIndex(start >= 0 ? start : 0);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('missing');
      }
    };
    load();
    return () => { cancelled = true; };
    // search é lido só na primeira carga (UTMs da chegada)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, previewVariant, authLoading]);

  const step = data?.steps[index];
  const recording = Boolean(data?.fsid);

  useEffect(() => {
    if (recording && step) sendFunnelEvent({ fsid: data.fsid, type: 'step_view', step_position: step.position });
  }, [recording, step, data?.fsid]);

  const finish = useCallback(() => {
    if (!recording) return;
    sendFunnelEvent({ fsid: data.fsid, type: 'funnel_completed' });
    rememberCheckoutFsid(data.fsid);
    navigate(finishUrl({ planId: data.funnel.plan_id, fsid: data.fsid, loggedIn: Boolean(user) }));
  }, [recording, data, navigate, user]);

  const onAction = useCallback((action) => {
    if (!data) return;
    if (action === 'back') {
      setIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (action === 'finish' || index >= data.steps.length - 1) {
      finish();
      return;
    }
    if (recording) sendFunnelEvent({ fsid: data.fsid, type: 'step_next', step_position: data.steps[index].position });
    setIndex((i) => i + 1);
  }, [data, index, recording, finish]);

  if (status === 'loading') {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    );
  }
  if (status === 'missing' || !step) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-gray-50 px-4 text-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Funil não encontrado</h1>
          <p className="text-gray-500">Este link não está mais disponível.</p>
        </div>
      </div>
    );
  }

  const total = data.steps.length;
  return (
    <div className="h-[100dvh] flex flex-col bg-white">
      {previewVariant && (
        <div className="flex items-center justify-between gap-2 bg-slate-900 text-white text-sm px-4 py-2">
          <span className="font-bold">Prévia — nada é registrado</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} className="px-2 py-1 rounded bg-white/10">‹</button>
            <span>{index + 1} / {total}</span>
            <button type="button" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} className="px-2 py-1 rounded bg-white/10">›</button>
          </div>
        </div>
      )}
      <FunnelStepFrame
        key={`${index}-${step.position}`}
        html={step.html}
        trackingHtml={data.tracking_html}
        title={`Etapa ${index + 1} de ${total}`}
        onAction={onAction}
        className="flex-1"
      />
    </div>
  );
}
