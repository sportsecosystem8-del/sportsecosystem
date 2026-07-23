import { useEffect, useState } from 'react';
import { publicAssetUrl } from '../utils/assetUrl';

const SIZE_CLASS = {
  sm: 'h-10 w-10 text-xs',
  md: 'h-14 w-14 text-sm',
  lg: 'h-20 w-20 text-lg',
  xl: 'h-28 w-28 text-2xl',
};

function initialsFromName(name) {
  const parts = String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || '?').slice(0, 2).toUpperCase();
}

/** Coach headshot or initials fallback — pass coachProfile or { profilePhotoUrl, fullName } */
export default function CoachAvatar({ profile, name, size = 'md', className = '', cacheBust }) {
  const [imgError, setImgError] = useState(false);
  const [retries, setRetries] = useState(0);
  const MAX_RETRIES = 2;
  const photoUrl = profile?.profilePhotoUrl;
  const displayName = name || profile?.fullName || 'Coach';
  const sizeCls = SIZE_CLASS[size] || SIZE_CLASS.md;

  useEffect(() => {
    setImgError(false);
    setRetries(0);
  }, [photoUrl, cacheBust]);

  const handleError = () => {
    if (retries < MAX_RETRIES) {
      setRetries((r) => r + 1);
      setImgError(false);
    } else {
      setImgError(true);
    }
  };

  if (photoUrl && !imgError) {
    const src = publicAssetUrl(photoUrl);
    const bust =
      cacheBust != null
        ? cacheBust
        : profile?.updatedAt
          ? new Date(profile.updatedAt).getTime()
          : null;
    const baseSrc = bust ? `${src}${src.includes('?') ? '&' : '?'}v=${bust}` : src;
    const imgSrc = baseSrc + (baseSrc.includes('?') ? '&' : '?') + `retry=${retries}`;
    return (
      <img
        key={`${photoUrl}-${cacheBust}`}
        src={imgSrc}
        alt=""
        onError={handleError}
        className={`shrink-0 rounded-full object-cover ${sizeCls} ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#ff7524]/20 font-orbitron font-bold text-[#ff7524] ${sizeCls} ${className}`}
      aria-hidden
    >
      {initialsFromName(displayName)}
    </div>
  );
}
