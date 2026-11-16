import type { z } from 'zod';
import { proposalSchema, type Draft } from '../../../functions/src/domain';
export type ContentProposal = z.infer<typeof proposalSchema>;
export const contentFields = ['name','description','categoryIds','light','watering','humidity','temperature','warnings','sources'] as const;
export type ContentField = typeof contentFields[number];
export const contentFieldLabels:Record<ContentField,string>={name:'nombre',description:'descripción',categoryIds:'categorías',light:'luz',watering:'riego',humidity:'humedad',temperature:'temperatura',warnings:'advertencias',sources:'fuentes y referencias'};
const careFields = new Set<string>(['light','watering','humidity','temperature']);
export function fieldValue(value: Draft | ContentProposal, field: ContentField): unknown {
 return careFields.has(field) ? value.care[field as keyof Draft['care']] : value[field as keyof typeof value];
}
export function fieldEmpty(value: unknown): boolean { return typeof value==='string' ? !value.trim() : Array.isArray(value) ? value.length===0 : value==null; }
export function fieldFingerprint(draft: Draft, field: ContentField): string { return JSON.stringify(fieldValue(draft,field)); }
export type FieldChoice = { selected: boolean; fingerprint: string };
export function fieldSelected(draft: Draft, proposal: ContentProposal, field: ContentField, choice?: FieldChoice): boolean {
 if (fieldEmpty(fieldValue(proposal,field))) return false;
 if (choice?.fingerprint===fieldFingerprint(draft,field)) return choice.selected;
 // If a person edited a field after selecting it, require a fresh selection.
 return fieldEmpty(fieldValue(draft,field));
}
export function selectedContentPatch(draft: Draft, proposal: ContentProposal, fields: readonly ContentField[], jobId: string): Partial<Draft> {
 const selected=new Set(fields);const patch:Partial<Draft>={};
 for (const field of ['name','description','warnings'] as const) if(selected.has(field)) patch[field]=proposal[field];
 if(selected.has('categoryIds'))patch.categoryIds=[...proposal.categoryIds];
 const care={...draft.care};let changedCare=false;
 for(const field of ['light','watering','humidity','temperature'] as const)if(selected.has(field)){care[field]=proposal.care[field];changedCare=true;}
 if(changedCare)patch.care=care;
 if(selected.has('sources')){patch.sources=proposal.sources.map(source=>({...source}));patch.ai={...draft.ai,contentJobId:jobId};}
 return patch;
}
