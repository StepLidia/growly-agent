import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus } from 'lucide-react';
import { buttonClasses } from '../constants/buttonStyles';

type PlanOption = { id: string; name: string };

export function PlanSelector({
  plans,
  activePlanId,
  onPlanChange,
  onCreatePlan,
  onRenamePlan,
}: {
  plans: PlanOption[];
  activePlanId: string;
  onPlanChange: (id: string) => void;
  onCreatePlan?: () => void;
  onRenamePlan?: (id: string, name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const activePlan = plans.find(({ id }) => id === activePlanId) ?? plans[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [isOpen]);

  function saveName() {
    if (onRenamePlan && editingId && draftName.trim()) {
      onRenamePlan(editingId, draftName);
      triggerRef.current?.focus();
      setEditingId(null);
    }
  }

  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      {onCreatePlan && <button
        aria-label="Create a new plan"
        className={buttonClasses({ size: 'icon', className: 'shrink-0' })}
        type="button"
        onClick={onCreatePlan}
      >
        <Plus className="h-4 w-4" />
      </button>}
      <div
        className="relative min-w-0"
        ref={containerRef}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            if (editingId) {
              triggerRef.current?.focus();
              setEditingId(null);
            } else {
              setIsOpen(false);
              triggerRef.current?.focus();
            }
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsOpen(false);
            setEditingId(null);
          }
        }}
      >
        <button
          ref={triggerRef}
          className={buttonClasses({ className: 'max-w-full whitespace-nowrap' })}
          aria-label={`Select plan: ${activePlan.name}`}
          aria-controls="details-plan-picker"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          type="button"
          onClick={() => {
            setIsOpen((open) => !open);
            setEditingId(null);
          }}
        >
          <span className="grid min-w-0 font-normal">
            {plans.map((plan) => (
              <span key={plan.id} aria-hidden="true" className="invisible col-start-1 row-start-1 truncate">
                {plan.name}
              </span>
            ))}
            <span className="col-start-1 row-start-1 truncate">{activePlan.name}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div
            id="details-plan-picker"
            role="dialog"
            aria-label="Plans"
            className="absolute left-0 top-12 z-40 max-h-80 min-w-full w-max overflow-y-auto rounded-lg border border-slate-300/30 bg-white/95 p-2 text-sm font-medium text-slate-700 shadow-xl shadow-slate-400/20 backdrop-blur-xl"
          >
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center gap-1">
                {editingId === plan.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-1 py-1"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveName();
                    }}
                  >
                    <input
                      autoFocus
                      aria-label={`Name for ${plan.name}`}
                      className="glass-input min-w-0 flex-1 px-2 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                      maxLength={80}
                      size={1}
                      required
                      value={draftName}
                      onChange={(event) => setDraftName(event.currentTarget.value)}
                    />
                    <button
                      aria-label="Save plan name"
                      className={buttonClasses({ size: 'icon' })}
                      disabled={!draftName.trim()}
                      type="submit"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      aria-pressed={plan.id === activePlanId}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${plan.id === activePlanId ? 'bg-blue-50 text-blue-900' : ''}`}
                      type="button"
                      onClick={() => {
                        onPlanChange(plan.id);
                        setIsOpen(false);
                        triggerRef.current?.focus();
                      }}
                    >
                      <span className="min-w-0 flex-1 whitespace-nowrap" title={plan.name}>{plan.name}</span>
                      {plan.id === activePlanId && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                    {onRenamePlan && <button
                      aria-label={`Rename ${plan.name}`}
                      className="rounded-md p-2 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                      type="button"
                      onClick={() => {
                        setEditingId(plan.id);
                        setDraftName(plan.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
