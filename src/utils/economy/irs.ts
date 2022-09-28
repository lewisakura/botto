import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import { error } from '../logger';
import { CommandContext } from '../../types';

const client = rateLimit(axios.create(), { maxRequests: 15, perMilliseconds: 30000 });

export function sendIRSNotice(ctx: CommandContext | string, message: string) {
    client
        .post(typeof ctx === 'string' ? ctx : ctx.config.internalRevenueService, {
            embeds: [
                {
                    description: message
                }
            ]
        })
        .then()
        .catch(err => {
            error(err);
        });
}
