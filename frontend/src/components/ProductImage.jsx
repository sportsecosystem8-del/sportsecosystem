import { useEffect, useState } from 'react';
import { publicAssetUrl } from '../utils/assetUrl';
import { productPrimaryImagePath } from '../utils/productImages';

/** Product or order-line thumbnail with placeholder + retry logic */
export default function ProductImage({
  product,
  path,
  alt = '',
  className = 'h-40 w-full object-cover',
  placeholderClassName,
}) {
  const [imgError, setImgError] = useState(false);
  const [retries, setRetries] = useState(0);
  const MAX_RETRIES = 2;
  const src = path || productPrimaryImagePath(product);
  const placeholder = placeholderClassName || className.replace(/object-\S+/g, '').trim() || 'h-40 w-full';

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const handleError = () => {
    if (retries < MAX_RETRIES) {
      setRetries((r) => r + 1);
      setImgError(false);
    } else {
      setImgError(true);
    }
  };

  if (!src || imgError) {
    return (
      <div
        className={`flex items-center justify-center bg-black/30 text-xs text-slate-500 ${placeholder}`}
        aria-hidden
      >
        No image
      </div>
    );
  }

  const imgSrc = publicAssetUrl(src);
  const bustedSrc = imgSrc + (imgSrc.includes('?') ? '&' : '?') + `retry=${retries}`;

  return (
    <img
      key={src}
      src={bustedSrc}
      alt={alt || product?.name || ''}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}
