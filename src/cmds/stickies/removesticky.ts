import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.args.length < 1) {
        return ctx.reply(`${ctx.config.emoji.error} You need to provide an ID.`);
    }

    const id = parseInt(ctx.args.shift());

    if (isNaN(id)) {
        return ctx.reply(`${ctx.config.emoji.error} Invalid ID.`);
    }

    const sticky = await ctx.db.sticky.findUnique({ where: { id } });
    if (!sticky) {
        return ctx.reply(`${ctx.config.emoji.error} Invalid ID.`);
    }

    await Promise.all([
        ctx.bot.deleteMessage(sticky.channelId, sticky.lastMessageId).catch(() => {}),
        ctx.db.sticky.delete({ where: { id } })
    ]);

    return ctx.reply(`${ctx.config.emoji.success} Sticky removed.`);
}

export default {
    name: 'removesticky',
    description: 'Remove a sticky.',
    args: '<sticky id(1)>',

    exec,
    level: 2
};
