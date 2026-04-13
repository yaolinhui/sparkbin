import { useState, useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string | undefined) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 检查文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(undefined);
    onChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  if (preview) {
    return (
      <div className="relative inline-block">
        <img
          src={preview}
          alt="Preview"
          className="w-20 h-20 object-cover border border-brutal-border"
        />
        {!disabled && (
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-5 h-5 bg-brutal-warning text-white flex items-center justify-center"
            title="删除"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        onClick={handleClick}
        disabled={disabled}
        className="w-20 h-20 border border-brutal-border border-dashed flex flex-col items-center justify-center gap-1 text-brutal-muted hover:text-brutal-text hover:border-brutal-text transition-colors disabled:opacity-50"
      >
        <ImageIcon className="w-5 h-5" />
        <span className="text-xs font-mono">截图</span>
      </button>
    </div>
  );
}

export default ImageUpload;
