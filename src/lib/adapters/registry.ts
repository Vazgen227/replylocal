import type {ChannelId,IChannelAdapter,CloudEvent} from './types';
/** No connector is activated until its real provider integration is implemented. */
export class IntegrationRegistry {
 private adapters=new Map<ChannelId,IChannelAdapter>();
 register(adapter:IChannelAdapter){this.adapters.set(adapter.id,adapter);}
 getAdapter(id:ChannelId){return this.adapters.get(id);}
 getAllAdapters(){return Array.from(this.adapters.values());}
 getEventLogs():CloudEvent[]{return [];}
}
export const integrationRegistry=new IntegrationRegistry();
