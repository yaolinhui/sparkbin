import { View } from '@tarojs/components';

interface BrutalCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onClick?: () => void;
}

export function BrutalCard({ children, title, className = '', onClick }: BrutalCardProps) {
  return (
    <View className={`brutal-card ${className}`} onClick={onClick}>
      {title && <View className="card-title">{title}</View>}
      {children}
    </View>
  );
}
