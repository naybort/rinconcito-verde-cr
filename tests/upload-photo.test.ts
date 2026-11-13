import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FirebaseStorage } from 'firebase/storage';
import { uploadOriginalPhoto, photoUploadError, PHOTO_UPLOAD_TIMEOUT_MS } from '../src/features/admin/uploadPhoto';
const storageMocks=vi.hoisted(()=>({ref:vi.fn(),uploadBytesResumable:vi.fn()}));
vi.mock('firebase/storage',()=>storageMocks);
const storage={} as FirebaseStorage;
const photo=new File(['image'],'plant.png',{type:'image/png'});
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
describe('fotografía: fin de espera y recuperación',()=>{
 it('cancela un transporte atascado al vencer el plazo, aunque Firebase siga reintentando',async()=>{
  vi.useFakeTimers();const cancel=vi.fn();storageMocks.uploadBytesResumable.mockReturnValue(Object.assign(new Promise(()=>{}),{cancel}));
  const result=uploadOriginalPhoto(storage,'originals/test/plant/photo',photo).catch(error=>error);
  await vi.advanceTimersByTimeAsync(PHOTO_UPLOAD_TIMEOUT_MS);const error=await result;
  expect(cancel).toHaveBeenCalledOnce();expect(photoUploadError(error)).toMatch(/30 segundos.*conservó el borrador/);expect(vi.getTimerCount()).toBe(0);
 });
 it('una subida exitosa limpia el plazo y no se cancela después',async()=>{
  vi.useFakeTimers();const cancel=vi.fn();storageMocks.uploadBytesResumable.mockReturnValue(Object.assign(Promise.resolve({}),{cancel}));
  await uploadOriginalPhoto(storage,'originals/test/plant/photo',photo);await vi.advanceTimersByTimeAsync(PHOTO_UPLOAD_TIMEOUT_MS);
  expect(cancel).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 });
 it('un error de permiso termina de inmediato, conserva el borrador y no expone detalles internos',async()=>{
  vi.useFakeTimers();const failure={code:'storage/unauthorized',message:'internal detail'};storageMocks.uploadBytesResumable.mockReturnValue(Object.assign(Promise.reject(failure),{cancel:vi.fn()}));
  await expect(uploadOriginalPhoto(storage,'originals/test/plant/photo',photo)).rejects.toEqual(failure);
  expect(photoUploadError(failure)).toMatch(/permiso.*conservó el borrador/);expect(photoUploadError(failure)).not.toContain('internal detail');expect(vi.getTimerCount()).toBe(0);
 });
});
