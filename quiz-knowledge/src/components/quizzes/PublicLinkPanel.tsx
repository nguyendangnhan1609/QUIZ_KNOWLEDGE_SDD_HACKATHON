'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PublicLinkPanelProps {
  quizUrl: string;
  resultsUrl: string;
  questionCount: number;
  bankSize: number;
}

export function PublicLinkPanel(props: PublicLinkPanelProps) {
  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Quiz created. Each participant answers <strong>{props.questionCount}</strong> questions
          randomly drawn from a bank of <strong>{props.bankSize}</strong>.
        </p>
      </div>

      <LinkRow label="Share with participants" url={props.quizUrl} />
      <LinkRow label="View results" url={props.resultsUrl} />
    </div>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts (HTTP over LAN/IP)
        const el = document.createElement('textarea');
        el.value = url;
        el.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded border bg-muted px-3 py-2 font-mono text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={onCopy}
          className="shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              <span className="ml-1">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span className="ml-1">Copy</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
