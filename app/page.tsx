"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Item = { id: string; name: string; selected: boolean };
type Category = { id: string; name: string; icon: string; color: string; items: Item[] };
type HistoryItem = { id: string; name: string; categoryId: string; categoryName: string; icon: string };
type HistoryEntry = { id: string; createdAt: string; items: HistoryItem[] };

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
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window === "undefined") return initialCategories;
    const saved = localStorage.getItem("kago-categories");
    if (saved) try { return JSON.parse(saved) as Category[]; } catch { /* use defaults */ }
    return initialCategories;
  });
  const [view, setView] = useState<"select" | "list">("select");
  const [selectTab, setSelectTab] = useState<"category" | "history">("category");
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("kago-history");
    if (saved) try { return JSON.parse(saved) as HistoryEntry[]; } catch { /* empty history */ }
    return [];
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [undo, setUndo] = useState<Category[] | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => { localStorage.setItem("kago-categories", JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem("kago-history", JSON.stringify(history)); }, [history]);
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
  const showNotice = (message: string) => { setNotice(message); setTimeout(() => setNotice(""), 3000); };
  const selectFromHistory = (entry: HistoryEntry) => {
    setCategories(current => current.map(category => {
      const pastItems = entry.items.filter(item => item.categoryId === category.id);
      if (!pastItems.length) return category;
      const pastIds = new Set(pastItems.map(item => item.id));
      const existingIds = new Set(category.items.map(item => item.id));
      return { ...category, items: [
        ...category.items.map(item => pastIds.has(item.id) ? { ...item, selected: true } : item),
        ...pastItems.filter(item => !existingIds.has(item.id)).map(item => ({ id: item.id, name: item.name, selected: true })),
      ] };
    }));
    showNotice(`${entry.items.length}点を追加しました`);
  };
  const shareList = async () => {
    if (!count || sharing) return;
    setSharing(true);
    const items = selectedGroups.flatMap(category => category.items.map(item => ({ id: item.id, name: item.name, category: category.name, icon: category.icon, color: category.color, checked: false })));
    const { data, error } = await supabase.rpc("create_shared_list", { p_items: items });
    if (error || !data) { showNotice("共有リンクを作成できませんでした"); setSharing(false); return; }
    const historyItems = selectedGroups.flatMap(category => category.items.map(item => ({ id: item.id, name: item.name, categoryId: category.id, categoryName: category.name, icon: category.icon })));
    setHistory(current => [{ id: data, createdAt: new Date().toISOString(), items: historyItems }, ...current].slice(0, 20));
    const url = `${window.location.origin}/share/${data}`;
    try { await navigator.clipboard.writeText(url); setShareOpen(false); showNotice("共有リンクをコピーしました"); }
    catch { showNotice("リンクをコピーできませんでした"); }
    setSharing(false);
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
    <header className="topbar"><div className="brand"><div className="brand-mark">か</div><div><p className="eyebrow">FAMILY SHOPPING</p><h1>かご</h1></div></div><button className="share-trigger" onClick={() => setShareOpen(true)} aria-label="買い物リストを共有"><span>↗</span> 共有</button></header>
    {view === "select" ? <>
      <section className="intro"><div><p className="date">今日の買い物</p><h2>何を買いますか？</h2><p>{selectTab === "category" ? "カテゴリーから選んでください" : "以前の買い物から選べます"}</p></div><div className="basket-count"><strong>{count}</strong><span>点</span></div></section>
      <button className="clear" onClick={clearAll} disabled={!count}><span>↻</span><span><strong>すべて解除</strong><small>次の買い物をはじめる</small></span></button>
      <div className="select-tabs" role="tablist" aria-label="商品の選び方"><button role="tab" aria-selected={selectTab === "category"} className={selectTab === "category" ? "active" : ""} onClick={() => setSelectTab("category")}>カテゴリから</button><button role="tab" aria-selected={selectTab === "history"} className={selectTab === "history" ? "active" : ""} onClick={() => setSelectTab("history")}>買い物履歴{history.length > 0 && <span>{history.length}</span>}</button></div>
      {selectTab === "category" ? <section className="category-grid" aria-label="商品カテゴリー">{categories.map(c => { const n = c.items.filter(i => i.selected).length; return <button key={c.id} className="category-card" style={{ background: c.color }} onClick={() => setActiveId(c.id)}><span className="category-icon">{c.icon}</span><span className="category-name">{c.name}</span><span className="category-meta">{n ? `${n}点 選択中` : `${c.items.length}品`}</span>{n > 0 && <span className="dot">{n}</span>}</button>; })}</section> : <section className="history-list" aria-label="買い物履歴">{history.length ? history.map(entry => <article className="history-card" key={entry.id}><div className="history-head"><div><p>{new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(new Date(entry.createdAt))}</p><h3>{entry.items.length}点の買い物</h3></div><button onClick={() => selectFromHistory(entry)}>＋ 今回も買う</button></div><div className="history-items">{entry.items.slice(0, 6).map(item => <span key={`${item.categoryId}-${item.id}`}>{item.icon} {item.name}</span>)}{entry.items.length > 6 && <span>ほか{entry.items.length - 6}点</span>}</div></article>) : <div className="history-empty"><span>◷</span><h3>まだ履歴がありません</h3><p>買い物メモを共有すると、ここから<br/>同じ商品を選べるようになります。</p></div>}</section>}
    </> : <section className="shopping-view"><div className="shopping-title"><p className="date">今回の買い物</p><h2>{count ? `${count}点の買うもの` : "買うものはありません"}</h2><p>{count ? "カテゴリーごとに確認できます" : "「選ぶ」から商品を追加しましょう"}</p></div>{selectedGroups.map(c => <div className="shopping-group" key={c.id}><div className="group-heading"><span style={{ background: c.color }}>{c.icon}</span><h3>{c.name}</h3><small>{c.items.length}点</small></div>{c.items.map(item => <button key={item.id} onClick={() => toggle(c.id, item.id)}><span className="open-circle"></span>{item.name}<span className="remove">×</span></button>)}</div>)}</section>}
    <nav className="bottom-nav" aria-label="メインナビゲーション"><button className={view === "select" ? "active" : ""} onClick={() => setView("select")}><span>⊞</span>選ぶ</button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><span>☷</span>買うもの{count > 0 && <i>{count}</i>}</button></nav>
    {undo && <div className="toast" role="status"><span>すべて解除しました</span><button onClick={() => { setCategories(undo); setUndo(null); }}>元に戻す</button></div>}
    {notice && <div className="notice" role="status">{notice}</div>}
    {shareOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShareOpen(false); }}><section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><button className="modal-close" onClick={() => setShareOpen(false)} aria-label="閉じる">×</button><div className="share-icon">↗</div><h2 id="share-title">買い物メモを共有</h2><p>選んだ{count}点をチェックリストにして共有します。リンクを受け取った人は、買った商品をチェックできます。</p><button className="copy-button" onClick={shareList} disabled={!count || sharing}>{sharing ? "リンクを作成中…" : "共有リンクをコピー"}</button>{!count && <small>共有する商品を先に選んでください。</small>}<div className="share-note"><span>✓</span><div><strong>リンクは30日間有効です</strong><p>リンクを知っている人だけが開けます。</p></div></div></section></div>}
  </main>;
}
