import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DictationInput } from '../src/features/admin/DictationInput';
class FakeSpeech {
 static instances:FakeSpeech[]=[];
 lang='';continuous=true;interimResults=false;
 onresult:((event:{results:{isFinal:boolean;0:{transcript:string}}[]})=>void)|null=null;
 onerror:((event:{error:string})=>void)|null=null;onend:(()=>void)|null=null;
 start=vi.fn();stop=vi.fn();abort=vi.fn();
 constructor(){FakeSpeech.instances.push(this);}
}
afterEach(()=>{vi.unstubAllGlobals();FakeSpeech.instances=[];});
function setup(value='',maxLength=2000){vi.stubGlobal('SpeechRecognition',FakeSpeech);const onChange=vi.fn();const result=render(<DictationInput value={value} onChange={onChange} label="Identificación" maxLength={maxLength}/>);return {...result,onChange};}
it('no abre micrófono hasta el clic y requiere revisar/aplicar el texto de forma explícita',()=>{
 const {onChange}=setup('Texto previo');expect(FakeSpeech.instances).toHaveLength(0);fireEvent.click(screen.getByRole('button',{name:'Dictar instrucciones · Identificación'}));const active=FakeSpeech.instances[0];expect(active.start).toHaveBeenCalledOnce();expect(active.lang).toBe('es-CR');
 act(()=>active.onresult?.({results:[{isFinal:true,0:{transcript:' dictado pendiente'}}]}));expect(onChange).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Agregar dictado al texto'})).toBeDisabled();act(()=>active.onend?.());
 fireEvent.change(screen.getByLabelText('Texto dictado · Identificación'),{target:{value:'texto corregido'}});expect(onChange).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Agregar dictado al texto'}));expect(onChange).toHaveBeenCalledWith('Texto previo texto corregido');
});
it('mantiene escritura manual y permite reintentar después de rechazar el micrófono',()=>{
 const {onChange}=setup();fireEvent.click(screen.getByRole('button',{name:'Dictar instrucciones · Identificación'}));act(()=>FakeSpeech.instances[0].onerror?.({error:'not-allowed'}));expect(screen.getByText(/No se autorizó el micrófono/)).toBeVisible();expect(onChange).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Dictar instrucciones · Identificación'}));expect(FakeSpeech.instances).toHaveLength(2);
});
it('respeta el límite existente y cancela la captura al salir',()=>{
 const {onChange,unmount}=setup('Previo',12);fireEvent.click(screen.getByRole('button',{name:'Dictar instrucciones · Identificación'}));const active=FakeSpeech.instances[0];act(()=>{active.onresult?.({results:[{isFinal:true,0:{transcript:'mucho texto largo'}}]});active.onend?.();});fireEvent.click(screen.getByRole('button',{name:'Agregar dictado al texto'}));expect(onChange).toHaveBeenCalledWith('Previo mucho');
 fireEvent.click(screen.getByRole('button',{name:'Dictar instrucciones · Identificación'}));const next=FakeSpeech.instances[1];unmount();expect(next.abort).toHaveBeenCalledOnce();expect(next.onresult).toBeNull();
});
it('ofrece alternativa escrita si el navegador no reconoce voz',()=>{
 vi.stubGlobal('SpeechRecognition',undefined);vi.stubGlobal('webkitSpeechRecognition',undefined);render(<DictationInput value="" onChange={vi.fn()} label="Identificación"/>);expect(screen.getByText('Dictado no disponible en este navegador. Podés escribir las instrucciones.')).toBeVisible();expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
