// Unity Equivalent: Resources.LoadAsync / Addressables wrapper.
import { Assets } from 'pixi.js';
import idleImage from '../assets/Idle.png';
import walkImage from '../assets/Run.png';
import bgImage from '../assets/Gray.png';

export const AssetLoader = {
    async loadAssets() {
        // In a real game, you would do: await Assets.load(['hero.png', 'enemy.png']);
        // Here we simulate loading time for procedural graphics
        await Assets.load([
            { alias: 'idle', src: idleImage },
            { alias: 'walk', src: walkImage },
            { alias: 'bg', src: bgImage }
        ]);
        return new Promise(resolve => setTimeout(resolve, 500)); 
    }
};