import type {IChannelAdapter,ChannelId,InquiryMessage,CloudEvent,AdapterCredentials} from './types';
/** Reserved connector interface. Real providers are not implemented in this release. */
export abstract class PendingChannelAdapter implements IChannelAdapter {
 abstract readonly id:ChannelId;
 abstract readonly name:string;
 readonly category='messenger' as const;
 async authenticate(credentials:AdapterCredentials):Promise<boolean>{void credentials;return false;}
 async fetchRecentMessages():Promise<InquiryMessage[]>{throw new Error('CHANNEL_NOT_IMPLEMENTED');}
 async sendMessage(conversationId:string,text:string):Promise<boolean>{void conversationId;void text;throw new Error('CHANNEL_NOT_IMPLEMENTED');}
 verifyWebhookSignature(payload:string,signature:string):boolean{void payload;void signature;return false;}
 formatAsCloudEvent(message:InquiryMessage):CloudEvent<InquiryMessage>{return {specversion:'1.0',id:crypto.randomUUID(),source:`replylocal/adapter/${this.id}`,type:'com.replylocal.inquiry.created',datacontenttype:'application/json',time:new Date().toISOString(),data:message};}
}
export class TelegramAdapter extends PendingChannelAdapter {readonly id='telegram';readonly name='Telegram';}
export class WhatsAppAdapter extends PendingChannelAdapter {readonly id='whatsapp';readonly name='WhatsApp';}
export class InstagramAdapter extends PendingChannelAdapter {readonly id='instagram';readonly name='Instagram';}
