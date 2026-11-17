import { useState } from 'react';
import { Cpu } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({ src, alt, className = '', fallbackLabel }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-zinc-100 text-zinc-500 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Cpu className="w-8 h-8 text-zinc-400 mb-2" strokeWidth={1.5} />
        <span className="text-xs font-medium text-zinc-600 max-w-[200px] truncate">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
