import { useState } from 'react';
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField } from '@mui/material';
import type { Taxonomy } from '../../../functions/src/domain';
import type { Run } from './Inventory';

export type CategoryEditing = Taxonomy & { isNew: boolean };
export function CategoryInlineEditor({ value, run, busy, onClose, onSaved }: { value: CategoryEditing; run: Run; busy: boolean; onClose: () => void; onSaved: (category: Taxonomy) => void }) {
 const [name, setName] = useState(value.name);
 const [active, setActive] = useState(value.active);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 async function save() {
  if (saving || busy || !name.trim()) return;
  setSaving(true); setError('');
  try {
   const result = await run('saveTaxonomy', { kind: 'categories', id: value.id, revision: value.revision, name: name.trim(), active }) as { taxonomy?: Taxonomy } | undefined;
   if (result?.taxonomy) onSaved(result.taxonomy);
   else setError('No se confirmó el guardado de la categoría. Revisá el mensaje del panel y volvé a intentarlo.');
  } catch { setError('No se pudo guardar la categoría. El nombre que escribiste se conserva.'); }
  finally { setSaving(false); }
 }
 return <Dialog open fullWidth maxWidth="sm" onClose={saving || busy ? undefined : onClose} aria-labelledby="category-dialog-title">
  <DialogTitle id="category-dialog-title">{value.isNew ? 'Crear categoría' : 'Editar categoría'}</DialogTitle>
  <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
   <TextField autoFocus label="Nombre de la categoría" required value={name} disabled={saving || busy} onChange={event => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }}/>
   <FormControlLabel label="Categoría activa" control={<Checkbox checked={active} disabled={saving || busy} onChange={event => setActive(event.target.checked)}/>}/>
   {!value.isNew && <Alert severity="info">El nombre y estado de esta categoría se actualizan también para las otras fichas que la usan. El ID se conserva.</Alert>}
   {error && <Alert severity="error">{error}</Alert>}
  </Stack></DialogContent>
  <DialogActions><Button disabled={saving || busy} onClick={onClose}>Cancelar</Button><Button variant="contained" disabled={saving || busy || !name.trim()} onClick={() => void save()}>{saving ? 'Guardando categoría…' : 'Guardar categoría'}</Button></DialogActions>
 </Dialog>;
}
