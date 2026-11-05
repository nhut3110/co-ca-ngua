import { t } from '../i18n';
/** Original vector artwork, kept in the DOM so the ritual can respond to each choice. */
export function RitualArt({ kind = 'world', active = false }: { kind?: string; active?: boolean }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`ritual-art ${active ? 'awakened' : ''}`}
      aria-hidden="true"
    >
      <g className="seal-orbit">
        <circle cx="100" cy="100" r="87" />
        <circle cx="100" cy="100" r="81" />
        {t(
          Array.from({ length: 24 }, (_, i) => (
            <path key={i} d="M100 15v7m-2-5 2-2 2 2" transform={`rotate(${i * 15} 100 100)`} />
          )),
        )}
      </g>
      <g className="seal-counter">
        <path d="m100 29 61 35v72l-61 35-61-35V64Z" />
        <path d="m100 40 52 90H48Z" />
        <path d="m100 160 52-90H48Z" />
      </g>
      <circle cx="100" cy="100" r="48" className="seal-inner" />
      {t(
        kind === 'spells' ? (
          <g className="seal-glyph">
            <path d="m100 61 23 39-23 39-23-39Z" />
            <path d="m100 61 4 36 19 3-27 4 4 35" />
            <path d="m65 66 5 5m60 58 5 5m-2-68-4 5m-58 58-5 5" />
          </g>
        ) : kind === 'portals' ? (
          <g className="seal-glyph">
            <ellipse cx="100" cy="100" rx="24" ry="38" />
            <ellipse cx="100" cy="100" rx="17" ry="30" />
            <path d="M67 129q33-21 66 0M75 75l-9-9m59 9 9-9" />
          </g>
        ) : kind === 'comeback' ? (
          <g className="seal-glyph">
            <path d="m100 138-4-29-25 6 13-15-18-25 29 12 5-28 5 28 29-12-18 25 13 15-25-6Z" />
            <path d="m100 138 9-17m-9 17-9-17" />
          </g>
        ) : (
          <g className="seal-glyph">
            <path d="m61 98 39-19 39 19-39 22Z" />
            <path d="m61 98 12 24 27 21 27-21 12-24M100 120v23M80 87V67m40 20V67M75 67h10m30 0h10" />
            <path d="m100 48 4 9-4 9-4-9Z" />
          </g>
        ),
      )}
      {[0, 1, 2, 3].map((i) => (
        <circle
          key={i}
          className={`seal-mote mote-${i}`}
          cx={100 + Math.cos((i * Math.PI) / 2) * 65}
          cy={100 + Math.sin((i * Math.PI) / 2) * 65}
          r="2.5"
        />
      ))}
    </svg>
  );
}
