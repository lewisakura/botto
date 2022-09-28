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

    const messageContent = ctx.args.join(' ');

    await Promise.all([
        ctx.bot.editMessage(sticky.channelId, sticky.lastMessageId, messageContent).catch(() => {}),
        ctx.db.sticky.update({ where: { id }, data: { messageContent } })
    ]);

    return ctx.reply(`${ctx.config.emoji.success} Sticky updated.`);
}

export default {
    name: 'editsticky',
    description: 'Edit a sticky.',
    args: '<sticky id(1)> <new message content...>',

    exec,
    level: 2
};
