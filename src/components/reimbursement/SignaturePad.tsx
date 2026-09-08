import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

export default function SignaturePad({ onChange, disabled, initialValue = '' }: { initialValue?: string; onChange: (value: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    if (!initialValue) return;
    const img = new Image(); img.onload = () => { ref.current?.getContext('2d')?.drawImage(img, 0, 0, 1000, 240); setSigned(true); }; img.src = initialValue;
    return () => { img.onload = null; };
    // Restore only on mount; drawing and clearing are managed by the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return [(event.clientX - bounds.left) * 1000 / bounds.width, (event.clientY - bounds.top) * 240 / bounds.height];
  };
  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.preventDefault();
    const ctx = ref.current!.getContext('2d')!;
    const [x, y] = point(event);
    ctx.strokeStyle = '#172554'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
    drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); setSigned(true);
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const ctx = ref.current!.getContext('2d')!; const [x, y] = point(event); ctx.lineTo(x, y); ctx.stroke();
  }
  function end() { if (drawing.current) { drawing.current = false; onChange(ref.current!.toDataURL('image/png')); } }
  return <div className="space-y-3">
    <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
      {!signed && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Draw your signature here</span>}
      <canvas ref={ref} width={1000} height={240} className="block w-full h-40 touch-none" aria-label="Participant signature: draw with a mouse or touch" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />
    </div>
    <div className="flex items-center justify-between gap-4"><p className="text-xs text-muted-foreground">Use your mouse, finger, or stylus.</p><Button type="button" variant="ghost" size="sm" disabled={disabled || !signed} onClick={() => { ref.current!.getContext('2d')!.clearRect(0, 0, 1000, 240); setSigned(false); onChange(''); }}><Eraser className="w-4 h-4 mr-2" />Clear signature</Button></div>
  </div>;
}
