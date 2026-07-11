"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Item = { id: string; name: string; selected: boolean };
type Category = { id: string; name: string; icon: string; color: string; items: Item[] };

const initialCategories: Category[] = [
  { id: "vegetables", name: "野菜", icon: "🥬", color: "#E7F0D9", items: ["キャベツ", "レタス", "トマト", "きゅうり", "玉ねぎ", "にんじん", "じゃがいも"].map((name, i) => ({ id: `v${i}`, name, selected: i === 1 || i === 3 })) },
  { id: "fruit", name: "果物", icon: "🍎", color: "#F8E1D7", items: ["りんご", "バナナ", "みかん", "キウイ"].map((name, i) => ({ id: `f${i}`, name, selected: false })) },
  { id: "meat", name: "お肉", icon: "🥩", color: "#F3DCD7", items: ["鶏もも肉", "豚こま肉", "ひき肉", "ウインナー"].map((name, i) => ({ id: `m${i}`, name, selected: i === 0 })) },
  { id: "fish", name: "お魚", icon: "🐟", color: "#DCECEF", items: ["鮭", "さば", "刺身", "しらす"].map((name, i) => ({ id: `s${i}`, name, selected: false })) },
  { id: "dairy", name: "卵・乳製品", icon: "🥛", color: "#F5EACB", items: ["卵", "牛乳", "ヨーグルト", "チーズ", "バター"].map((name, i) => ({ id: `d${i}`, name, selected: i === 1 || i === 2 })) },
  { id: "bread", name: "パン", icon: "🍞", color: "#EFE0C9", items: ["食パン", "ロールパン", "菓子パン"].map((name, i) => ({ id: `b${i}`, name, selected: false })) },
  { id: "staples", name: "麺・ご飯", icon: "🍜", color: "#F1E5D1", items: ["うどん", "パスタ", "焼きそば", "お米"].map((name, i) => ({ id: `n${i}`, name, selected: false })) },
  { id: "frozen", name: "冷凍食品", icon: "🧊", color: "#DDEBF2", items: ["冷凍餃子", "冷凍うどん", "アイス"].map((name, i) => ({ id: `z${i}`, name, selected: false })) },
  { id: "processed", name: "加工食品", icon: "🥫", color: "#E9E2D2", items: ["豆腐", "納豆", "缶詰", "ハム"].map((name, i) => ({ id: `p${i}`, name, selected: false })) },
  { id: "seasoning", name: "調味料", icon: "🧂", color: "#E9E5D8", items: ["しょうゆ", "みそ", "塩", "砂糖", "マヨネーズ"].map((name, i) => ({ id: `c${i}`, name, selected: false })) },
  { id: "snacks", name: "お菓子", icon: "🍪", color: "#F2DFCE", items: ["チョコレート", "ポテトチップス", "せんべい"].map((name, i) => ({ id: `o${i}`, name, selected: false })) },
  { id: "drinks", name: "飲み物", icon: "🧃", color: "#DDEADB", items: ["お茶", "コーヒー", "ジュース", "炭酸水"].map((name, i) => ({ id: `r${i}`, name, selected: false })) },
  { id: "daily", name: "日用品", icon: "🧻", color: "#E4E1EE", items: ["ティッシュ", "キッチンペーパー", "洗剤", "ゴミ袋"].map((name, i) => ({ id: `h${i}`, name, selected: i === 1 })) },
];

