import Eris from 'eris';
import { CommandContext } from '../../types';

async function exec(ctx: CommandContext) {
    if (ctx.args.length > 0) {
        const command = ctx.commands[ctx.args[0]];

        if (!command) {
            return await ctx.reply(
                ctx.config.emoji.error +
                    'Command not found! Use `' +
                    ctx.config.prefix +
                    'help` to see command listing.'
            );
        }

        const fields: Eris.EmbedField[] = [
            {
                name: 'Usage',
                value: `${ctx.config.prefix}${command.name} ${command.usage || ''}`,
                inline: true
            },
            {
                name: 'Staff Level',
                value: `${command.level} | ${ctx.config.levelNames[command.level]}`,
                inline: true
            }
        ];

        if (command.aliases) {
            fields.push({
                name: 'Aliases',
                value: command.aliases.map((alias: string) => `\`${alias}\``).join(', '),
                inline: true
            });
        }

        return await ctx.reply({
            embed: {
                title: 'Help | ' + ctx.config.prefix + command.name,
                description: command.description,
                fields,
                color: 0xe7ae54
            }
        });
    }

    const categories: {
        [key: string]: string[];
    } = {};
    const fields = [];

    for (const cmd of Object.keys(ctx.commands)) {
        const command = ctx.commands[cmd];
        if (command.aliases?.includes(cmd)) continue;

        if (!categories[command.category]) {
            categories[command.category] = [];
        }

        categories[command.category].push(`\`${command.name}\``);
    }

    for (const [category, commands] of Object.entries(categories)) {
        fields.push({
            name: category,
            value: commands.join(', '),
            inline: true
        });
    }

    return await ctx.reply({
        embed: {
            title: 'BOTTOボット',
            description: `Use \`${ctx.config.prefix}help <command(1)>\` to get help on a specific command.`,
            fields,
            color: 0xe7ae54
        }
    });
}

export default {
    name: 'help',
    description: 'Provides help on commands.',
    usage: '<command(1)?>',

    exec,
    level: 0
};
