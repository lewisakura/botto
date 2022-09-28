import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    const stickies = await ctx.db.sticky.findMany();

    return ctx.reply(
        `**Stickies:**\n${stickies
            .map(sticky => `${sticky.id}: <#${sticky.channelId}> -> ${sticky.messageContent.substring(0, 50).trim() + '...'}`)
            .join('\n')}`
    );
}

export default {
    name: 'stickies',
    description: 'List all stickies.',

    exec,
    level: 2
};
