import { z } from 'zod';
import { draftSchema } from '../../../functions/src/domain';
import { emptyInventory, inventoryDraftSchema } from './workflow';
// Local recovery deliberately accepts unfinished fields; server commands still use the strict schema.
export const recoverySchema=z.object({
 draft:draftSchema.extend({name:z.string().max(120),sources:z.array(z.object({title:z.string().max(200),url:z.string().max(2000),accessedAt:z.string().max(20)}).strict()).max(20)}),
 revision:z.number().int().nonnegative(),status:z.enum(['draft','review','published','archived']),dirty:z.boolean(),assisted:z.boolean().default(true),phase:z.number().int().min(0).max(6).default(0),enhancePhotoId:z.string().max(1000).optional(),inventory:inventoryDraftSchema.default(emptyInventory),savedAt:z.number().finite()
}).strict();
