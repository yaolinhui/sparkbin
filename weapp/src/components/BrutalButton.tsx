import { Button } from '@tarojs/components';

interface BrutalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'accent';
  size?: 'default' | 'small';
  block?: boolean;
  disabled?: boolean;
  className?: string;
}

export function BrutalButton({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  block = false,
  disabled = false,
  className = '',
}: BrutalButtonProps) {
  const variantClass = {
    default: '',
    primary: 'brutal-btn-primary',
    accent: 'brutal-btn-accent',
  }[variant];

  const sizeClass = size === 'small' ? 'brutal-btn-small' : '';
  const blockClass = block ? 'brutal-btn-block' : '';

  return (
    <Button
      className={`brutal-btn ${variantClass} ${sizeClass} ${blockClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