export default function Home() {
  const [categories, setCategories] = useState(initialCategories);
  const [view, setView] = useState<"select" | "list">("select");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [undo, setUndo] = useState<Category[] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("kago-categories");
    if (saved) try { setCategories(JSON.parse(saved)); } catch { /* use defaults */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("kago-categories", JSON.stringify(categories)); }, [categories, ready]);
  useEffect(() => { if (!undo) return; const timer = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(timer); }, [undo]);

  const active = categories.find(c => c.id === activeId);
  const selectedGroups = useMemo(() => categories.map(c => ({ ...c, items: c.items.filter(i => i.selected) })).filter(c => c.items.length), [categories]);
  const count = selectedGroups.reduce((sum, c) => sum + c.items.length, 0);

  const toggle = (categoryId: string, itemId: string) => setCategories(cs => cs.map(c => c.id === categoryId ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, selected: !i.selected } : i) } : c));
  const clearAll = () => { if (!count) return; setUndo(categories); setCategories(cs => cs.map(c => ({ ...c, items: c.items.map(i => ({ ...i, selected: false })) }))); };
  const addItem = (event: FormEvent) => {
    event.preventDefault(); const name = newItem.trim(); if (!name || !activeId) return;
    setCategories(cs => cs.map(c => c.id === activeId ? { ...c, items: [...c.items, { id: crypto.randomUUID(), name, selected: true }] } : c));
    setNewItem(""); setAdding(false);
  };

  if (active) return <main className="app detail-view">
    <header className="detail-header"><button className="back" onClick={() => { setActiveId(null); setAdding(false); }} aria-label="カテゴリ一覧に戻る">‹</button><div><p className="eyebrow">カテゴリー</p><h1><span>{active.icon}</span>{active.name}</h1></div><div className="count-badge">{active.items.filter(i => i.selected).length}</div></header>
    <section className="item-list" aria-label={`${active.name}の商品`}>
      {active.items.map(item => <button key={item.id} className={`item-row ${item.selected ? "selected" : ""}`} onClick={() => toggle(active.id, item.id)} aria-pressed={item.selected}><span>{item.name}</span><span className="check">✓</span></button>)}
    </section>
    {adding ? <form className="add-form" onSubmit={addItem}><input autoFocus value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="商品名を入力" maxLength={40} aria-label="新しい商品名"/><button type="submit" disabled={!newItem.trim()}>追加</button><button type="button" className="cancel" onClick={() => setAdding(false)}>キャンセル</button></form> : <button className="add-button" onClick={() => setAdding(true)}><span>＋</span> 商品を追加</button>}
    <p className="detail-hint">タップした商品が今回の買い物に追加されます</p>
  </main>;

  return <main className="app">
    <header className="topbar"><div className="brand"><div className="brand-mark">か</div><div><p className="eyebrow">FAMILY SHOPPING</p><h1>かご</h1></div></div><button className="people" aria-label="共有メンバー">●● <span>2</span></button></header>
    {view === "select" ? <>
      <section className="intro"><div><p className="date">今日の買い物</p><h2>何を買いますか？</h2><p>カテゴリーから選んでください</p></div><div className="basket-count"><strong>{count}</strong><span>点</span></div></section>
      <button className="clear" onClick={clearAll} disabled={!count}><span>↻</span><span><strong>すべて解除</strong><small>次の買い物をはじめる</small></span></button>
      <section className="category-grid" aria-label="商品カテゴリー">{categories.map(c => { const n = c.items.filter(i => i.selected).length; return <button key={c.id} className="category-card" style={{ background: c.color }} onClick={() => setActiveId(c.id)}><span className="category-icon">{c.icon}</span><span className="category-name">{c.name}</span><span className="category-meta">{n ? `${n}点 選択中` : `${c.items.length}品`}</span>{n > 0 && <span className="dot">{n}</span>}</button>; })}</section>
    </> : <section className="shopping-view"><div className="shopping-title"><p className="date">今回の買い物</p><h2>{count ? `${count}点の買うもの` : "買うものはありません"}</h2><p>{count ? "カテゴリーごとに確認できます" : "「選ぶ」から商品を追加しましょう"}</p></div>{selectedGroups.map(c => <div className="shopping-group" key={c.id}><div className="group-heading"><span style={{ background: c.color }}>{c.icon}</span><h3>{c.name}</h3><small>{c.items.length}点</small></div>{c.items.map(item => <button key={item.id} onClick={() => toggle(c.id, item.id)}><span className="open-circle"></span>{item.name}<span className="remove">×</span></button>)}</div>)}</section>}
    <nav className="bottom-nav" aria-label="メインナビゲーション"><button className={view === "select" ? "active" : ""} onClick={() => setView("select")}><span>⊞</span>選ぶ</button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><span>☷</span>買うもの{count > 0 && <i>{count}</i>}</button></nav>
    {undo && <div className="toast" role="status"><span>すべて解除しました</span><button onClick={() => { setCategories(undo); setUndo(null); }}>元に戻す</button></div>}
  </main>;
}
