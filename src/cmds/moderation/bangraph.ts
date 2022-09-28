import * as vega from 'vega';
import { Spec, ValuesData } from 'vega';
import { CommandContext } from '../../types';
import type { Canvas } from 'canvas';

const spec: Spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    description: 'A basic stacked area chart example.',
    width: 1000,
    height: 400,
    padding: 5,

    background: '#ffffff',

    data: [
        {
            name: 'table',
            values: [] as { x: string; y: number; c: string }[],
            transform: [
                {
                    type: 'stack',
                    groupby: ['x'],
                    sort: { field: 'c' },
                    field: 'y'
                }
            ]
        }
    ],

    legends: [
        {
            fill: 'color'
        }
    ],

    scales: [
        {
            name: 'x',
            type: 'point',
            range: 'width',
            domain: { data: 'table', field: 'x' }
        },
        {
            name: 'y',
            type: 'linear',
            range: 'height',
            nice: true,
            zero: true,
            domain: { data: 'table', field: 'y1' }
        },
        {
            name: 'color',
            type: 'ordinal',
            range: 'category',
            domain: { data: 'table', field: 'c' }
        }
    ],

    axes: [
        {
            orient: 'bottom',
            scale: 'x',
            zindex: 1,
            labelOverlap: false,
            encode: {
                labels: {
                    update: {
                        angle: {
                            value: -45
                        },
                        fontSize: {
                            value: 10
                        },
                        align: {
                            value: 'right'
                        }
                    }
                }
            }
        },
        { orient: 'left', scale: 'y', zindex: 1 }
    ],

    marks: [
        {
            type: 'group',
            from: {
                facet: {
                    name: 'series',
                    data: 'table',
                    groupby: 'c'
                }
            },
            marks: [
                {
                    type: 'area',
                    from: { data: 'series' },
                    encode: {
                        enter: {
                            interpolate: { value: 'monotone' },
                            x: { scale: 'x', field: 'x' },
                            y: { scale: 'y', field: 'y0' },
                            y2: { scale: 'y', field: 'y1' },
                            fill: { scale: 'color', field: 'c' }
                        },
                        update: {
                            fillOpacity: { value: 1 }
                        },
                        hover: {
                            fillOpacity: { value: 0.5 }
                        }
                    }
                }
            ]
        }
    ]
};

async function exec(ctx: CommandContext) {
    const days = parseInt(ctx.args[0] ?? '7');
    const noAntiExploit = ctx.args[1] === '-n';
    if (isNaN(days) || days < 2)
        return ctx.reply(`${ctx.config.emoji.error} Invalid amount of days! Must be at least 2 days worth of data.`);

    const loadingMsg = await ctx.reply(`${ctx.config.emoji.loading} Rendering, this might take a moment...`);

    const interval = `${days} days`;
    let results = await ctx.db.$queryRawUnsafe<
        { day: string; antiExploit: number; tempBans: number; permBans: number }[]
    >(
        `SELECT
            date_trunc('day', "BanLog".at) "day",
            ${
                !noAntiExploit
                    ? `count(case when "actor" = 'Server' then 1 end) "antiExploit", -- get all antiexploit bans`
                    : ''
            }
            count(case when "tempban" then 1 end) "tempBans", -- get all tempbans
            count(case when not "tempban" and "actor" != 'Server' then 1 end) "permBans" -- get all permabans NOT done by the antiexploit
        FROM "BanLog"
        WHERE "at" >= current_date AT TIME ZONE 'UTC' - INTERVAL '${interval}' -- based on the interval
        GROUP BY day`
    );

    if (results.length > days) {
        results = results.slice(results.length - days); // sometimes postgres returns too much
    }

    const processed = results.map(r => ({
        day: new Date(r.day).toISOString().split('T')[0],
        antiExploit: r.antiExploit,
        tempBans: r.tempBans,
        permBans: r.permBans
    }));

    const specClone = JSON.parse(JSON.stringify(spec)) as typeof spec;

    for (const record of processed) {
        const values = ((specClone.data[0] as ValuesData).values as { x: string; y: number; c: string }[]);

        if (!noAntiExploit) {
            values.push({
                x: record.day,
                y: record.antiExploit,
                c: 'Anti-Exploit'
            });
        }

        values.push(
            {
                x: record.day,
                y: record.tempBans,
                c: 'Temp Ban'
            },
            {
                x: record.day,
                y: record.permBans,
                c: 'Perm Ban'
            }
        );
    }

    const view = new vega.View(vega.parse(specClone));
    // https://vega.github.io/vega/docs/api/view/#view_toCanvas "If invoked server-side in node.js, the Promise resolves to a node-canvas Canvas instance."
    const canvas = (await view.toCanvas(3)) as unknown as Canvas;

    loadingMsg.delete();
    return ctx.reply({
        file: {
            file: canvas.toBuffer('image/png'),
            name: 'graph.png'
        }
    });
}

export default {
    name: 'bangraph',
    description: 'Renders a graph of bans per day.',
    usage: '<days(1)=7> <-n?>',

    exec,
    level: 1
};
