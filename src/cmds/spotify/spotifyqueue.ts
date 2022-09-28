import { runCooldownNoCooldownium } from '../../utils/cooldowns';
import { CommandContext } from '../../types';

import { promises as fs } from 'fs';

let enabled = false;

async function exec(ctx: CommandContext): Promise<any> {
    if (ctx.args.length < 1) {
        return ctx.reply(`${ctx.config.emoji.error} You need to provide a song to queue.`);
    }

    if (ctx.userStaffLevel === 5 && ctx.args[0] === 'toggle') {
        enabled = !enabled;
        return ctx.reply(
            `${ctx.config.emoji.success} Spotify queue is now ${
                enabled ? 'enabled. Anyone can queue songs with `;spotifyqueue <song name>`!' : 'disabled.'
            }`
        );
    }

    if (!enabled) return ctx.reply(`${ctx.config.emoji.error} Spotify queue is disabled.`);

    try {
        const song = await ctx.spotifyApi.searchTracks(ctx.args.join(' '), { limit: 1 });
        if (song.body.tracks.items.length === 0) {
            return ctx.reply(`${ctx.config.emoji.error} Could not find a song with that name.`);
        }

        const cooldown = runCooldownNoCooldownium('spotifyqueue', ctx.msg.author.id, 5, 'minutes');

        if (cooldown) {
            return ctx.reply(`${ctx.config.emoji.error} You're on cooldown, chill out!\n⏱️ Expires in ${cooldown}.`);
        }

        const track = song.body.tracks.items[0];
        await ctx.spotifyApi.addToQueue(track.uri);

        return ctx.reply(
            `${ctx.config.emoji.success} Queued ${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`
        );
    } catch (e) {
        if (e.name === 'WebapiRegularError' && e.message.includes('access token expired')) {
            const {
                body: { access_token, refresh_token }
            } = await ctx.spotifyApi.refreshAccessToken();

            ctx.spotifyApi.setAccessToken(access_token);
            ctx.spotifyApi.setRefreshToken(refresh_token);

            await fs.writeFile(
                './spotify.json',
                JSON.stringify({ accessToken: access_token, refreshToken: refresh_token })
            );

            return exec(ctx);
        } else {
            enabled = false;
            return ctx.reply(
                `${ctx.config.emoji.error} An error occurred, probably Lewi closed Spotify.\n\n\`\`\`\n` + e + '\n```'
            );
        }
    }
}

export default {
    name: 'spotifyqueue',
    description: 'Queues a song on Spotify.',
    usage: '<song(1)...>',

    exec,
    level: 0
};
