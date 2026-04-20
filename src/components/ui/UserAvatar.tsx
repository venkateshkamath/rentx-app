interface Props {
  name: string;
  avatar?: string;
  className?: string;
  textClassName?: string;
}

export default function UserAvatar({ name, avatar, className = '', textClassName = 'text-sm font-bold' }: Props) {
  if (avatar) {
    return <img src={avatar} alt={name} className={className} />;
  }
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div className={`flex items-center justify-center bg-brown-700 text-cream-100 select-none ${className}`}>
      <span className={textClassName}>{initial}</span>
    </div>
  );
}
