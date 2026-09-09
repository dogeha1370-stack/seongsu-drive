import type { ImgHTMLAttributes } from 'react';
export default function Image({ unoptimized: _unoptimized, priority, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean; priority?: boolean }) {
  // EC2 serves the already supplied image assets without a Next image service.
  // eslint-disable-next-line next/no-img-element
  return <img {...props} alt={alt} loading={priority ? 'eager' : props.loading ?? 'lazy'} />;
}
