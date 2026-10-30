// Generated from the pinned move reference by scripts/extract-move-singles-rules.mjs.
import type { BattleMoveSecondary } from '../../lib/battle'

export const canonicalMoveSecondaries: Readonly<Record<string, readonly BattleMoveSecondary[]>> = {
  'fire-punch': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'ice-punch': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'freeze',
        },
      ],
    },
  ],
  'thunder-punch': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  stomp: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'rolling-kick': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  headbutt: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'body-slam': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'poison-sting': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  twineedle: [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  bite: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  acid: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  ember: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  flamethrower: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'ice-beam': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'freeze',
        },
      ],
    },
  ],
  blizzard: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'freeze',
        },
      ],
    },
  ],
  psybeam: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  'bubble-beam': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'aurora-beam': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'attack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'thunder-shock': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  thunderbolt: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  thunder: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  confusion: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  psychic: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  lick: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  smog: [
    {
      chance: 40,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  sludge: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'bone-club': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'fire-blast': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  waterfall: [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  constrict: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'sky-attack': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  bubble: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'dizzy-punch': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  'rock-slide': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'hyper-fang': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'flame-wheel': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  snore: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'powder-snow': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'freeze',
        },
      ],
    },
  ],
  'sludge-bomb': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'mud-slap': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'accuracy',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  octazooka: [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'accuracy',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'zap-cannon': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'icy-wind': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  spark: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'steel-wing': [
    {
      chance: 10,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'defense',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'sacred-fire': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'dynamic-punch': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  'dragon-breath': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'rapid-spin': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'speed',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'iron-tail': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'metal-claw': [
    {
      chance: 10,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'attack',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  twister: [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  crunch: [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'ancient-power': [
    {
      chance: 10,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'attack',
              change: 1,
            },
            {
              stat: 'defense',
              change: 1,
            },
            {
              stat: 'specialAttack',
              change: 1,
            },
            {
              stat: 'specialDefense',
              change: 1,
            },
            {
              stat: 'speed',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'shadow-ball': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'rock-smash': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'fake-out': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'heat-wave': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'secret-power': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'luster-purge': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'mist-ball': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialAttack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'blaze-kick': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'needle-arm': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'poison-fang': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          ailment: 'badly-poisoned',
        },
      ],
    },
  ],
  'crush-claw': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'meteor-mash': [
    {
      chance: 20,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'attack',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  astonish: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'rock-tomb': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'silver-wind': [
    {
      chance: 10,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'attack',
              change: 1,
            },
            {
              stat: 'defense',
              change: 1,
            },
            {
              stat: 'specialAttack',
              change: 1,
            },
            {
              stat: 'specialDefense',
              change: 1,
            },
            {
              stat: 'speed',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'signal-beam': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  extrasensory: [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'muddy-water': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'accuracy',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  bounce: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'mud-shot': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'poison-tail': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'volt-tackle': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'water-pulse': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  'flare-blitz': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'force-palm': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'poison-jab': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'dark-pulse': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'air-slash': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'bug-buzz': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'dragon-rush': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'focus-blast': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'energy-ball': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'earth-power': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'thunder-fang': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'ice-fang': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'freeze',
        },
      ],
    },
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'fire-fang': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'mud-bomb': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'accuracy',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'zen-headbutt': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'mirror-shot': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'accuracy',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'flash-cannon': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'rock-climb': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  discharge: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'lava-plume': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'cross-poison': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'gunk-shot': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'iron-head': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  chatter: [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  'charge-beam': [
    {
      chance: 70,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'specialAttack',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'seed-flare': [
    {
      chance: 40,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -2,
            },
          ],
        },
      ],
    },
  ],
  'ominous-wind': [
    {
      chance: 10,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'attack',
              change: 1,
            },
            {
              stat: 'defense',
              change: 1,
            },
            {
              stat: 'specialAttack',
              change: 1,
            },
            {
              stat: 'specialDefense',
              change: 1,
            },
            {
              stat: 'speed',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'sludge-wave': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'flame-charge': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'speed',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'low-sweep': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'acid-spray': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -2,
            },
          ],
        },
      ],
    },
  ],
  scald: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  inferno: [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'struggle-bug': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialAttack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  bulldoze: [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  electroweb: [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'heart-stamp': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'razor-shell': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'leaf-tornado': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'accuracy',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  steamroller: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'night-daze': [
    {
      chance: 40,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'accuracy',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  hurricane: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  'searing-shot': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'relic-song': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'sleep',
        },
      ],
    },
  ],
  glaciate: [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'bolt-strike': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'blue-flare': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'fiery-dance': [
    {
      chance: 50,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'specialAttack',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'freeze-shock': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'ice-burn': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  snarl: [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialAttack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'icicle-crash': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'freeze-dry': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'freeze',
        },
      ],
    },
  ],
  'play-rough': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'attack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  moonblast: [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialAttack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'steam-eruption': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'mystical-fire': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialAttack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  nuzzle: [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'power-up-punch': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'attack',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  lunge: [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'attack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'fire-lash': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'trop-kick': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'attack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'stoked-sparksurfer': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'shadow-bone': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  liquidation: [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'zing-zap': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'zippy-zap': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'evasion',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'splishy-splash': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'floaty-fall': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'buzzy-buzz': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'sizzly-slide': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'double-iron-bash': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'drum-beating': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'pyro-ball': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'aura-wheel': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'speed',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'breaking-swipe': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'attack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'apple-acid': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'grav-apple': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'spirit-break': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialAttack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'strange-steam': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  'shell-side-arm': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'skitter-smack': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialAttack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'scorching-sands': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'freezing-glare': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'freeze',
        },
      ],
    },
  ],
  'fiery-wrath': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'thunderous-kick': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'psyshield-bash': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'defense',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'springtide-storm': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'attack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'mystical-power': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'specialAttack',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'mountain-gale': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'barb-barrage': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'esper-wing': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'speed',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'bitter-malice': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'attack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'triple-arrows': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'defense',
              change: -1,
            },
          ],
        },
      ],
    },
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'infernal-parade': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'bleakwind-storm': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'wildbolt-storm': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'sandsear-storm': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'axe-kick': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  'lumina-crash': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'specialDefense',
              change: -2,
            },
          ],
        },
      ],
    },
  ],
  'mortal-spin': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'torch-song': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'specialAttack',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'aqua-step': [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'speed',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  pounce: [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'speed',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  trailblaze: [
    {
      chance: 100,
      effects: [
        {
          target: 'user',
          statChanges: [
            {
              stat: 'speed',
              change: 1,
            },
          ],
        },
      ],
    },
  ],
  'chilling-water': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          statChanges: [
            {
              stat: 'attack',
              change: -1,
            },
          ],
        },
      ],
    },
  ],
  'blazing-torque': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'wicked-torque': [
    {
      chance: 10,
      effects: [
        {
          target: 'target',
          ailment: 'sleep',
        },
      ],
    },
  ],
  'noxious-torque': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'poison',
        },
      ],
    },
  ],
  'combat-torque': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'paralysis',
        },
      ],
    },
  ],
  'magical-torque': [
    {
      chance: 30,
      effects: [
        {
          target: 'target',
          ailment: 'confusion',
        },
      ],
    },
  ],
  'matcha-gotcha': [
    {
      chance: 20,
      effects: [
        {
          target: 'target',
          ailment: 'burn',
        },
      ],
    },
  ],
  'upper-hand': [
    {
      chance: 100,
      effects: [
        {
          target: 'target',
          flinch: true,
        },
      ],
    },
  ],
  'malignant-chain': [
    {
      chance: 50,
      effects: [
        {
          target: 'target',
          ailment: 'badly-poisoned',
        },
      ],
    },
  ],
}
