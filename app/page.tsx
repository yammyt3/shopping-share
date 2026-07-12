"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Fuse from "fuse.js";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  ListChecks,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShoppingBag,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { CategoryIcon, iconChoices } from "./category-icons";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItemRow } from "./sortable-item-row";

type Item = { id: string; name: string; selected: boolean; quantity?: number };
type TemporaryItem = { id: string; name: string; quantity: number };
type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  items: Item[];
};
type HistoryItem = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  icon: string;
  lastSelectedAt: string;
  selectionCount: number;
  recentSelectedAt: string[];
};

type SearchableItem = {
  itemId: string;
  categoryId: string;
  categoryName: string;
  icon: string;
  name: string;
  normalizedName: string;
  selected: boolean;
};

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[ァ-ヶ]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0x60),
    );

const getHistoryScore = (item: HistoryItem, referenceTime: number) => {
  const ageInDays = Math.max(
    0,
    (referenceTime - new Date(item.lastSelectedAt).getTime()) / 86_400_000,
  );
  return Math.log2(item.selectionCount + 1) * 10 + 18 / (1 + ageInDays / 14);
};

const initialCategories: Category[] = [
  {
    id: "vegetables",
    name: "野菜",
    icon: "🥬",
    color: "#E7F0D9",
    items: [
      "キャベツ",
      "レタス",
      "トマト",
      "きゅうり",
      "玉ねぎ",
      "にんじん",
      "じゃがいも",
      "長ねぎ",
      "大根",
      "ほうれん草",
      "小松菜",
      "ブロッコリー",
      "ピーマン",
      "なす",
      "きのこ",
    ].map((name, i) => ({ id: `v${i}`, name, selected: i === 1 || i === 3 })),
  },
  {
    id: "fruit",
    name: "果物",
    icon: "🍎",
    color: "#F8E1D7",
    items: [
      "りんご",
      "バナナ",
      "みかん",
      "キウイ",
      "いちご",
      "ぶどう",
      "桃",
      "梨",
      "柿",
      "レモン",
      "オレンジ",
      "グレープフルーツ",
      "パイナップル",
      "メロン",
      "アボカド",
    ].map((name, i) => ({ id: `f${i}`, name, selected: false })),
  },
  {
    id: "meat",
    name: "お肉",
    icon: "🥩",
    color: "#F3DCD7",
    items: [
      "鶏もも肉",
      "豚こま肉",
      "ひき肉",
      "ウインナー",
      "鶏むね肉",
      "ささみ",
      "手羽先",
      "豚バラ肉",
      "豚ロース",
      "牛こま肉",
      "牛ステーキ肉",
      "合いびき肉",
      "ベーコン",
      "ハム",
      "焼豚",
    ].map((name, i) => ({ id: `m${i}`, name, selected: i === 0 })),
  },
  {
    id: "fish",
    name: "お魚",
    icon: "🐟",
    color: "#DCECEF",
    items: [
      "鮭",
      "さば",
      "刺身",
      "しらす",
      "あじ",
      "ぶり",
      "まぐろ",
      "かつお",
      "たら",
      "さんま",
      "いわし",
      "えび",
      "いか",
      "たこ",
      "魚の干物",
    ].map((name, i) => ({ id: `s${i}`, name, selected: false })),
  },
  {
    id: "dairy",
    name: "卵・乳製品",
    icon: "🥛",
    color: "#F5EACB",
    items: [
      "卵",
      "牛乳",
      "ヨーグルト",
      "チーズ",
      "バター",
      "生クリーム",
      "豆乳",
      "低脂肪乳",
      "飲むヨーグルト",
      "スライスチーズ",
      "粉チーズ",
      "クリームチーズ",
      "モッツァレラチーズ",
      "マーガリン",
      "プリン",
    ].map((name, i) => ({ id: `d${i}`, name, selected: i === 1 || i === 2 })),
  },
  {
    id: "bread",
    name: "パン",
    icon: "🍞",
    color: "#EFE0C9",
    items: [
      "食パン",
      "ロールパン",
      "菓子パン",
      "フランスパン",
      "クロワッサン",
      "ベーグル",
      "バターロール",
      "イングリッシュマフィン",
      "サンドイッチ",
      "総菜パン",
      "蒸しパン",
      "ホットドッグ用パン",
      "ハンバーガーバンズ",
      "ピザ",
      "パン粉",
    ].map((name, i) => ({ id: `b${i}`, name, selected: false })),
  },
  {
    id: "staples",
    name: "麺・ご飯",
    icon: "🍜",
    color: "#F1E5D1",
    items: [
      "うどん",
      "パスタ",
      "焼きそば",
      "お米",
      "そば",
      "そうめん",
      "中華麺",
      "ラーメン",
      "冷やし中華",
      "ビーフン",
      "春雨",
      "もち",
      "玄米",
      "パックご飯",
      "シリアル",
    ].map((name, i) => ({ id: `n${i}`, name, selected: false })),
  },
  {
    id: "frozen",
    name: "冷凍食品",
    icon: "🧊",
    color: "#DDEBF2",
    items: [
      "冷凍餃子",
      "冷凍うどん",
      "アイス",
      "冷凍チャーハン",
      "冷凍パスタ",
      "冷凍ピラフ",
      "冷凍たこ焼き",
      "冷凍お好み焼き",
      "冷凍野菜",
      "冷凍フルーツ",
      "冷凍ポテト",
      "冷凍からあげ",
      "冷凍コロッケ",
      "冷凍グラタン",
      "冷凍弁当おかず",
    ].map((name, i) => ({ id: `z${i}`, name, selected: false })),
  },
  {
    id: "processed",
    name: "加工食品",
    icon: "🥫",
    color: "#E9E2D2",
    items: [
      "豆腐",
      "納豆",
      "缶詰",
      "ハム",
      "油揚げ",
      "厚揚げ",
      "こんにゃく",
      "ちくわ",
      "かまぼこ",
      "さつま揚げ",
      "漬物",
      "キムチ",
      "レトルトカレー",
      "インスタントスープ",
      "シーチキン",
    ].map((name, i) => ({ id: `p${i}`, name, selected: false })),
  },
  {
    id: "seasoning",
    name: "調味料",
    icon: "🧂",
    color: "#E9E5D8",
    items: [
      "しょうゆ",
      "みそ",
      "塩",
      "砂糖",
      "マヨネーズ",
      "ケチャップ",
      "酢",
      "みりん",
      "料理酒",
      "サラダ油",
      "ごま油",
      "めんつゆ",
      "だしの素",
      "こしょう",
      "ドレッシング",
    ].map((name, i) => ({ id: `c${i}`, name, selected: false })),
  },
  {
    id: "snacks",
    name: "お菓子",
    icon: "🍪",
    color: "#F2DFCE",
    items: [
      "チョコレート",
      "ポテトチップス",
      "せんべい",
      "クッキー",
      "ビスケット",
      "キャンディ",
      "グミ",
      "ガム",
      "アイスクリーム",
      "プリン",
      "ゼリー",
      "シュークリーム",
      "和菓子",
      "ナッツ",
      "ドライフルーツ",
    ].map((name, i) => ({ id: `o${i}`, name, selected: false })),
  },
  {
    id: "drinks",
    name: "飲み物",
    icon: "🧃",
    color: "#DDEADB",
    items: [
      "お茶",
      "コーヒー",
      "ジュース",
      "炭酸水",
      "水",
      "紅茶",
      "麦茶",
      "牛乳",
      "豆乳",
      "スポーツドリンク",
      "野菜ジュース",
      "炭酸飲料",
      "栄養ドリンク",
      "ビール",
      "ワイン",
    ].map((name, i) => ({ id: `r${i}`, name, selected: false })),
  },
  {
    id: "daily",
    name: "日用品",
    icon: "🧻",
    color: "#E4E1EE",
    items: [
      "ティッシュ",
      "キッチンペーパー",
      "洗剤",
      "ゴミ袋",
      "トイレットペーパー",
      "ラップ",
      "アルミホイル",
      "食器用洗剤",
      "スポンジ",
      "ハンドソープ",
      "シャンプー",
      "ボディソープ",
      "歯みがき粉",
      "電池",
      "除菌シート",
    ].map((name, i) => ({ id: `h${i}`, name, selected: i === 1 })),
  },
];

