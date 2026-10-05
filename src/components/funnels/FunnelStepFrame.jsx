import { useLayoutEffect, useMemo, useRef } from 'react';
import { SANDBOX, buildSrcdoc, parseFunnelMessage } from '../../lib/funnels';

export default function FunnelStepFrame({ html, trackingHtml, title, onAction, className = '' }) {
  const frameRef = useRef(null);
  const srcDoc = useMemo(() => buildSrcdoc({ html, trackingHtml }), [html, trackingHtml]);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  // Layout effect: o listener precisa existir antes de o iframe poder postar mensagens.
  useLayoutEffect(() => {
    const handler = (event) => {
      const action = parseFunnelMessage(event, frameRef.current?.contentWindow);
      if (action) onActionRef.current?.(action);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <iframe
      ref={frameRef}
      title={title}
      sandbox={SANDBOX}
      srcDoc={srcDoc}
      className={`w-full border-0 ${className}`}
    />
  );
}
