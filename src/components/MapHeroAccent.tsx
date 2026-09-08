/** Decorative continuation of the homepage's European network map. */
export default function MapHeroAccent({ subtle = false }: { subtle?: boolean }) {
  return <div className={`map-page-accent${subtle ? ' map-page-accent-subtle' : ''}`} aria-hidden="true">
    <img src="/europe-network-map.png" alt="" decoding="async" />
    <div className="map-page-accent-shade" />
  </div>;
}
