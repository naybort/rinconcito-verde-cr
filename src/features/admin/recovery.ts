import { z } from 'zod';
import { draftSchema } from '../../../functions/src/domain';
import { emptyInventory, FLOW_VERSION, inventoryDraftSchema, recoveredPhase } from './workflow';
// Local recovery deliberately accepts unfinished fields; server commands still use the strict schema.
const unfinishedSource=z.object({title:z.string().max(200),url:z.string().max(2000).optional(),accessedAt:z.string().max(20).optional(),verification:z.enum(['verified','unverified']).default('unverified')}).strict();
export const recoverySchema=z.object({
 draft:draftSchema.extend({name:z.string().max(120),sources:z.array(unfinishedSource).max(20)}),
 revision:z.number().int().nonnegative(),status:z.enum(['draft','review','published','archived']),dirty:z.boolean(),assisted:z.boolean().default(true),
 flowVersion:z.literal(FLOW_VERSION).optional(),phase:z.number().int().min(0).max(6).default(0),enhancePhotoId:z.string().max(1000).optional(),inventory:inventoryDraftSchema.default(emptyInventory),savedAt:z.number().finite()
}).strict().transform(value=>({...value,flowVersion:FLOW_VERSION,phase:recoveredPhase(value.phase,value.flowVersion)}));
