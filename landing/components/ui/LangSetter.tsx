'use client';

import { useEffect } from 'react';

interface LangSetterProps {
  lang: string;
}

export function LangSetter({ lang }: LangSetterProps) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
