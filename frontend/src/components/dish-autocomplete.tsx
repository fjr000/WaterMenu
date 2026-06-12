import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { MealType } from "../api/types.ts";
import { useDishes, useCreateDish } from "../hooks/use-dishes.ts";
import { mealTypeOptions } from "./meal-tag.tsx";
import { Button, SecondaryButton } from "./ui.tsx";

interface DishAutocompleteProps {
  value: string | null;
  onChange: (dishId: string) => void;
  error?: string;
}

export function DishAutocomplete({ value, onChange, error }: DishAutocompleteProps) {
  const dishesQuery = useDishes({ isActive: true });
  const dishes = dishesQuery.data ?? [];
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>(["LUNCH", "DINNER"]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const createDish = useCreateDish();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDish = dishes.find((d) => d.id === value);

  // Fuzzy search using fuse.js
  const fuse = useMemo(() => {
    return new Fuse(dishes, {
      keys: ["name"],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    if (!searchTerm.trim()) return dishes;

    const results = fuse.search(searchTerm);
    return results.map((result) => result.item);
  }, [dishes, fuse, searchTerm]);

  const showCreateOption = searchTerm.trim() && filteredDishes.length === 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateDish = () => {
    const trimmedName = searchTerm.trim();
    if (!trimmedName) return;

    createDish.mutate(
      {
        name: trimmedName,
        mealTypes: selectedMealTypes,
        isActive: true,
      },
      {
        onSuccess: (newDish) => {
          onChange(newDish.id);
          setSearchTerm("");
          setIsOpen(false);
          setShowCreateForm(false);
          setSelectedMealTypes(["LUNCH", "DINNER"]);
        },
      }
    );
  };

  const toggleMealType = (mealType: MealType) => {
    setSelectedMealTypes((prev) =>
      prev.includes(mealType)
        ? prev.filter((mt) => mt !== mealType)
        : [...prev, mealType]
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredDishes.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredDishes.length) {
          const dish = filteredDishes[focusedIndex];
          onChange(dish.id);
          setSearchTerm("");
          setIsOpen(false);
          setFocusedIndex(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setShowCreateForm(false);
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls="dish-list"
        className="w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-inner placeholder-slate-400 outline-none transition-all duration-200 focus:border-red-400 focus:ring-2 focus:ring-red-500/25 hover:border-slate-400"
        placeholder="搜索菜品名称..."
        value={selectedDish ? selectedDish.name : searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          setFocusedIndex(-1);
          if (selectedDish) {
            onChange("");
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {isOpen && (
        <div
          ref={dropdownRef}
          id="dish-list"
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_12px_28px_rgba(111,82,56,0.10)] backdrop-blur-sm"
        >
          {filteredDishes.length > 0 && (
            <ul className="py-1">
              {filteredDishes.map((dish, index) => (
                <li key={dish.id} role="option" aria-selected={value === dish.id}>
                  <button
                    type="button"
                    className={`w-full px-4 py-2.5 text-left text-sm text-slate-900 transition ${
                      focusedIndex === index ? "bg-amber-100" : "hover:bg-amber-50"
                    }`}
                    onClick={() => {
                      onChange(dish.id);
                      setSearchTerm("");
                      setIsOpen(false);
                      setFocusedIndex(-1);
                    }}
                  >
                    {dish.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showCreateOption && !showCreateForm && (
            <button
              type="button"
              className="w-full bg-amber-100 px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-amber-200"
              onClick={() => setShowCreateForm(true)}
            >
              创建新菜品：{searchTerm.trim()}
            </button>
          )}

          {showCreateForm && (
            <div className="animate-slide-up border-t border-amber-200 bg-amber-50/55 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-700">选择餐次</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {mealTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleMealType(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedMealTypes.includes(option.value)
                        ? "border-red-600 bg-red-500 text-white"
                        : "border-slate-300 bg-white/85 text-slate-600 hover:border-red-200 hover:bg-red-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {createDish.isError && (
                <p className="mb-2 rounded-xl border border-red-200 bg-red-50 p-2 text-center text-xs text-red-700">
                  创建失败，请重试
                </p>
              )}

              <div className="flex gap-2">
                <SecondaryButton
                  type="button"
                  className="flex-1 px-3 py-1.5 text-xs"
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedMealTypes(["LUNCH", "DINNER"]);
                  }}
                  disabled={createDish.isPending}
                >
                  取消
                </SecondaryButton>
                <Button
                  type="button"
                  className="flex-1 px-3 py-1.5 text-xs"
                  onClick={handleCreateDish}
                  disabled={createDish.isPending || selectedMealTypes.length === 0}
                >
                  {createDish.isPending ? "创建中…" : "确认创建"}
                </Button>
              </div>
            </div>
          )}

          {!showCreateForm && filteredDishes.length === 0 && !showCreateOption && (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              没有找到菜品
            </div>
          )}
        </div>
      )}
    </div>
  );
}
