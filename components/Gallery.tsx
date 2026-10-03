'use client';
import { useState } from 'react';

export default function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [i, setI] = useState(0);
  if (!photos.length) return <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-cream text-ink/40">No photo</div>;
  return (
    <div>
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-cream"><img src={photos[i]} alt={`${title}, photo ${i + 1}`} className="h-full w-full object-cover" /></div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((src, n) => (
            <button key={src} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-current={n === i} className={`h-20 w-16 shrink-0 overflow-hidden rounded border-2 ${n === i ? 'border-terracotta' : 'border-transparent'}`}>
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
