import { CheckCircle2, Loader2, Radio } from 'lucide-react';
import type { DeploymentStatus } from '../types/tron';

interface DeploymentProgressProps {
  status: DeploymentStatus;
}

const steps: Array<{ status: DeploymentStatus; label: string }> = [
  { status: 'awaiting_signature', label: 'Waiting for TronLink Signature' },
  { status: 'broadcasting', label: 'Broadcasting Transaction' },
  { status: 'confirming', label: 'Waiting for Confirmation' },
];

export function DeploymentProgress({ status }: DeploymentProgressProps) {
  if (status === 'idle' || status === 'success') {
    return null;
  }

  return (
    <div className="rounded-lg border border-line bg-panel/86 p-5">
      <div className="mb-4 flex items-center gap-3">
        <Radio className="h-5 w-5 text-mint" />
        <h2 className="text-lg font-semibold text-white">Deployment</h2>
      </div>
      <div className="space-y-3">
        {steps.map((step) => {
          const active = step.status === status;
          const complete = isComplete(step.status, status);

          return (
            <div key={step.status} className="flex items-center gap-3 text-sm">
              {complete ? (
                <CheckCircle2 className="h-4 w-4 text-mint" />
              ) : active ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-line" />
              )}
              <span className={active || complete ? 'text-slate-100' : 'text-slate-500'}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isComplete(step: DeploymentStatus, current: DeploymentStatus) {
  const order: DeploymentStatus[] = ['awaiting_signature', 'broadcasting', 'confirming', 'success'];
  return order.indexOf(step) < order.indexOf(current);
}
