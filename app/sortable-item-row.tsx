"use client";
import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Minus, Plus } from "lucide-react";
type SortableItem = {
  id: string;
  name: string;
  selected: boolean;
  quantity?: number;
};
export function SortableItemRow({
  item,
  onToggle,
  onQuantity,
}: {
  item: SortableItem;
  onToggle: () => void;
  onQuantity: (quantity: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 3 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`item-row sortable-row ${item.selected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
    >
      <span className="drag-handle" aria-hidden="true">
        <GripVertical />
      </span>
      <button
        className="item-toggle"
        onClick={onToggle}
        aria-pressed={item.selected}
      >
        <span>{item.name}</span>
        <span className="check">
          <Check />
        </span>
      </button>
      {item.selected && (
        <div className="quantity-control" aria-label={`${item.name}の個数`}>
          <button
            onClick={() => onQuantity((item.quantity ?? 1) - 1)}
            disabled={(item.quantity ?? 1) <= 1}
            aria-label="1個減らす"
          >
            <Minus />
          </button>
          <strong>{item.quantity ?? 1}</strong>
          <button
            onClick={() => onQuantity((item.quantity ?? 1) + 1)}
            aria-label="1個増やす"
          >
            <Plus />
          </button>
        </div>
      )}
    </div>
  );
}
