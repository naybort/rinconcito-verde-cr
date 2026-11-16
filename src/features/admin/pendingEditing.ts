import type { Editing } from './PlantEditor';
/** Inventory saves independently of the plant draft; either can require recovery. */
export function hasPendingEditing(editing:Editing|null):boolean{
 if(!editing)return false;
 const inventory=editing.inventory;
 return editing.dirty||!!inventory&&(inventory.movementDirty||Object.values(inventory.presentationEdits??{}).some(Boolean)||!!inventory.reason?.trim()||(!inventory.presentationContext&&[inventory.price,inventory.location,inventory.potNumber].some(value=>!!value?.trim())));
}