export default function Home() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<"select" | "list">("select");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [temporaryItems, setTemporaryItems] = useState<TemporaryItem[]>([]);
  const [quickInput, setQuickInput] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [undo, setUndo] = useState<{
    categories: Category[];
    temporaryItems: TemporaryItem[];
  } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [sharing, setSharing] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("basket");
  const quickInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );

  useEffect(() => {
    const savedCategories = localStorage.getItem("kago-categories");
    if (savedCategories)
      try {
        const stored = JSON.parse(savedCategories) as Category[];
        // Hydrate browser-only persisted data after the client mounts.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCategories(
          stored.map((category) => {
            const defaults = initialCategories.find(
              (item) => item.id === category.id,
            );
            if (!defaults) return category;
            const existingNames = new Set(
              category.items.map((item) => item.name),
            );
            return {
              ...category,
              items: [
                ...category.items,
                ...defaults.items.filter(
                  (item) => !existingNames.has(item.name),
                ),
              ],
            };
          }),
        );
      } catch {
        /* use defaults */
      }
    const savedHistory = localStorage.getItem("kago-item-history");
    if (savedHistory)
      try {
        setHistory(
          (JSON.parse(savedHistory) as Partial<HistoryItem>[]).map((item) => ({
            id: item.id ?? crypto.randomUUID(),
            name: item.name ?? "",
            categoryId: item.categoryId ?? "",
            categoryName: item.categoryName ?? "",
            icon: item.icon ?? "basket",
            lastSelectedAt: item.lastSelectedAt ?? new Date(0).toISOString(),
            selectionCount: Math.max(1, item.selectionCount ?? 1),
            recentSelectedAt: item.recentSelectedAt?.slice(0, 5) ??
              (item.lastSelectedAt ? [item.lastSelectedAt] : []),
          })),
        );
      } catch {
        /* empty history */
      }
    const savedTemporaryItems = localStorage.getItem("kago-temporary-items");
    if (savedTemporaryItems)
      try {
        setTemporaryItems(
          (JSON.parse(savedTemporaryItems) as TemporaryItem[]).map((item) => ({
            ...item,
            quantity: Math.max(1, Math.min(99, item.quantity ?? 1)),
          })),
        );
      } catch {
        /* empty temporary items */
      }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated)
      localStorage.setItem("kago-categories", JSON.stringify(categories));
  }, [categories, hydrated]);
  useEffect(() => {
    if (hydrated)
      localStorage.setItem("kago-item-history", JSON.stringify(history));
  }, [history, hydrated]);
  useEffect(() => {
    if (hydrated)
      localStorage.setItem(
        "kago-temporary-items",
        JSON.stringify(temporaryItems),
      );
  }, [temporaryItems, hydrated]);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(timer);
  }, [undo]);
  useEffect(() => {
    if (!activeId) return;
    const closeOnOutsideTap = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (
        !event.target.closest(".inline-category-panel") &&
        !event.target.closest(".category-card")
      ) {
        setActiveId(null);
        setAdding(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideTap);
    return () => document.removeEventListener("pointerdown", closeOnOutsideTap);
  }, [activeId]);

  const active = categories.find((c) => c.id === activeId);
  const selectedGroups = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, items: c.items.filter((i) => i.selected) }))
        .filter((c) => c.items.length),
    [categories],
  );
  const count =
    selectedGroups.reduce((sum, c) => sum + c.items.length, 0) +
    temporaryItems.length;
  const searchableItems = useMemo<SearchableItem[]>(
    () =>
      categories.flatMap((category) =>
        category.items.map((item) => ({
          itemId: item.id,
          categoryId: category.id,
          categoryName: category.name,
          icon: category.icon,
          name: item.name,
          normalizedName: normalizeSearchText(item.name),
          selected: item.selected,
        })),
      ),
    [categories],
  );
  const searchResults = useMemo(() => {
    const query = normalizeSearchText(quickInput.trim());
    if (!query) return [];
    const fuse = new Fuse(searchableItems, {
      keys: ["normalizedName"],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
    });
    return fuse
      .search(query)
      .map(({ item, score }) => ({
        item,
        score: score ?? 1,
        matchRank:
          item.normalizedName === query
            ? 0
            : item.normalizedName.startsWith(query)
              ? 1
              : item.normalizedName.includes(query)
                ? 2
                : 3,
      }))
      .sort(
        (a, b) =>
          Number(a.item.selected) - Number(b.item.selected) ||
          a.matchRank - b.matchRank ||
          a.score - b.score,
      )
      .slice(0, 5)
      .map(({ item }) => item);
  }, [quickInput, searchableItems]);
  const temporaryDuplicate = temporaryItems.some(
    (item) =>
      normalizeSearchText(item.name) === normalizeSearchText(quickInput.trim()),
  );
  const historyReferenceTime = history.reduce(
    (latest, item) => Math.max(latest, new Date(item.lastSelectedAt).getTime()),
    0,
  );
  const rankedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          getHistoryScore(b, historyReferenceTime) -
          getHistoryScore(a, historyReferenceTime),
      ),
    [history, historyReferenceTime],
  );
  const frequentItems = rankedHistory.slice(0, 8);
  const activeHistory = useMemo(
    () => new Map(history.map((item) => [`${item.categoryId}:${item.id}`, item])),
    [history],
  );
  const orderedActiveItems = useMemo(
    () =>
      active
        ? [...active.items].sort((a, b) => {
            const aHistory = activeHistory.get(`${active.id}:${a.id}`);
            const bHistory = activeHistory.get(`${active.id}:${b.id}`);
            return (bHistory ? getHistoryScore(bHistory, historyReferenceTime) : 0) -
              (aHistory ? getHistoryScore(aHistory, historyReferenceTime) : 0);
          })
        : [],
    [active, activeHistory, historyReferenceTime],
  );

  const rememberItem = (category: Category, item: Item) =>
    setHistory((current) => {
      const now = new Date().toISOString();
      const previous = current.find(
        (past) => past.categoryId === category.id && past.id === item.id,
      );
      return [
        {
          id: item.id,
          name: item.name,
          categoryId: category.id,
          categoryName: category.name,
          icon: category.icon,
          lastSelectedAt: now,
          selectionCount: (previous?.selectionCount ?? 0) + 1,
          recentSelectedAt: [now, ...(previous?.recentSelectedAt ?? [])].slice(0, 5),
        },
        ...current.filter(
          (past) => !(past.categoryId === category.id && past.id === item.id),
        ),
      ];
    });
  const toggle = (categoryId: string, itemId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    const item = category?.items.find((i) => i.id === itemId);
    if (category && item && !item.selected) rememberItem(category, item);
    setCategories((cs) =>
      cs.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, selected: !i.selected } : i,
              ),
            }
          : c,
      ),
    );
  };
  const clearAll = () => {
    if (!count) return;
    setUndo({ categories, temporaryItems });
    setCategories((cs) =>
      cs.map((c) => ({
        ...c,
        items: c.items.map((i) => ({ ...i, selected: false })),
      })),
    );
    setTemporaryItems([]);
  };
  const setQuantity = (categoryId: string, itemId: string, quantity: number) =>
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId
                  ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) }
                  : item,
              ),
            }
          : category,
      ),
    );
  const setTemporaryQuantity = (itemId: string, quantity: number) =>
    setTemporaryItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) }
          : item,
      ),
    );
  const addTemporaryItem = () => {
    const name = quickInput.trim();
    if (!name) return;
    if (temporaryDuplicate) {
      showNotice("同じ今回限りアイテムがあります");
      return;
    }
    setTemporaryItems((current) => [
      ...current,
      { id: crypto.randomUUID(), name, quantity: 1 },
    ]);
    setQuickInput("");
    showNotice("今回限りアイテムを追加しました");
    requestAnimationFrame(() => quickInputRef.current?.focus());
  };
  const toggleFromSearch = (item: SearchableItem) => {
    toggle(item.categoryId, item.itemId);
    setQuickInput("");
    requestAnimationFrame(() => quickInputRef.current?.focus());
  };
  const reorderItems = ({ active: dragged, over }: DragEndEvent) => {
    if (!activeId || !over || dragged.id === over.id) return;
    setCategories((current) =>
      current.map((category) => {
        if (category.id !== activeId) return category;
        const from = category.items.findIndex((item) => item.id === dragged.id);
        const to = category.items.findIndex((item) => item.id === over.id);
        return from < 0 || to < 0
          ? category
          : { ...category, items: arrayMove(category.items, from, to) };
      }),
    );
  };
  const addItem = (event: FormEvent) => {
    event.preventDefault();
    const name = newItem.trim();
    if (!name || !activeId) return;
    const id = crypto.randomUUID();
    const category = categories.find((c) => c.id === activeId);
    if (category)
      rememberItem(category, { id, name, selected: true, quantity: 1 });
    setCategories((cs) =>
      cs.map((c) =>
        c.id === activeId
          ? {
              ...c,
              items: [...c.items, { id, name, selected: true, quantity: 1 }],
            }
          : c,
      ),
    );
    setNewItem("");
    setAdding(false);
  };
  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  };
  const addCategory = (event: FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    if (categories.some((category) => category.name === name)) {
      showNotice("同じ名前のカテゴリがあります");
      return;
    }
    const colors = ["#E1EADB", "#F1E0D2", "#DDE8EF", "#E8E0EE", "#F0E7CC"];
    const category: Category = {
      id: crypto.randomUUID(),
      name,
      icon: categoryIcon || "basket",
      color: colors[categories.length % colors.length],
      items: [],
    };
    setCategories((current) => [...current, category]);
    setCategoryName("");
    setCategoryIcon("basket");
    setCategoryOpen(false);
    setActiveId(category.id);
    showNotice("カテゴリを追加しました");
  };
  const toggleFromHistory = (past: HistoryItem) => {
    const category = categories.find((c) => c.id === past.categoryId);
    const existing = category?.items.find((item) => item.id === past.id);
    if (existing) toggle(past.categoryId, past.id);
    else {
      if (category)
        rememberItem(category, {
          id: past.id,
          name: past.name,
          selected: true,
          quantity: 1,
        });
      setCategories((current) =>
        current.map((c) =>
          c.id === past.categoryId
            ? {
                ...c,
                items: [
                  ...c.items,
                  { id: past.id, name: past.name, selected: true, quantity: 1 },
                ],
              }
            : c,
        ),
      );
    }
  };
  const shareList = async () => {
    if (!count || sharing) return;
    setSharing(true);
    const items = [
      ...selectedGroups.flatMap((category) =>
        category.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity ?? 1,
          category: category.name,
          icon: category.icon,
          color: category.color,
          checked: false,
        })),
      ),
      ...temporaryItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: "今回限り",
        icon: "note",
        color: "#EEE5D6",
        checked: false,
      })),
    ];
    const { data, error } = await supabase.rpc("create_shared_list", {
      p_items: items,
    });
    if (error || !data) {
      showNotice("共有リンクを作成できませんでした");
      setSharing(false);
      return;
    }
    const url = `${window.location.origin}/share/${data}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareOpen(false);
      showNotice("共有リンクをコピーしました");
    } catch {
      showNotice("リンクをコピーできませんでした");
    }
    setSharing(false);
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <ShoppingBag />
          </div>
          <div>
            <p className="eyebrow">SHARED SHOPPING LIST</p>
            <h1>お買い物メモ</h1>
          </div>
        </div>
        <div className="top-actions">
          <button
            className="share-trigger"
            onClick={() => setShareOpen(true)}
            aria-label="買い物リストを共有"
          >
            <Send />
            共有
          </button>
          <div className="header-count" aria-label={`選択商品 ${count}点`}>
            <strong>{count}</strong>
            <span>点</span>
          </div>
        </div>
      </header>
      {view === "select" ? (
        <>
          <section className="quick-add" aria-label="商品名からすぐ追加">
            <div className="quick-add-heading">
              <span>
                <Search />
              </span>
              <div>
                <h2>商品名からすぐ追加</h2>
                <p>買うものが決まっているときはこちら</p>
              </div>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                addTemporaryItem();
              }}
            >
              <Search aria-hidden="true" />
              <input
                ref={quickInputRef}
                value={quickInput}
                onChange={(event) => setQuickInput(event.target.value)}
                placeholder="商品名を入力"
                aria-label="商品を検索、または今回限りで追加"
                maxLength={40}
                autoComplete="off"
              />
              {quickInput && (
                <button
                  type="button"
                  className="quick-clear"
                  onClick={() => setQuickInput("")}
                  aria-label="入力を消去"
                >
                  <X />
                </button>
              )}
            </form>
            {quickInput.trim() && (
              <div className="quick-results" aria-label="検索候補">
                {searchResults.map((result) => (
                  <button
                    type="button"
                    key={`${result.categoryId}-${result.itemId}`}
                    className={result.selected ? "selected" : ""}
                    onClick={() => toggleFromSearch(result)}
                    aria-pressed={result.selected}
                  >
                    <span className="quick-result-icon">
                      <CategoryIcon name={result.icon} size={17} />
                    </span>
                    <span>
                      <strong>{result.name}</strong>
                      <small>{result.categoryName}</small>
                    </span>
                    <i>
                      <Check />
                    </i>
                  </button>
                ))}
                <button
                  type="button"
                  className="quick-create"
                  onClick={addTemporaryItem}
                  disabled={temporaryDuplicate}
                >
                  <span className="quick-result-icon">
                    <StickyNote />
                  </span>
                  <span>
                    <strong>
                      「{quickInput.trim()}」を
                      {temporaryDuplicate ? "追加済み" : "今回限りで追加"}
                    </strong>
                    <small>
                      {temporaryDuplicate
                        ? "同じ今回限りアイテムがあります"
                        : "カテゴリや履歴には残りません"}
                    </small>
                  </span>
                  <Plus />
                </button>
              </div>
            )}
            {temporaryItems.length > 0 && (
              <div className="temporary-items">
                <p>今回限り</p>
                {temporaryItems.map((item) => (
                  <div key={item.id}>
                    <StickyNote />
                    <strong>{item.name}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        setTemporaryItems((current) =>
                          current.filter((currentItem) => currentItem.id !== item.id),
                        )
                      }
                      aria-label={`${item.name}を削除`}
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          {frequentItems.length > 0 && (
            <section className="frequent-section" aria-labelledby="frequent-title">
              <div className="section-heading">
                <div>
                  <p>いつもの商品を1タップで</p>
                  <h2 id="frequent-title">よく買うもの</h2>
                </div>
                {history.length > frequentItems.length && (
                  <button type="button" onClick={() => setHistoryOpen(true)}>
                    すべて見る <ChevronRight />
                  </button>
                )}
              </div>
              <div className="frequent-grid">
                {frequentItems.map((past) => {
                  const selected = categories
                    .find((category) => category.id === past.categoryId)
                    ?.items.find((item) => item.id === past.id)?.selected ?? false;
                  return (
                    <button
                      type="button"
                      key={`${past.categoryId}-${past.id}`}
                      className={selected ? "selected" : ""}
                      onClick={() => toggleFromHistory(past)}
                      aria-pressed={selected}
                    >
                      <span><CategoryIcon name={past.icon} size={16} /></span>
                      <strong>{past.name}</strong>
                      <i>{selected ? <Check /> : <Plus />}</i>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <section className="browse-section" aria-labelledby="browse-title">
            <div className="section-heading browse-heading">
              <div>
                <p>一覧を見ながら思い出す</p>
                <h2 id="browse-title">見ながら選ぶ</h2>
              </div>
              <button
                type="button"
                className="clear-compact"
                onClick={clearAll}
                disabled={!count}
              >
                <RotateCcw /> すべて解除
              </button>
            </div>
              <section className="category-grid" aria-label="商品カテゴリー">
                {categories.map((c) => {
                  const n = c.items.filter((i) => i.selected).length;
                  const isActive = activeId === c.id;
                  return (
                    <button
                      key={c.id}
                      className={`category-card ${isActive ? "active" : ""}`}
                      style={{ background: c.color }}
                      onClick={() => {
                        setActiveId(isActive ? null : c.id);
                        setAdding(false);
                      }}
                      aria-expanded={isActive}
                    >
                      <span className="category-icon">
                        <CategoryIcon name={c.icon} />
                      </span>
                      <span className="category-name">{c.name}</span>
                      <span className="category-meta">
                        {n ? `${n}点 選択中` : `${c.items.length}品`}
                      </span>
                      {isActive ? (
                        <ChevronDown className="card-arrow" />
                      ) : (
                        <ChevronRight className="card-arrow" />
                      )}
                      {n > 0 && <span className="dot">{n}</span>}
                    </button>
                  );
                })}
                <button
                  className="category-card add-category-card"
                  onClick={() => setCategoryOpen(true)}
                >
                  <span className="add-category-icon">
                    <Plus />
                  </span>
                  <span className="category-name">カテゴリを追加</span>
                  <span className="category-meta">自由に作成できます</span>
                </button>
              </section>
              {active && (
                <section
                  className="inline-category-panel"
                  aria-label={`${active.name}の商品`}
                >
                  <header>
                    <span style={{ background: active.color }}>
                      <CategoryIcon name={active.icon} size={20} />
                    </span>
                    <div>
                      <p>商品選択</p>
                      <h3>{active.name}</h3>
                    </div>
                    <strong>
                      {active.items.filter((item) => item.selected).length}点
                    </strong>
                    <button
                      onClick={() => {
                        setActiveId(null);
                        setAdding(false);
                      }}
                      aria-label="商品一覧を閉じる"
                    >
                      <X />
                    </button>
                  </header>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={reorderItems}
                  >
                    <SortableContext
                      items={orderedActiveItems.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="item-list">
                        {orderedActiveItems.map((item) => (
                          <SortableItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => toggle(active.id, item.id)}
                            onQuantity={(quantity) =>
                              setQuantity(active.id, item.id, quantity)
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {adding ? (
                    <form className="add-form" onSubmit={addItem}>
                      <input
                        autoFocus
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="商品名を入力"
                        maxLength={40}
                        aria-label="新しい商品名"
                      />
                      <button type="submit" disabled={!newItem.trim()}>
                        追加
                      </button>
                      <button
                        type="button"
                        className="cancel"
                        onClick={() => setAdding(false)}
                      >
                        キャンセル
                      </button>
                    </form>
                  ) : (
                    <button
                      className="add-button"
                      onClick={() => setAdding(true)}
                    >
                      <CirclePlus /> 商品を追加
                    </button>
                  )}
                </section>
              )}
          </section>
        </>
      ) : (
        <section className="shopping-view">
          {!count && (
            <div className="list-empty">
              <span>
                <ListChecks />
              </span>
              <h2>リストは空です</h2>
              <p>買い物に必要な商品を追加してください</p>
              <button onClick={() => setView("select")}>商品を選択</button>
            </div>
          )}
          {selectedGroups.map((c) => (
            <div className="shopping-group" key={c.id}>
              <div className="group-heading">
                <span style={{ background: c.color }}>
                  <CategoryIcon name={c.icon} size={18} />
                </span>
                <h3>{c.name}</h3>
                <small>{c.items.length}点</small>
              </div>
              {c.items.map((item) => (
                <div className="shopping-item" key={item.id}>
                  <button
                    className="remove-item"
                    onClick={() => toggle(c.id, item.id)}
                    aria-label={`${item.name}をリストから外す`}
                  >
                    <span className="open-circle"></span>
                    {item.name}
                  </button>
                  <div className="quantity-control">
                    <button
                      onClick={() =>
                        setQuantity(c.id, item.id, (item.quantity ?? 1) - 1)
                      }
                      disabled={(item.quantity ?? 1) <= 1}
                    >
                      <Minus />
                    </button>
                    <strong>{item.quantity ?? 1}</strong>
                    <button
                      onClick={() =>
                        setQuantity(c.id, item.id, (item.quantity ?? 1) + 1)
                      }
                    >
                      <Plus />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {temporaryItems.length > 0 && (
            <div className="shopping-group temporary-group">
              <div className="group-heading">
                <span style={{ background: "#EEE5D6" }}>
                  <CategoryIcon name="note" size={18} />
                </span>
                <h3>今回限り</h3>
                <small>{temporaryItems.length}点</small>
              </div>
              {temporaryItems.map((item) => (
                <div className="shopping-item" key={item.id}>
                  <button
                    className="remove-item"
                    onClick={() =>
                      setTemporaryItems((current) =>
                        current.filter((currentItem) => currentItem.id !== item.id),
                      )
                    }
                    aria-label={`${item.name}をリストから外す`}
                  >
                    <span className="open-circle"></span>
                    {item.name}
                  </button>
                  <div className="quantity-control">
                    <button
                      onClick={() =>
                        setTemporaryQuantity(item.id, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                    >
                      <Minus />
                    </button>
                    <strong>{item.quantity}</strong>
                    <button
                      onClick={() =>
                        setTemporaryQuantity(item.id, item.quantity + 1)
                      }
                    >
                      <Plus />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <nav className="bottom-nav" aria-label="メインナビゲーション">
        <button
          className={view === "select" ? "active" : ""}
          onClick={() => setView("select")}
        >
          <span>
            <SlidersHorizontal />
          </span>
          商品選択
        </button>
        <button
          className={view === "list" ? "active" : ""}
          onClick={() => setView("list")}
        >
          <span>
            <ListChecks />
          </span>
          買い物リスト{count > 0 && <i>{count}</i>}
        </button>
      </nav>
      {undo && (
        <div className="toast" role="status">
          <span>すべて解除しました</span>
          <button
            onClick={() => {
              setCategories(undo.categories);
              setTemporaryItems(undo.temporaryItems);
              setUndo(null);
            }}
          >
            元に戻す
          </button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {historyOpen && (
        <div
          className="modal-backdrop history-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHistoryOpen(false);
          }}
        >
          <section
            className="history-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
          >
            <header>
              <div>
                <p>選んだことのある商品</p>
                <h2 id="history-title">すべての履歴</h2>
              </div>
              <button onClick={() => setHistoryOpen(false)} aria-label="閉じる">
                <X />
              </button>
            </header>
            <div className="history-product-list">
              {rankedHistory.map((past) => {
                const selected = categories
                  .find((category) => category.id === past.categoryId)
                  ?.items.find((item) => item.id === past.id)?.selected ?? false;
                return (
                  <button
                    key={`${past.categoryId}-${past.id}`}
                    className={selected ? "selected" : ""}
                    onClick={() => toggleFromHistory(past)}
                    aria-pressed={selected}
                  >
                    <span className="history-product-icon">
                      <CategoryIcon name={past.icon} size={17} />
                    </span>
                    <span>
                      <strong>{past.name}</strong>
                      <small>{past.categoryName}・{past.selectionCount}回選択</small>
                    </span>
                    <i><Check /></i>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
      {categoryOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCategoryOpen(false);
          }}
        >
          <form className="category-modal" onSubmit={addCategory}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setCategoryOpen(false)}
              aria-label="閉じる"
            >
              <X />
            </button>
            <div className="category-preview">
              <CategoryIcon name={categoryIcon} />
            </div>
            <h2>カテゴリを追加</h2>
            <p>アイコンと名前を決めてください</p>
            <div
              className="icon-picker"
              role="radiogroup"
              aria-label="カテゴリのアイコン"
            >
              {iconChoices.map((icon) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={categoryIcon === icon}
                  className={categoryIcon === icon ? "active" : ""}
                  key={icon}
                  onClick={() => setCategoryIcon(icon)}
                >
                  <CategoryIcon name={icon} size={20} />
                </button>
              ))}
            </div>
            <div className="category-fields">
              <label>
                <span>カテゴリ名</span>
                <input
                  autoFocus
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  maxLength={20}
                  placeholder="例：ペット用品"
                />
              </label>
            </div>
            <button
              className="create-category"
              type="submit"
              disabled={!categoryName.trim()}
            >
              追加する
            </button>
          </form>
        </div>
      )}
      {shareOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShareOpen(false);
          }}
        >
          <section
            className="share-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
          >
            <button
              className="modal-close"
              onClick={() => setShareOpen(false)}
              aria-label="閉じる"
            >
              <X />
            </button>
            <div className="share-icon">
              <Send />
            </div>
            <h2 id="share-title">買い物メモを共有</h2>
            <p>
              選んだ{count}
              点をチェックリストにして共有します。リンクを受け取った人は、買った商品をチェックできます。
            </p>
            <button
              className="copy-button"
              onClick={shareList}
              disabled={!count || sharing}
            >
              {sharing ? "リンクを作成中…" : "共有リンクをコピー"}
            </button>
            {!count && <small>共有する商品を先に選んでください。</small>}
            <div className="share-note">
              <span>
                <Check />
              </span>
              <div>
                <strong>リンクは30日間有効です</strong>
                <p>リンクを知っている人だけが開けます。</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
