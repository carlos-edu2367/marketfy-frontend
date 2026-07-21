import { CheckCircle, Clock, XCircle, AlertTriangle, QrCode } from 'lucide-react';

const STATUS_MAP = {
  approved: { label: 'confirmado', color: 'text-green-700 bg-green-50', icon: CheckCircle },
  pending: { label: 'pendente', color: 'text-yellow-700 bg-yellow-50', icon: Clock },
  canceled: { label: 'cancelado', color: 'text-gray-600 bg-gray-100', icon: XCircle },
  cancelled: { label: 'cancelado', color: 'text-gray-600 bg-gray-100', icon: XCircle },
  expired: { label: 'expirado', color: 'text-gray-600 bg-gray-100', icon: XCircle },
  divergent: { label: 'divergência', color: 'text-red-700 bg-red-50', icon: AlertTriangle },
};

export default function PixStatusBadge({ modality, pixStatus }) {
  if (modality !== 'qr_dynamic' && modality !== 'qr_static') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 bg-gray-100">
        Pix manual
      </span>
    );
  }

  const info = STATUS_MAP[pixStatus] || STATUS_MAP.pending;
  const Icon = info.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${info.color}`}>
      <QrCode size={12} /> Pix QR
      <Icon size={12} /> {info.label}
    </span>
  );
}
