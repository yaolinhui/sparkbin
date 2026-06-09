import { Input } from '@tarojs/components';

interface BrutalInputProps {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  password?: boolean;
  type?: 'text' | 'number' | 'digit';
  className?: string;
}

export function BrutalInput({
  value,
  onInput,
  placeholder,
  password = false,
  type = 'text',
  className = '',
}: BrutalInputProps) {
  return (
    <Input
      className={`brutal-input ${className}`}
      value={value}
      onInput={(e) => onInput(e.detail.value)}
      placeholder={placeholder}
      password={password}
      type={type}
    />
  );
}
