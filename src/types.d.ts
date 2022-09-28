import type { PrismaClient } from '@prisma/client';
import type Eris from 'eris';
import type EventEmitter from 'events';
import type SpotifyWebApi from 'spotify-web-api-node';
import type { CollectorOptions, FilterPredicate } from './utils/awaitMessages';

export type CommandContext = {
    args: string[];
    bot: Eris.Client;
    logger: typeof import('./utils/logger');
    msg: Eris.Message<Eris.GuildTextableChannel>;
    db: PrismaClient;
    pollServerEmitter: EventEmitter;
    serverCommands: any;
    commands: any;
    config: any;

    spotifyApi: SpotifyWebApi;

    userStaffLevel: number;
    getUserStaffLevel: (m: Eris.Member) => number;

    awaitMessages: (
        channel: Eris.Channel,
        filter: FilterPredicate,
        options: CollectorOptions
    ) => Promise<Eris.Message[]>;

    reply(content: RepliableContent, channel?: string): Promise<Eris.Message>;
};

export type RepliableContent =
    | Eris.MessageContent
    | { file: Eris.FileContent | Eris.FileContent[] }
    | object
    | any[]
    | number
    | boolean;
