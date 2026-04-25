import { useState } from 'react';

interface Props {
  name: string;
  avatar?: string;
  className?: string;
  textClassName?: string;
}

export default function UserAvatar({ name, avatar, className = '', textClassName = 'text-sm font-bold' }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (name?.trim() || '?').charAt(0).toUpperCase();

  if (avatar && !imgFailed) {
    return (
      <img
        src={avatar}
        alt={name}
        className={className}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center bg-brown-700 text-cream-100 select-none ${className}`}>
      <span className={textClassName}>{initial}</span>
    </div>
  );
}
