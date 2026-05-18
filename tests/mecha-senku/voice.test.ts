import { describe, expect, it } from 'vitest';
import {
  voiceBuild,
  voiceUpgrade,
  voiceDemolish,
  voiceResearch,
  voiceBrownout,
  voiceOffGrid,
  voiceStorageTight,
  voiceStorageFull,
  voiceMilestone,
  voiceEndgame,
  voiceDeposit,
  classifyLogEntry,
} from '../../src/mecha-senku/voice';

/**
 * Voice template tests — every canonical template from
 * design/06-style §Canonical message templates produces the right
 * trigger key, emotion, and accent color.
 */

describe('voiceBuild', () => {
  it('formats with name + tier + effect summary', () => {
    const v = voiceBuild('Workshop', 1, '+10⚡ / hr', 'build:workshop:1');
    expect(v.operational).toMatch(/Profit/);
    expect(v.operational).toMatch(/Workshop T1/);
    expect(v.operational).toMatch(/\+10⚡ \/ hr/);
    expect(v.trigger).toBe('build:workshop:1');
    expect(v.emotion).toBe('excited');
  });
});

describe('voiceUpgrade', () => {
  it('formats with name + new tier', () => {
    const v = voiceUpgrade('Iron Smelter', 2, 'upgrade:iron_smelter:2');
    expect(v.operational).toMatch(/Iron Smelter T2/);
    expect(v.operational).toMatch(/redrawn/);
    expect(v.emotion).toBe('excited');
  });
});

describe('voiceDemolish', () => {
  it('formats with refund amounts', () => {
    const v = voiceDemolish('Workshop', { iron: 50, innovation: 40 }, 'demolish:workshop');
    expect(v.operational).toMatch(/struck/);
    expect(v.operational).toMatch(/50/);
    expect(v.operational).toMatch(/40/);
    expect(v.emotion).toBe('worried');
  });

  it('handles empty refund gracefully', () => {
    const v = voiceDemolish('Workshop', {}, 'demolish:workshop');
    expect(v.operational).toMatch(/no refund/);
  });
});

describe('voiceResearch', () => {
  it('formats with the 10-billion-percent tag', () => {
    const v = voiceResearch('Sulfuric Acid', 'Unlocks Alchemy Lab.', 'research:sulfuric_acid');
    expect(v.operational).toMatch(/10 billion percent/);
    expect(v.operational).toMatch(/Sulfuric Acid/);
    expect(v.operational).toMatch(/Unlocks Alchemy Lab/);
    expect(v.emotion).toBe('proud');
  });
});

describe('voiceBrownout', () => {
  it('formats with network id + capacity/demand + fix hint', () => {
    const v = voiceBrownout('Main', 12, 18, 'brownout:Main');
    expect(v.operational).toMatch(/Storm on the Main grid/);
    expect(v.operational).toMatch(/capacity 12, demand 18/);
    expect(v.operational).toMatch(/Build power/);
    expect(v.emotion).toBe('worried');
    expect(v.accentColor).toBe('#E84B4B');
  });
});

describe('voiceOffGrid', () => {
  it('flags off-grid + 0% trickle', () => {
    const v = voiceOffGrid('Iron Smelter', 'offgrid:iron_smelter');
    expect(v.operational).toMatch(/off the grid/);
    expect(v.operational).toMatch(/0% trickle/);
    expect(v.emotion).toBe('worried');
  });
});

describe('voiceStorageTight / voiceStorageFull', () => {
  it('tight: shows percentage + upgrade hint', () => {
    const v = voiceStorageTight('Library', 92, 'storage_tight:library');
    expect(v.operational).toMatch(/Library at 92%/);
    expect(v.operational).toMatch(/Upgrade or this resource spills/);
  });
  it('full: shows cap value + overflow lost', () => {
    const v = voiceStorageFull('Library', 5000, 'storage_full:library');
    expect(v.operational).toMatch(/Library capped at 5000/);
    expect(v.operational).toMatch(/Overflow lost/);
  });
});

describe('voiceMilestone', () => {
  it('anchors with "Anchors aweigh"', () => {
    const v = voiceMilestone('Kingdom of Science', 'Land cleared.', 'milestone:kos');
    expect(v.operational).toMatch(/Anchors aweigh/);
    expect(v.operational).toMatch(/Kingdom of Science/);
    expect(v.emotion).toBe('captain');
  });
});

describe('voiceEndgame', () => {
  it('the locked endgame one-shot', () => {
    const v = voiceEndgame();
    expect(v.operational).toMatch(/Hoshii/);
    expect(v.operational).toMatch(/Perseus reached the moon/);
    expect(v.operational).toMatch(/closes here/);
    expect(v.emotion).toBe('captain');
    expect(v.trigger).toBe('endgame_moon_launch');
  });
});

describe('voiceDeposit', () => {
  it('formats a deposit with multiple resources', () => {
    const v = voiceDeposit({ knowledge: 47, iron: 89, completion: 2 });
    expect(v.operational).toMatch(/Plunder from the last watch/);
    expect(v.operational).toMatch(/\+47/);
    expect(v.operational).toMatch(/\+89/);
    expect(v.operational).toMatch(/\+2/);
    expect(v.trigger).toBe('session_open');
  });

  it('handles an empty haul', () => {
    const v = voiceDeposit({});
    expect(v.operational).toMatch(/no haul/);
  });
});

describe('classifyLogEntry — post-hoc trigger classification', () => {
  it('build:* → excited / gold', () => {
    const c = classifyLogEntry({ ts: '', operational: '', trigger: 'build:workshop:1' });
    expect(c.emotion).toBe('excited');
    expect(c.accentColor).toBe('#FFC940');
  });
  it('research:* → proud / green', () => {
    const c = classifyLogEntry({ ts: '', operational: '', trigger: 'research:fire' });
    expect(c.emotion).toBe('proud');
    expect(c.accentColor).toBe('#7CD16A');
  });
  it('brownout:* → worried / red', () => {
    const c = classifyLogEntry({ ts: '', operational: '', trigger: 'brownout:Main' });
    expect(c.emotion).toBe('worried');
    expect(c.accentColor).toBe('#E84B4B');
  });
  it('unknown trigger → idle / gold (defensive default)', () => {
    const c = classifyLogEntry({ ts: '', operational: '', trigger: 'mystery_event' });
    expect(c.emotion).toBe('idle');
    expect(c.accentColor).toBe('#FFC940');
  });
});
