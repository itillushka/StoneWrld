import Phaser from 'phaser';
import { gameConfig } from './config';

/**
 * StoneWrld entry point.
 *
 * Bootstraps the Phaser game with the config from ./config.ts.
 * Phase 0 renders only the BootScene placeholder — see design/09-roadmap §Phase 0.
 * Subsequent phases register PreloadScene → CityScene → ResearchScene → UIScene → ModalScene
 * (the full scene tree is locked in design/08-architecture §Phaser scene tree).
 */
new Phaser.Game(gameConfig);
