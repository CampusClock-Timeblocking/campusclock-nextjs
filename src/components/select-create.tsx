"use client";
import React, { useState, useRef } from "react";
import { Check, MoreHorizontal, Plus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface BaseOption {
  value: string;
  label: string;
}

export interface Option extends BaseOption {
  customDisplay?: React.ReactNode;
}

// Conditional Types for better type safety
type SelectValue<T extends boolean> = T extends true ? string[] : string | null;
type OnChangeHandler<T extends boolean> = (selected: SelectValue<T>) => void;

// Base interface for common props
interface BaseSelectCommandProps {
  options: Option[];
  onCreate?: (input: string) => void;
  setOpen?: (open: boolean) => void;
  onDelete?: (option: Option) => void;
  onMore?: (option: Option) => void;
  className?: string;
  texts?: Texts;
}

interface MultiSelectProps extends BaseSelectCommandProps {
  multi: true;
  value: string[];
  onChange: OnChangeHandler<true>;
}

interface SingleSelectProps extends BaseSelectCommandProps {
  multi: false;
  value: string | null;
  onChange: OnChangeHandler<false>;
}

interface Texts {
  inputPlaceholder?: string;
  optionsHeading?: string;
  createHeading?: string;
  createPrefix?: string;
}

type SelectCommandProps = MultiSelectProps | SingleSelectProps;

export default function SelectCreate(props: SelectCommandProps) {
  const {
    options = [],
    value,
    onChange,
    onCreate,
    multi,
    setOpen,
    onMore,
    className,
    texts,
  } = props;

  const [searchValue, setSearchValue] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const exactMatch = filteredOptions.some(
    (option) => option.label.toLowerCase() === searchValue.toLowerCase(),
  );

  const showCreateOption = searchValue.trim() && !exactMatch && onCreate;

  const isSelected = (optionValue: string): boolean => {
    if (multi) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  const handleSelect = (optionValue: string) => {
    if (multi) {
      const currentSelected = value;
      const isCurrentlySelected = currentSelected.includes(optionValue);

      if (isCurrentlySelected) {
        onChange(currentSelected.filter((v) => v !== optionValue));
      } else {
        onChange([...currentSelected, optionValue]);
      }
    } else {
      const isCurrentlySelected = value === optionValue;

      if (isCurrentlySelected) {
        onChange(null);
      } else {
        onChange(optionValue);
        setOpen?.(false);
      }
    }
  };

  // Handle Create New Option
  const handleCreate = () => {
    if (onCreate && searchValue.trim()) {
      onCreate(searchValue.trim());
      setSearchValue("");
    }
  };

  const CommandContent = (
    <CommandList className="select-none">
      {/* Existing options */}
      {filteredOptions.length > 0 && (
        <CommandGroup heading={texts?.optionsHeading}>
          {filteredOptions.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              onSelect={() => handleSelect(option.value)}
              className="group cursor-pointer py-0 pr-0.5"
            >
              <div className="flex w-full items-center">
                <div className="min-w-0 flex-1 py-1.5 pr-2">
                  {option.customDisplay ?? (
                    <span className="truncate">{option.label}</span>
                  )}
                </div>
                {/* Check icon - starts at far right, moves left when menu appears */}
                {isSelected(option.value) && (
                  <Check className="absolute right-0 m-1.5 h-4 w-4 text-green-600 transition-transform duration-100 group-data-[selected=true]:-translate-x-6" />
                )}
                {onMore && (
                  <button
                    className={cn(
                      "hover:bg-accent hover:text-accent-foreground inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md",
                      "hover:bg-accent-nested hover:text-accent-nested-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100",
                      className,
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMore(option);
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {/* Create New Option */}
      {showCreateOption && (
        <CommandGroup heading={texts?.createHeading}>
          <CommandItem
            value={`create-${searchValue}`}
            onSelect={handleCreate}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {texts?.createPrefix} {`"${searchValue}"`}
          </CommandItem>
        </CommandGroup>
      )}

      {/* No results */}
      {filteredOptions.length === 0 && !showCreateOption && (
        <CommandEmpty>No results found.</CommandEmpty>
      )}
    </CommandList>
  );

  return (
    <Command className={className} shouldFilter={false}>
      <CommandInput
        ref={commandInputRef}
        placeholder={texts?.inputPlaceholder ?? "Search or create"}
        value={searchValue}
        onValueChange={setSearchValue}
      />
      {CommandContent}
    </Command>
  );
}
