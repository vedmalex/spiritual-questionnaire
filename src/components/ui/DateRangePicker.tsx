import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { enUS, ru } from 'date-fns/locale';
import { t } from '../../utils/i18n';

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (nextRange: DateRange | undefined) => void;
  language: 'ru' | 'en';
}

function formatDate(date: Date, language: 'ru' | 'en'): string {
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU');
}

function formatRangeLabel(range: DateRange | undefined, language: 'ru' | 'en'): string {
  if (!range?.from && !range?.to) {
    return t('dashboard.analytics.filter.rangePlaceholder');
  }

  if (range?.from && range?.to) {
    return `${formatDate(range.from, language)} - ${formatDate(range.to, language)}`;
  }

  if (range?.from) {
    return `${formatDate(range.from, language)} - ...`;
  }

  if (range?.to) {
    return `${formatDate(range.to, language)} - ...`;
  }

  return t('dashboard.analytics.filter.rangePlaceholder');
}

export function DateRangePicker({ value, onChange, language }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const locale = language === 'en' ? enUS : ru;

  const label = useMemo(() => formatRangeLabel(value, language), [language, value]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }

      if (event.target instanceof Node && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', onPointerDown);
    }

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-left text-gray-800 dark:text-gray-200 flex items-center justify-between gap-2"
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
          <span className={`truncate ${!value?.from && !value?.to ? 'text-gray-500 dark:text-gray-400' : ''}`}>
            {label}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-[20rem] sm:w-[22rem] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-3">
          <DayPicker
            mode="range"
            locale={locale}
            selected={value}
            onSelect={onChange}
            showOutsideDays
            classNames={{
              root: 'w-full',
              month: 'space-y-2',
              month_caption: 'relative flex items-center justify-center h-8',
              caption_label: 'text-sm font-medium text-gray-900 dark:text-gray-100 capitalize',
              nav: 'mb-1 flex items-center justify-between',
              button_previous:
                'h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
              button_next:
                'h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
              chevron: 'w-4 h-4',
              weekdays: 'grid grid-cols-7 mt-2',
              weekday:
                'text-center text-[11px] font-medium text-gray-500 dark:text-gray-400',
              weeks: 'mt-1 space-y-1',
              week: 'grid grid-cols-7',
              day: 'text-center',
              day_button:
                'h-8 w-8 rounded-md text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
              outside: 'text-gray-400 dark:text-gray-500',
              today: 'ring-1 ring-primary-500',
              selected: 'bg-primary-600 text-white hover:bg-primary-600',
              range_start: 'bg-primary-600 text-white rounded-l-md',
              range_end: 'bg-primary-600 text-white rounded-r-md',
              range_middle:
                'bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100 rounded-none',
              disabled: 'opacity-35',
            }}
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-3 h-3" />
              {t('dashboard.analytics.filter.clear')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 py-1 text-xs rounded-md bg-primary-600 text-white hover:bg-primary-700"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
