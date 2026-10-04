// Illustrative template generator used ONLY by /demo. This is not an AI integration.
import {mockServices,defaultAIPersona} from '@/lib/mocks/knowledge';
import type {AISuggestion} from '@/types/inbox';
export interface AIRequestContext {
 conversationId:string;customerName:string;channel:string;lastMessage:string;
 tone?:'friendly'|'formal'|'concise'|'consultative';
}
export class AIOrchestrator {
 static generateSuggestion(context:AIRequestContext):AISuggestion {
  const text=context.lastMessage.toLowerCase();
  if([...defaultAIPersona.humanHandoffKeywords,'не заводится','дтп'].some(word=>text.includes(word)))
   return {status:'ready',sources:[],suggestedReply:'В этом примере требуется помощь оператора. Автоматические обещания времени ответа не даются.'};
  const keywords:Record<string,string[]>={srv_1:['диагност'],srv_2:['масл'],srv_3:['колод'],srv_4:['химчист']};
  const service=mockServices.find(service=>keywords[service.id]?.some(word=>text.includes(word)));
  if(service) return {status:'ready',sources:[`Demo: ${service.name}`],suggestedReply:`Демонстрационный пример: ${service.name} — ${service.price} ${service.currency}, около ${service.durationMinutes} мин. Для записи время должен подтвердить оператор.`};
  return {status:'ready',sources:[],suggestedReply:'Это демонстрационный шаблон. Уточните вопрос; реальная AI-модель пока не подключена.'};
 }
}
