import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { CustomNav } from '../../components/CustomNav';
import { BrutalButton } from '../../components/BrutalButton';
import { aiApi } from '../../services/api';
import type { AIProvider, ChatMessage } from '../../types';
import './index.scss';

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'You are SparkBin AI, a helpful assistant for indie hackers.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('deepseek');
  const [providers, setProviders] = useState<{ provider: AIProvider; name: string; is_active: boolean }[]>([]);
  const scrollRef = useRef<string>('');
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    // 新消息到来时自动滚动到底部
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo?.({
          top: 999999,
          animated: true,
        });
      }, 100);
    }
  }, [messages, loading]);

  const loadProviders = async () => {
    try {
      const data = await aiApi.getProviders();
      setProviders(data);
      const active = data.find((p) => p.is_active);
      if (active) setProvider(active.provider);
    } catch {
      // ignore
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { job_id } = await aiApi.createChatJob({
        provider,
        messages: newMessages.filter((m) => m.role !== 'system'),
      });

      const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
      setMessages([...newMessages, assistantMessage]);

      let completed = false;
      let attempts = 0;
      const maxAttempts = 120;

      const poll = async () => {
        if (completed || attempts >= maxAttempts) return;
        attempts++;

        try {
          const job = await aiApi.getChatJob(job_id);

          if (job.status === 'completed' && job.content) {
            completed = true;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: job.content! };
              return next;
            });
            setLoading(false);
          } else if (job.status === 'failed') {
            completed = true;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: `Error: ${job.error || 'Unknown'}` };
              return next;
            });
            setLoading(false);
          } else {
            if (job.partial_content) {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: job.partial_content };
                return next;
              });
            }
            setTimeout(poll, 500);
          }
        } catch {
          setTimeout(poll, 500);
        }
      };

      poll();
    } catch {
      Taro.showToast({ title: '发送失败', icon: 'none' });
      setLoading(false);
    }
  }, [input, loading, messages, provider]);

  const visibleMessages = messages.filter((m) => m.role !== 'system');

  return (
    <View className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CustomNav title="AI CHAT" />

      {/* 模型选择器 */}
      <View className="flex gap-2 px-5 py-3 border-b" style={{ marginTop: 'calc(var(--status-bar-height) + var(--nav-height))' }}>
        {providers.map((p) => (
          <View
            key={p.provider}
            className={`brutal-badge ${provider === p.provider ? 'badge-accent' : 'badge-outline'}`}
            onClick={() => setProvider(p.provider)}
          >
            <Text>{p.name}</Text>
          </View>
        ))}
      </View>

      {/* 消息列表 */}
      <ScrollView
        ref={scrollViewRef}
        scrollY
        scrollWithAnimation
        style={{ flex: 1, overflow: 'auto' }}
      >
        <View style={{ padding: '24rpx 0' }}>
          {visibleMessages.map((msg, idx) => (
            <View
              key={idx}
              className="px-5 py-4"
              style={{
                borderBottom: '2rpx solid var(--brutal-border)',
                backgroundColor: msg.role === 'user' ? 'var(--brutal-hover)' : 'transparent',
              }}
            >
              <Text className="text-xs text-muted uppercase" style={{ letterSpacing: '2rpx', marginBottom: '8rpx' }}>
                {msg.role === 'user' ? 'YOU' : 'AI'}
              </Text>
              <Text className="text-base" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {msg.content || (msg.role === 'assistant' && loading ? '...' : '')}
              </Text>
            </View>
          ))}
          {/* 底部留白，让最后一条消息不被输入框遮挡 */}
          <View style={{ height: '40rpx' }} />
        </View>
      </ScrollView>

      {/* 底部固定输入栏 */}
      <View className="fixed-bottom-bar">
        <View className="flex gap-3 items-end">
          <Textarea
            className="brutal-textarea flex-1"
            style={{ minHeight: '96rpx', height: 'auto', maxHeight: '240rpx', padding: '20rpx 24rpx' }}
            value={input}
            onInput={(e) => setInput(e.detail.value)}
            placeholder="Ask SparkBin AI..."
            confirmHold
          />
          <BrutalButton
            variant="primary"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{ minHeight: '96rpx' }}
          >
            <Text>SEND</Text>
          </BrutalButton>
        </View>
      </View>
    </View>
  );
}
