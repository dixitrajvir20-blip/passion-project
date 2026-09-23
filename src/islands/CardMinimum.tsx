/** Card balance at the minimum payment. Foundation stub: the card-minimum builder replaces the body. The Props interface is fixed by src/pages/[region]/tools/[tool].astro; anything more the island needs goes in config. */
import type { CardMinimumConfig } from '../lib/tools/card-minimum';
import type { Edition } from '../lib/tools/types';
import { Figure } from './tool-kit';
import './tools.css';

interface Props {
  config: CardMinimumConfig;
  edition: Edition;
  localeCode: string;
  prefix: string;
}

export default function CardMinimum(_props: Props) {
  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <p class="plain">This calculator is being built.</p>
        </div>
        <div class="results">
          <h2>What it comes to</h2>
          <Figure label="Not worked out yet" value="—" />
        </div>
      </div>
    </div>
  );
}
