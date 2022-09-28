import { CommandContext } from '../../types';

export default {
    name: 'spotifyoauth',
    description: 'Sends a Spotify OAuth link.',

    async exec(ctx: CommandContext) {
        try {
            await (
                await ctx.msg.author.getDMChannel()
            ).createMessage(
                `https://accounts.spotify.com/authorize?response_type=code&client_id=${ctx.config.spotify.clientId}&scope=user-modify-playback-state&redirect_uri=${ctx.config.spotify.redirectUri}`
            );
        } catch (e) {
            return await ctx.reply("Couldn't send a DM.");
        }

        await ctx.reply('DMed an OAuth link.');
    },
    level: 5
};
