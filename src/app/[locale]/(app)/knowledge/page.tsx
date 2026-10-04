'use client';
import {useState} from 'react';
import {useTranslations,useLocale} from 'next-intl';
import {Plus,Pencil,Trash2,Search} from 'lucide-react';
import {toast} from 'sonner';
import {useWorkspace} from '@/components/workspace-provider';
import {api,ApiError} from '@/lib/api-client';
import type {KnowledgeEntry,KnowledgeInput} from '@/lib/schemas';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';

export default function Knowledge() {
 const {data,reload}=useWorkspace(); const t=useTranslations('backend'),locale=useLocale();
 const [kind,setKind]=useState<KnowledgeInput['kind']>('service');
 const [search,setSearch]=useState(''),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [editing,setEditing]=useState<KnowledgeEntry|null>(null),[deleting,setDeleting]=useState<KnowledgeEntry|null>(null);
 const [title,setTitle]=useState(''),[content,setContent]=useState(''),[price,setPrice]=useState(''),[duration,setDuration]=useState(''),[sku,setSku]=useState(''),[currency,setCurrency]=useState(data.organization.currency);
 const writable=data.user.role!=='agent';
 function start(entry?:KnowledgeEntry){setEditing(entry??null);setTitle(entry?.title??'');setContent(entry?.content??'');setPrice(entry?.price==null?'':String(entry.price));setDuration(entry?.durationMinutes==null?'':String(entry.durationMinutes));setSku(entry?.sku??'');setCurrency(entry?.currency??data.organization.currency);setError('');setOpen(true);}
 function errorCode(error:unknown){return error instanceof ApiError?error.code:'SERVER_ERROR';}
 async function save(event:React.FormEvent){
   event.preventDefault();if(busy)return;setBusy(true);setError('');
   const input:KnowledgeInput={kind:editing?.kind??kind,title,content,price:price===''?null:Number(price),currency:currency as KnowledgeInput['currency'],durationMinutes:duration===''?null:Number(duration),sku};
   try{await api(editing?`/api/knowledge/${editing.id}`:'/api/knowledge',editing?'PATCH':'POST',editing?{...input,version:editing.version}:input);setOpen(false);toast.success(t('saved'));await reload();}
   catch(error){setError(errorCode(error));}finally{setBusy(false);}
 }
 async function remove(){if(!deleting||busy)return;setBusy(true);setError('');try{await api(`/api/knowledge/${deleting.id}`,'DELETE',{version:deleting.version});setDeleting(null);toast.success(t('deleted'));await reload();}catch(error){setError(errorCode(error));}finally{setBusy(false);}}
 const visible=data.entries.filter(entry=>entry.kind===kind&&`${entry.title} ${entry.content} ${entry.sku}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="max-w-6xl mx-auto space-y-6">
  <div className="flex flex-wrap justify-between items-start gap-4"><div><h1 className="text-3xl font-bold">{t('knowledge')}</h1><p className="text-muted-foreground mt-2 max-w-2xl">{t('knowledgeIntro')}</p></div><Button disabled={!writable} onClick={()=>start()}><Plus className="size-4"/>{t('add')}</Button></div>
  <div className="flex flex-wrap gap-3 items-center justify-between"><Tabs value={kind} onValueChange={value=>setKind(value as KnowledgeInput['kind'])}><TabsList>{(['service','product','rule'] as const).map(key=><TabsTrigger key={key} value={key}>{t(key)} ({data.entries.filter(e=>e.kind===key).length})</TabsTrigger>)}</TabsList></Tabs><div className="relative w-full sm:w-64"><Search className="size-4 absolute left-3 top-2.5 text-muted-foreground"/><Input className="pl-9" aria-label={t('search')} placeholder={t('search')} value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
  {!visible.length?<Card><CardContent className="py-8 text-center text-muted-foreground">{t('noEntries')}</CardContent></Card>:<div className="grid md:grid-cols-2 gap-4">{visible.map(entry=><Card key={entry.id}><CardHeader><div className="flex justify-between gap-3"><CardTitle>{entry.title}</CardTitle><Badge variant="secondary">{t('stored')}</Badge></div></CardHeader><CardContent className="space-y-4"><p className="text-sm whitespace-pre-wrap break-words text-muted-foreground">{entry.content}</p><div className="flex flex-wrap gap-3 text-sm font-medium">{entry.price!==null&&<span>{new Intl.NumberFormat(locale,{style:'currency',currency:entry.currency}).format(entry.price)}</span>}{entry.durationMinutes!==null&&<span>{t('minutes',{count:entry.durationMinutes})}</span>}{entry.sku&&<span>SKU: {entry.sku}</span>}</div><div className="flex gap-2 pt-2 border-t"><Button size="sm" variant="outline" disabled={!writable} onClick={()=>start(entry)}><Pencil className="size-3.5"/>{t('edit')}</Button><Button size="sm" variant="ghost" disabled={!writable} onClick={()=>{setDeleting(entry);setError('');}}><Trash2 className="size-3.5"/>{t('delete')}</Button></div></CardContent></Card>)}</div>}
  <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?t('edit'):t('add')}</DialogTitle><DialogDescription>{t('entryHint')}</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4">
   <div className="space-y-1.5"><Label htmlFor="entry-title">{t('title')}</Label><Input id="entry-title" value={title} onChange={e=>setTitle(e.target.value)} minLength={2} maxLength={200} required/></div>
   <div className="space-y-1.5"><Label htmlFor="entry-content">{t('content')}</Label><Textarea id="entry-content" rows={5} value={content} onChange={e=>setContent(e.target.value)} maxLength={12000} required/></div>
   {(editing?.kind??kind)!=='rule'&&<div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="entry-price">{t('priceOptional')}</Label><Input id="entry-price" type="number" min="0" max="9999999999.99" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></div><div className="space-y-1.5"><Label htmlFor="entry-currency">{t('currency')}</Label><select id="entry-currency" className="w-full h-8 border rounded-lg px-2 bg-background" value={currency} onChange={e=>setCurrency(e.target.value as typeof currency)}>{['UAH','USD','EUR','PLN'].map(x=><option key={x}>{x}</option>)}</select></div></div>}
   {(editing?.kind??kind)==='service'&&<div className="space-y-1.5"><Label htmlFor="entry-duration">{t('durationOptional')}</Label><Input id="entry-duration" type="number" min="1" max="10080" step="1" value={duration} onChange={e=>setDuration(e.target.value)}/></div>}
   {(editing?.kind??kind)==='product'&&<div className="space-y-1.5"><Label htmlFor="entry-sku">SKU</Label><Input id="entry-sku" maxLength={100} value={sku} onChange={e=>setSku(e.target.value)}/></div>}
   {error&&<p role="alert" className="text-sm text-destructive">{t.has(error)?t(error):t('SERVER_ERROR')}</p>}
   <DialogFooter><Button type="button" disabled={busy} variant="outline" onClick={()=>setOpen(false)}>{t('cancel')}</Button><Button disabled={busy} type="submit">{busy?t('saving'):t('save')}</Button></DialogFooter>
  </form></DialogContent></Dialog>
  <Dialog open={!!deleting} onOpenChange={value=>{if(!value&&!busy)setDeleting(null);}}><DialogContent><DialogHeader><DialogTitle>{t('deleteConfirm')}</DialogTitle><DialogDescription>{deleting?.title}</DialogDescription></DialogHeader>{error&&<p role="alert" className="text-destructive text-sm">{t.has(error)?t(error):t('SERVER_ERROR')}</p>}<DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setDeleting(null)}>{t('cancel')}</Button><Button variant="destructive" disabled={busy} onClick={remove}>{t('delete')}</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}
