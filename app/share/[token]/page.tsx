"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SharedItem = { id: string; name: string; quantity?: number; category: string; icon: string; color: string; checked: boolean };

export default function SharedListPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    supabase.rpc("get_shared_list", { p_token: token }).then(({ data, error }) => {
      if (error || !data?.[0]) setMissing(true); else setItems(data[0].items as SharedItem[]);
      setLoading(false);
    });
  }, [token]);

  const groups = useMemo(() => Object.values(items.reduce<Record<string, { icon: string; color: string; items: SharedItem[] }>>((all, item) => {
    all[item.category] ??= { icon: item.icon, color: item.color, items: [] };
    all[item.category].items.push(item); return all;
  }, {})), [items]);
  const checked = items.filter(item => item.checked).length;
  const toggle = async (item: SharedItem) => {
    const next = !item.checked;
    setItems(current => current.map(i => i.id === item.id ? { ...i, checked: next } : i));
    const { error } = await supabase.rpc("set_shared_item_checked", { p_token: token, p_item_id: item.id, p_checked: next });
    if (error) setItems(current => current.map(i => i.id === item.id ? { ...i, checked: !next } : i));
  };

  if (loading) return <main className="shared-app shared-state"><div className="loading-ring"/><p>買い物メモを読み込んでいます</p></main>;
  if (missing) return <main className="shared-app shared-state"><div className="share-icon">!</div><h1>メモが見つかりません</h1><p>リンクが違うか、有効期限が切れています。</p><Link href="/">かごを開く</Link></main>;
  return <main className="shared-app">
    <header className="shared-header"><div className="brand"><div className="brand-mark">か</div><div><p className="eyebrow">SHARED SHOPPING LIST</p><h1>お買い物メモ</h1></div></div><span className="received">受け取り</span></header>
    <section className="shared-summary"><p className="date">今回の買い物</p><h2>{checked === items.length ? "お買い物完了！" : `あと${items.length - checked}点`}</h2><div className="progress"><i style={{ width: `${items.length ? checked / items.length * 100 : 0}%` }}/></div><p>{checked} / {items.length}点 チェック済み</p></section>
    <section>{groups.map(group => <div className="check-group" key={group.items[0].category}><div className="group-heading"><span style={{ background: group.color }}>{group.icon}</span><h3>{group.items[0].category}</h3><small>{group.items.filter(i => i.checked).length}/{group.items.length}</small></div>{group.items.map(item => <button key={item.id} className={item.checked ? "done" : ""} onClick={() => toggle(item)} aria-pressed={item.checked}><span className="check-circle">✓</span><span>{item.name}</span>{(item.quantity ?? 1) > 1 && <strong className="shared-quantity">×{item.quantity}</strong>}</button>)}</div>)}</section>
    <p className="shared-footnote">チェック状態は、このリンクを開いた人と共有されます</p>
  </main>;
}
