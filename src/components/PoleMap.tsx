import { LocationMap } from "@/components/LocationMap";

export function PoleMap({ lat, long }: { lat: number | null; long: number | null }) {
  const points = lat !== null && long !== null ? [{ lat, long }] : [];
  return <LocationMap points={points} emptyMessage="No location on file for this pole." />;
}
