interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-cream-200 via-cream-100 to-cream-200 bg-[length:200%_100%] ${className}`}
    />
  );
}
