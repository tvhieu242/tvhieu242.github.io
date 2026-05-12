const STEPS = ['API keys', 'Catalogs', 'Options', 'Migrate'];

interface StepperProps {
  current: number;
  onStepClick?: (index: number) => void;
}

export function Stepper({ current, onStepClick }: StepperProps) {
  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <button
            key={label}
            type="button"
            disabled={!onStepClick || i > current}
            onClick={() => onStepClick?.(i)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-sky-600 text-white shadow-sm'
                : done
                  ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                  : 'bg-slate-100 text-slate-500'
            } ${onStepClick && i <= current ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                active ? 'bg-white/20 text-white' : done ? 'bg-sky-600 text-white' : 'bg-slate-300 text-slate-600'
              }`}
            >
              {i + 1}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
