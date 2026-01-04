import { useState } from 'react';
import { useTranslation } from '../i18n/TranslationContext';

interface ProfileSetupModalProps {
  onComplete: () => void;
}

export function ProfileSetupModal({ onComplete }: ProfileSetupModalProps) {
  const { lang } = useTranslation();
  const isZh = lang === 'zh';

  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      alert(isZh ? '请输入有效年龄 (1-120)' : 'Please enter a valid age (1-120)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save profile data
      const profile = {
        age: ageNum,
        gender,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem('user_profile', JSON.stringify(profile));
      localStorage.setItem('profile_setup_complete', 'true');

      // Create anonymous local user
      const userId = `user-${Date.now()}`;
      localStorage.setItem('user_id', userId);
      localStorage.setItem('user_token', `local_token_${Date.now()}`);
      localStorage.setItem('is_anonymous_user', 'true');

      onComplete();
    } catch (error) {
      alert(isZh ? '保存失败，请重试' : 'Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card-elevated w-full max-w-md p-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-[rgba(0,122,255,0.12)] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">💊</span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {isZh ? '欢迎使用 MedTimer!' : 'Welcome to MedTimer!'}
            </h2>
            <p className="text-[var(--text-secondary)] mt-2">
              {isZh ? '让我们设置您的个人资料' : "Let's set up your profile"}
            </p>
          </div>

          {/* Age Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {isZh ? '年龄' : 'Age'} *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-lg">🎂</span>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input !pl-14"
                placeholder={isZh ? '输入您的年龄' : 'Enter your age'}
                min="1"
                max="120"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm">
                {isZh ? '岁' : 'years'}
              </span>
            </div>
          </div>

          {/* Gender Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {isZh ? '性别' : 'Gender'}
            </label>
            <div className="segmented-control">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`segmented-item ${gender === 'male' ? 'active' : ''}`}
              >
                👨 {isZh ? '男' : 'Male'}
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`segmented-item ${gender === 'female' ? 'active' : ''}`}
              >
                👩 {isZh ? '女' : 'Female'}
              </button>
              <button
                type="button"
                onClick={() => setGender('other')}
                className={`segmented-item ${gender === 'other' ? 'active' : ''}`}
              >
                🧑 {isZh ? '其他' : 'Other'}
              </button>
            </div>
          </div>

          {/* Height Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {isZh ? '身高 (可选)' : 'Height (optional)'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-lg">📏</span>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="input !pl-14"
                placeholder={isZh ? '输入您的身高' : 'Enter your height'}
                step="0.1"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm">cm</span>
            </div>
          </div>

          {/* Weight Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {isZh ? '体重 (可选)' : 'Weight (optional)'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-lg">⚖️</span>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="input !pl-14"
                placeholder={isZh ? '输入您的体重' : 'Enter your weight'}
                step="0.1"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-sm">kg</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-4 text-base"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {isZh ? '保存中...' : 'Saving...'}
              </span>
            ) : (
              isZh ? '开始使用' : 'Get Started'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
