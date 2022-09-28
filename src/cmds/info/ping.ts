import { CommandContext } from '../../types';

export default {
    name: 'ping',
    description: 'Checks if the bot is online.',

    async exec(ctx: CommandContext) {
        const funnies = [
            'ZOぞ is a fighting game!',
            'There is no such thing as random killing!',
            'you pinged me >:(',
            'AAAAAAAAAAAAAAAAAAAAAAAAAA',
            '<a:stressed:860792356836212736>',
            '<a:speen3:864464615290437643>',
            '<a:popop:860338529687175200>',
            '<:tofublush:860387757515735100>',
            ctx.config.emoji.success,
            ctx.config.emoji.blank
        ];

        const randomFunny = funnies[Math.floor(Math.random() * funnies.length)];

        const start = Date.now();
        const msg = await ctx.reply(randomFunny);
        await msg.edit(randomFunny + ` (\`${Date.now() - start}ms\`)`);
    },
    level: 0
};
