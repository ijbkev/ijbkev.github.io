import 'react';
declare module 'react' {
  // Preserve the existing homepage's video priority hint with React 18 types.
  interface VideoHTMLAttributes<T> { fetchPriority?: 'high' | 'low' | 'auto' }
}
