interface MarketItems {
    [id: string]: {
        pretty: string;
        description: string;
        price: bigint;
        tradeable: boolean;
        limited: boolean;
        purchasable: boolean;
        stock?: number;
    };
}

export default {
    cooldownium: {
        pretty: 'Cooldownium',
        description:
            'Reduces all cooldowns on every command by half. This item stacks up to 3 times (1x = 1/2 cooldown, 2x = 1/4 cooldown, 3x = 1/8 cooldown).',
        price: 1_000_000_000n,
        tradeable: true,
        limited: false,
        purchasable: true
    },
    gold: {
        pretty: 'Gold',
        description: 'Heavy as hell but malleable.',
        price: 50_000n,
        tradeable: true,
        limited: false,
        purchasable: true
    },
    diamond: {
        pretty: 'Diamond',
        description: 'Shiny...',
        price: 150_000n,
        tradeable: true,
        limited: false,
        purchasable: true
    },
    oxygen: {
        pretty: 'Oxygen',
        description: 'A substance used to breathe.',
        price: 100n,
        tradeable: true,
        limited: true,
        purchasable: true,
        stock: 10_000
    },
    co: {
        pretty: 'Carbon Monoxide',
        description: 'Very poisonous.',
        price: 1_000n,
        tradeable: true,
        limited: true,
        purchasable: true,
        stock: 100
    },
    crucible: {
        pretty: 'The Crucible',
        description: '"Rip and tear, until it is done."',
        price: 1_000_000_000_000_000n,
        tradeable: false,
        limited: true,
        purchasable: true,
        stock: 5
    },
    the: {
        pretty: 'the',
        description: 'metluk is awesome',
        price: 5_000_000_000_000_000_000n,
        tradeable: true,
        purchasable: true,
        limited: true,
        stock: 7
    },
    sholly: {
        pretty: '<:sholly:953244157177135174>',
        description: '<:sholly:953244157177135174>',
        price: 953_244_157_177_135_174n,
        tradeable: true,
        purchasable: true,
        limited: true,
        stock: 3
    }
} as MarketItems;
