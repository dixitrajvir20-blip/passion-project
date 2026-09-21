import { useEffect, useState } from 'preact/hooks';
import { isAllowed, readConsent } from '../lib/consent';
import { consentCategories } from '../lib/site';

interface Props {
  youtubeId: string;
  title: string;
  minutes: number;
  startSeconds?: number;
}

/**
 * A click-to-load video. The page ships a drawn poster and nothing from YouTube. On play, if the
 * reader has said yes to "Videos from other sites", the privacy-enhanced player loads; if not,
 * the choice is put to them right here, with a plain link out as the alternative. Nothing is
 * fetched from a third party until that yes. The CSP allows frames from youtube-nocookie.com only.
 */
export default function VideoPlayer({ youtubeId, title, minutes, startSeconds = 0 }: Props) {
  const [state, setState] = useState<'poster' | 'ask' | 'playing'>('poster');
  const [allowed, setAllowed] = useState(false);

  const storage = () => {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  };
  const check = () => setAllowed(isAllowed(readConsent(storage()), 'embeds', consentCategories));

  useEffect(() => {
    check();
    document.addEventListener('lp:consent-changed', check);
    return () => document.removeEventListener('lp:consent-changed', check);
  }, []);

  // A yes given in the dialog while the question is open starts the video.
  useEffect(() => {
    if (state === 'ask' && allowed) setState('playing');
  }, [allowed, state]);

  const watchHref = `https://www.youtube.com/watch?v=${youtubeId}${startSeconds ? `&t=${startSeconds}s` : ''}`;

  if (state === 'playing') {
    const src = `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0${startSeconds ? `&start=${startSeconds}` : ''}`;
    return (
      <div class="video-frame">
        <iframe
          src={src}
          title={title}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerpolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div class="video-frame video-poster">
      <button type="button" class="video-play" onClick={() => setState(allowed ? 'playing' : 'ask')}>
        <svg class="video-play-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span class="video-play-text">
          Play <span class="numbers">{minutes} min</span>
        </span>
      </button>
      {state === 'ask' && (
        <div class="video-ask" role="status">
          <p>Playing loads YouTube's player from youtube-nocookie.com. YouTube may set its own cookies once a video plays.</p>
          <p class="btn-row">
            <button type="button" class="btn btn-sm" onClick={() => document.dispatchEvent(new CustomEvent('lp:open-consent'))}>
              Choose, then play
            </button>
            <a class="btn btn-secondary btn-sm" href={watchHref} rel="noopener noreferrer">
              Watch on YouTube instead
            </a>
          </p>
        </div>
      )}
      <a class="video-link" href={watchHref} rel="noopener noreferrer">
        Watch on YouTube
      </a>
    </div>
  );
}
