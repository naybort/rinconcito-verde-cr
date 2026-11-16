import { sourceSchema, type Source } from './domain.js';

const key=(source:Source)=>JSON.stringify([source.title,source.url||'',source.accessedAt||'']);
const verified=(sources:unknown):Source[]=>Array.isArray(sources)?sources.flatMap(value=>{
 const source=sourceSchema.safeParse(value);
 return source.success&&source.data.verification==='verified'&&source.data.url&&source.data.accessedAt?[source.data]:[];
}):[];

/** Client flags do not establish evidence. Trust only unchanged server records or an accepted server job. */
export function normalizeSources(submitted:Source[],previous:unknown,proof?:{status?:unknown;kind?:unknown;plantId?:unknown;revision?:unknown;confirmedName?:unknown;proposal?:unknown},context?:{plantId:string;revision:number;confirmedName:string}):Source[]{
 const accepted=!!proof&&!!context&&proof.status==='ready'&&proof.kind==='content'&&proof.plantId===context.plantId&&proof.revision===context.revision&&proof.confirmedName===context.confirmedName;
 const proposal=accepted&&typeof proof?.proposal==='object'&&proof.proposal!==null?proof.proposal as {sources?:unknown}:undefined;
 const trusted=new Set([...verified(previous),...verified(proposal?.sources)].map(key));
 return submitted.map(source=>({title:source.title,...(source.url?{url:source.url}:{}),...(source.accessedAt?{accessedAt:source.accessedAt}:{}),verification:source.verification==='verified'&&trusted.has(key(source))?'verified':'unverified'}));
}
