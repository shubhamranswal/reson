import RoomClient from './RoomClient';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const { incidentId } = await params;

  return <RoomClient incidentId={incidentId} />;
}