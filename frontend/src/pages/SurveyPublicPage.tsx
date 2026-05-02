import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Star, Loader2 } from 'lucide-react';
import type { SurveyConfig, SurveyQuestion } from '../types';
import { surveyApi } from '../services/api';

export function SurveyPublicPage() {
  const { public_id } = useParams<{ public_id: string }>();
  const [survey, setSurvey] = useState<SurveyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!public_id) return;
    surveyApi
      .getPublic(public_id)
      .then((data) => {
        setSurvey(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '问卷加载失败');
        setLoading(false);
      });
  }, [public_id]);

  const questions = survey?.questions || [];
  const currentQuestion = questions[currentStep];
  const progress = questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;
    const ans = answers[currentQuestion.id];
    return ans !== undefined && ans !== '' && (Array.isArray(ans) ? ans.length > 0 : true);
  };

  const handleSubmit = async () => {
    if (!public_id) return;
    setSubmitting(true);
    try {
      await surveyApi.submitResponse(public_id, answers);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brutal-accent animate-spin" />
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center p-6">
        <div className="border-2 border-brutal-error p-6 max-w-md w-full text-center">
          <p className="text-brutal-error font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brutal-bg flex items-center justify-center p-6">
        <div className="border-2 border-brutal-success p-8 max-w-md w-full text-center">
          <Check className="w-12 h-12 text-brutal-success mx-auto mb-4" />
          <h2 className="text-xl font-mono font-bold text-brutal-text mb-2">提交成功</h2>
          <p className="text-sm font-mono text-brutal-muted">感谢你的参与！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-bg flex flex-col">
      {/* 顶部进度条 */}
      <div className="h-1 bg-brutal-border w-full">
        <div
          className="h-full bg-brutal-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 内容区 */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-xl">
          {/* 标题区 */}
          {currentStep === 0 && (
            <div className="mb-8 text-center">
              <h1 className="text-2xl md:text-3xl font-mono font-bold text-brutal-text mb-3">
                {survey?.title}
              </h1>
              {survey?.description && (
                <p className="text-sm font-mono text-brutal-muted">{survey.description}</p>
              )}
            </div>
          )}

          {/* 题目计数 */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-mono text-brutal-muted">
              {currentStep + 1} / {questions.length}
            </span>
            <span className="text-xs font-mono text-brutal-accent">
              {Math.round(progress)}%
            </span>
          </div>

          {/* 题目 */}
          {currentQuestion && (
            <div className="border-2 border-brutal-border bg-brutal-surface p-5 md:p-6">
              <h3 className="text-base md:text-lg font-mono font-bold text-brutal-text mb-1">
                {currentQuestion.title}
                {currentQuestion.required && (
                  <span className="text-brutal-error ml-1">*</span>
                )}
              </h3>

              <div className="mt-5">
                <QuestionRenderer
                  question={currentQuestion}
                  value={answers[currentQuestion.id]}
                  onChange={(val) => handleAnswer(currentQuestion.id, val)}
                />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 border border-brutal-error text-brutal-error text-xs font-mono">
              {error}
            </div>
          )}

          {/* 导航按钮 */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-5 py-2.5 border-2 border-brutal-border font-mono text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:border-brutal-text transition-colors"
            >
              上一题
            </button>

            {currentStep < questions.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-5 py-2.5 bg-brutal-accent text-brutal-bg font-mono text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brutal-accent/90 transition-colors"
              >
                下一题
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                className="px-5 py-2.5 bg-brutal-success text-brutal-bg font-mono text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brutal-success/90 transition-colors flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                提交
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 底部品牌 */}
      <div className="py-4 text-center">
        <span className="text-[10px] font-mono text-brutal-muted">Powered by SparkBin</span>
      </div>
    </div>
  );
}

function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  switch (question.type) {
    case 'single_choice':
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                onClick={() => onChange(opt)}
                className={`w-full text-left px-4 py-3 border-2 font-mono text-sm transition-all ${
                  selected
                    ? 'border-brutal-accent bg-brutal-accent/10 text-brutal-accent'
                    : 'border-brutal-border hover:border-brutal-text'
                }`}
              >
                <span className="inline-block w-5 h-5 border-2 mr-3 align-middle flex-shrink-0">
                  {selected && <Check className="w-4 h-4" />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      );

    case 'multi_choice':
      return (
        <div className="space-y-2">
          {question.options?.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  if (selected) {
                    onChange(current.filter((v) => v !== opt));
                  } else {
                    onChange([...current, opt]);
                  }
                }}
                className={`w-full text-left px-4 py-3 border-2 font-mono text-sm transition-all ${
                  selected
                    ? 'border-brutal-accent bg-brutal-accent/10 text-brutal-accent'
                    : 'border-brutal-border hover:border-brutal-text'
                }`}
              >
                <span className="inline-block w-5 h-5 border-2 mr-3 align-middle">
                  {selected && <Check className="w-4 h-4" />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      );

    case 'rating':
      return (
        <div className="flex items-center justify-center gap-2 py-4">
          {Array.from({ length: question.scale || 5 }, (_, i) => {
            const starValue = String(i + 1);
            const selected = Number(value) >= i + 1;
            return (
              <button
                key={i}
                onClick={() => onChange(starValue)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 md:w-10 md:h-10 ${
                    selected ? 'text-brutal-accent fill-brutal-accent' : 'text-brutal-border'
                  }`}
                />
              </button>
            );
          })}
        </div>
      );

    case 'text':
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder || '请输入你的回答...'}
          className="w-full p-4 bg-brutal-bg border-2 border-brutal-border font-mono text-sm min-h-[120px] resize-none focus:border-brutal-accent transition-colors"
        />
      );

    default:
      return null;
  }
}

export default SurveyPublicPage;
