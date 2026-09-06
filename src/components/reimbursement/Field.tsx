import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function Field({ label, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{label}{props.required && <span aria-hidden="true"> *</span>}</label><Input id={id} {...props} /></div>;
}
export function SelectField({ label, id, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string; children: ReactNode }) {
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{label}{props.required && <span aria-hidden="true"> *</span>}</label><select id={id} {...props} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{children}</select></div>;
}
export function AddressField({ label, id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string }) {
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{label}{props.required && <span aria-hidden="true"> *</span>}</label><Textarea id={id} {...props} /></div>;
}
