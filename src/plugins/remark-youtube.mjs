/**
 * Turn the {{youtube:VIDEOID}} markers left by the WordPress importer into a
 * static, zero-JavaScript link card.
 *
 * We deliberately do NOT emit an iframe. A YouTube embed pulls roughly half a
 * megabyte of third-party JavaScript, which would undo the performance work on
 * every one of the 38 posts that contain one. A link card costs nothing, keeps
 * the page readable with scripts disabled, and still gets the reader to the video.
 */
import { visit } from 'unist-util-visit';

const RE = /\{\{youtube:([A-Za-z0-9_-]{6,})\}\}/g;

export function remarkYoutube() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === null) return;
      const text = node.children?.length === 1 && node.children[0].type === 'text'
        ? node.children[0].value : null;
      if (!text) return;
      const m = [...text.matchAll(RE)];
      if (!m.length) return;

      const id = m[0][1];
      const url = `https://www.youtube.com/watch?v=${id}`;
      parent.children[index] = {
        type: 'html',
        value:
          `<a class="yt-card" href="${url}" rel="noopener" target="_blank">` +
          `<span class="yt-card-play" aria-hidden="true">▶</span>` +
          `<span class="yt-card-text"><strong>Watch this on YouTube</strong>` +
          `<span>Opens in a new tab on youtube.com</span></span></a>`,
      };
    });
  };
}
