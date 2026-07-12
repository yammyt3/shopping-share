import {
  Apple, Beef, Blend, BottleWine, Box, Candy, Carrot, Citrus,
  CookingPot, Croissant, CupSoda, Fish, IceCreamBowl, Milk, Package,
  PackageOpen, PawPrint, ShoppingBasket, Snowflake, Sparkles, SprayCan,
  StickyNote, Wheat,
} from "lucide-react";

const categoryIcons = {
  vegetables: Carrot, fruit: Apple, meat: Beef, fish: Fish, dairy: Milk,
  bread: Croissant, staples: Wheat, frozen: Snowflake, processed: Package,
  seasoning: BottleWine, snacks: Candy, drinks: CupSoda, daily: SprayCan,
  basket: ShoppingBasket, pet: PawPrint, kitchen: CookingPot, bakery: Croissant,
  citrus: Citrus, icecream: IceCreamBowl, box: Box, open: PackageOpen,
  blend: Blend, sparkle: Sparkles,
  note: StickyNote,
} as const;

const legacyIcons: Record<string, keyof typeof categoryIcons> = {
  "🥬": "vegetables", "🍎": "fruit", "🥩": "meat", "🐟": "fish",
  "🥛": "dairy", "🍞": "bread", "🍜": "staples", "🧊": "frozen",
  "🥫": "processed", "🧂": "seasoning", "🍪": "snacks", "🧃": "drinks",
  "🧻": "daily", "🛒": "basket",
};

export const iconChoices = ["basket", "pet", "kitchen", "sparkle", "box", "blend"] as const;

export function CategoryIcon({ name, size = 26, strokeWidth = 1.8 }: { name: string; size?: number; strokeWidth?: number }) {
  const key = (legacyIcons[name] ?? name) as keyof typeof categoryIcons;
  const Icon = categoryIcons[key] ?? ShoppingBasket;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}
