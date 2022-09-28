import Eris from 'eris';
import { EventEmitter } from 'events';

const collectors: MessageCollector[] = [];

export interface CollectorOptions {
    time?: number;
    maxMatches: number;
}

export type FilterPredicate = (msg: Eris.Message) => boolean;

declare interface MessageCollector {
    on(event: 'end', listener: (messages: Eris.Message[], stopReason: string) => any): this;
}

class MessageCollector extends EventEmitter {
    private filter: FilterPredicate;
    private channel: Eris.Channel;
    private options: CollectorOptions;
    private ended: boolean;
    private collected: Eris.Message[];

    constructor(channel: Eris.Channel, filter: FilterPredicate, options: CollectorOptions) {
        super();
        this.filter = filter;
        this.channel = channel;
        this.options = options;
        this.ended = false;
        this.collected = [];

        collectors.push(this);
        if (options.time) setTimeout(() => this.stop('time'), options.time);
    }

    verify(message: Eris.Message) {
        if (this.channel.id !== message.channel.id) return false;
        if (this.filter(message)) {
            this.collected.push(message);

            this.emit('message', message);
            if (this.collected.length >= this.options.maxMatches) this.stop('maxMatches');
            return true;
        }

        return false;
    }

    stop(reason: string) {
        if (this.ended) return;
        this.ended = true;

        collectors.splice(collectors.indexOf(this), 1);
        this.emit('end', this.collected, reason);
    }
}

let listening = false;
export function getAwaitMessages(bot: Eris.Client) {
    return function awaitMessages(
        channel: Eris.Channel,
        filter: FilterPredicate,
        options: CollectorOptions
    ): Promise<Eris.Message[]> {
        if (!listening) {
            bot.on('messageCreate', (message: Eris.Message) => {
                for (const collector of collectors) collector.verify(message);
            });

            listening = true;
        }

        const collector = new MessageCollector(channel, filter, options);
        return new Promise(resolve => collector.on('end', resolve));
    };
}
