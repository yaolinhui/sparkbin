import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import type { ReactNode } from 'react';

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * 安全的 Markdown 渲染组件
 *
 * 使用 rehype-sanitize 过滤危险 HTML，防止 XSS 攻击
 * 支持标准 Markdown 语法，但禁用原始 HTML 和危险属性
 */
export function SafeMarkdown({ content, className }: SafeMarkdownProps): ReactNode {
  return (
    <div className={className}>
      <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      skipHtml={true}  // 完全跳过 HTML 标签
      components={{
        // 自定义链接组件，防止钓鱼攻击
        a: ({ node: _node, ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => {
              // 可选：添加确认对话框处理外部链接
              const href = props.href;
              if (href && !href.startsWith('/') && !href.startsWith('#')) {
                // 外部链接，可以添加额外的安全检查
                console.log(`Opening external link: ${href}`);
              }
            }}
          />
        ),
        // 禁用危险元素
        script: () => null,
        iframe: () => null,
        object: () => null,
        embed: () => null,
        form: () => null,
        input: () => null,
        textarea: () => null,
      }}
    >
      {content}
      </ReactMarkdown>
    </div>
  );
}

export default SafeMarkdown;
