"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FILTER_ALL,
  formatFilterOption,
  type FilterOption,
} from "@/lib/corpus/filters";

type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onValueChange: (value: string) => void;
  allLabel?: string;
  displayValue?: string;
  labelClassName?: string;
  wrapperClassName?: string;
  triggerClassName?: string;
};

/** Corpus filter field: a label plus the shared shadcn select contract. */
export function FilterSelect({
  id,
  label,
  value,
  options,
  onValueChange,
  allLabel = "Tout afficher",
  displayValue,
  labelClassName,
  wrapperClassName,
  triggerClassName,
}: FilterSelectProps) {
  return (
    <div className={wrapperClassName}>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <Select
        value={value || FILTER_ALL}
        onValueChange={(next) => next && onValueChange(next)}
      >
        <SelectTrigger id={id} className={triggerClassName}>
          {displayValue === undefined ? (
            <SelectValue />
          ) : (
            <SelectValue>{displayValue}</SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem value={option.value} key={option.value}>
              {formatFilterOption(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
