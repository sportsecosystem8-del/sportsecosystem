import { useState } from 'react';
import { publicAssetUrl } from '../utils/assetUrl';
import { productPrimaryImagePath } from '../utils/productImages';

/** Product or order-line thumbnail with placeholder */
export default function ProductImage({
  product,
  path,
  alt = '',
  className = 'h-40 w-full object-cover',
  placeholderClassName,
}) {
  const [imgError, setImgError] = useState(false);
  const src = path || productPrimaryImagePath(product);
  const placeholder = placeholderClassName || className.replace(/object-\S+/g, '').trim() || 'h-40 w-full';

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

  return (
    <img
      src={publicAssetUrl(src)}
      alt={alt || product?.name || ''}
      className={className}
      onError={() => setImgError(true)}
    />
  );
}
